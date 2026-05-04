import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import * as deliveriesDb from '../lib/db/deliveries';
import { adminSupabase, supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { Calendar as CalendarIcon, Wallet, Info, AlertTriangle, TrendingUp, Landmark, Calculator } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getUsersByRole } from '../lib/db/users';
import { User } from '../types';
import { getShowroomCode, isEmergencyLeave } from '../lib/utils';
import * as leavesDb from '../lib/db/leaves';

export function EarningsTracker() {
    const { user } = useAuth();
    const { dealerships } = useConfig();

    // Default to last 7 days
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });

    const [selectedPhotographerId, setSelectedPhotographerId] = useState<string | null>(null);
    const [photographers, setPhotographers] = useState<User[]>([]);
    const isAdmin = user?.role === 'ADMIN';

    // Initialize selected ID
    useEffect(() => {
        if (user && !selectedPhotographerId) {
            setSelectedPhotographerId(user.id);
        }
    }, [user]);

    // Fetch photographers if admin
    useEffect(() => {
        if (isAdmin) {
            getUsersByRole('PHOTOGRAPHER').then(setPhotographers).catch(err => {
                console.error('Failed to fetch photographers for selector:', err);
            });
        }
    }, [isAdmin]);

    const [stats, setStats] = useState<{
        grossEarnings: number;
        totalRapido: number;
        totalPenalty: number;
        emergencyLeavesCount: number;
        missedUpdatesCount: number;
        missedUpdatesPenalty: number;
        leaves: any[];
        salaryBenchmark: number;
        daysWorked: number;
        netPayableAdmin: number;
        netEarningsPhotographer: number;
        totalSettledDaily: number;
        amountPending: number;
        netEarnings: number;
        deliveryCount: number;
        postItBonus: number;
        postItPenalty: number;
        breakdown: { name: string; count: number; rate: number; rapido: number; total: number }[];
    } | null>(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedPhotographerId) {
            fetchEarnings();
        }
    }, [selectedPhotographerId, dateRange]);

    const getShowroomCodeInternal = (dealershipName: string) => {
        return getShowroomCode(dealershipName);
    };

    const fetchEarnings = async () => {
        setLoading(true);
        try {
            const client = supabase;

            // Fetch all DONE deliveries for the selected photographer
            const allDoneDeliveries = await deliveriesDb.getDeliveries({
                status: 'DONE',
                assignedUserId: selectedPhotographerId || user?.id
            }, client);

            const fromStr = format(startOfDay(dateRange.from), 'yyyy-MM-dd');
            const toStr = format(endOfDay(dateRange.to), 'yyyy-MM-dd');

            const filtered = allDoneDeliveries.filter(d => d.date >= fromStr && d.date <= toStr);

            const itemRate = (count: number, totalRate: number) => {
                if (count === 0) return 0;
                return Math.round(totalRate / count);
            };

            // Calculate earnings
            let gross = 0;
            let rapidoTotal = 0;
            const breakdownMap = new Map<string, { count: number; rate: number; rapido: number }>();

            filtered.forEach(d => {
                // Find matching dealership
                const dealership = dealerships.find(ds => {
                    const code = getShowroomCodeInternal(ds.name);
                    return code === d.showroom_code;
                });

                // V1 Hybrid Logic:
                // - CUSTOMER_PAID: uses the actual amount collected (d.received_amount)
                // - DEALERSHIP_PAID: uses the internal fixed rate (dealership.ratePerDelivery)
                const rate = d.payment_type === 'CUSTOMER_PAID'
                    ? (Number(d.received_amount) || 0)
                    : (dealership?.ratePerDelivery || 0);

                gross += rate;
                const charge = d.rapido_charge || 0;
                rapidoTotal += charge;

                const dsName = dealership?.name || d.showroom_code || 'Unknown Showroom';
                const current = breakdownMap.get(dsName) || { count: 0, rate: 0, rapido: 0 };
                current.count += 1;
                // For breakdown, we'll store the total collected amount for this dealership
                current.rate += rate;
                current.rapido += charge;
                breakdownMap.set(dsName, current);
            });

            // 🚀 V18.0: Penalty Calculation (Consolidated by Month)
            const photographerLeaves = await leavesDb.getLeaves(selectedPhotographerId || user?.id, fromStr, toStr);
            const emergencyByMonth = new Map<string, number>();
            let totalEmergencyHalves = 0;

            photographerLeaves.forEach(l => {
                if (isEmergencyLeave(l.date, l.half, l.appliedAt)) {
                    totalEmergencyHalves++;
                    const monthKey = l.date.substring(0, 7); // "YYYY-MM"
                    emergencyByMonth.set(monthKey, (emergencyByMonth.get(monthKey) || 0) + 1);
                }
            });

            let totalPenalty = 0;
            emergencyByMonth.forEach((count) => {
                if (count > 6) {
                    totalPenalty += (count - 6) * 250;
                }
            });

            // 🚀 V18.2: Send Update Missed Penalty (1000 Rs per day missed, from 5th May 2026 onwards)
            let missedUpdatesCount = 0;
            let missedUpdatesPenalty = 0;
            try {
                const { data: missedUpdates, error: missedError } = await client.rpc('get_photographer_missing_updates', {
                    p_photographer_id: selectedPhotographerId || user?.id,
                    p_start_date: fromStr,
                    p_end_date: toStr
                });
                
                if (!missedError && missedUpdates) {
                    missedUpdates.forEach((mu: { missing_date: string }) => {
                        if (mu.missing_date >= '2026-05-05') {
                            missedUpdatesCount++;
                            missedUpdatesPenalty += 1000;
                        }
                    });
                }
            } catch (err) {
                console.error("Error fetching missing updates:", err);
            }

            totalPenalty += missedUpdatesPenalty;

            // 🚀 V18.3: Post-it Marketplace Rewards & Penalties
            let postItBonus = 0;
            let postItPenalty = 0;
            try {
                // Fetch resolved reel tasks where the user was either the claimer (bonus) or the breacher (penalty)
                const { data: relatedReelTasks, error: reelError } = await client
                    .from('reel_tasks')
                    .select('*')
                    .eq('status', 'RESOLVED')
                    .or(`assigned_user_id.eq.${selectedPhotographerId || user?.id},original_user_id.eq.${selectedPhotographerId || user?.id}`);

                if (!reelError && relatedReelTasks) {
                    relatedReelTasks.forEach((rt: any) => {
                        // REWARD: They resolved someone else's reel
                        if (rt.assigned_user_id === (selectedPhotographerId || user?.id) && rt.original_user_id !== null && rt.original_user_id !== rt.assigned_user_id) {
                            postItBonus += rt.post_it_reward || 0;
                        }
                        // PENALTY: Someone else resolved their breached reel
                        if (rt.original_user_id === (selectedPhotographerId || user?.id) && rt.assigned_user_id !== rt.original_user_id) {
                            postItPenalty += rt.post_it_reward || 0;
                        }
                    });
                }
            } catch (err) {
                console.error("Error fetching reel bounties:", err);
            }

            gross += postItBonus;
            totalPenalty += postItPenalty;

            // --- 🚀 NEW TIERED PAYOUT LOGIC (10/30/50) ---
            const daysWorkedList = Array.from(new Set(filtered.map(d => d.date)));
            const daysWorkedCount = daysWorkedList.length;
            const salaryBenchmark = daysWorkedCount * 1000;
            const netAmountPool = gross - rapidoTotal - totalPenalty;

            // Tier Calculation
            const tier1 = Math.min(netAmountPool, salaryBenchmark);
            const tier2 = Math.max(0, Math.min(netAmountPool - salaryBenchmark, salaryBenchmark));
            const tier3 = Math.max(0, netAmountPool - (2 * salaryBenchmark));

            // Admin Share (Net Payable)
            const adminShare = (tier1 * 0.10) + (tier2 * 0.30) + (tier3 * 0.50);
            
            // Photographer Share (Net Earnings)
            const photographerShare = (tier1 * 0.90) + (tier2 * 0.70) + (tier3 * 0.50);

            // Daily settlements calculation (Photographer pays 30% of individual receipts daily)
            const totalSettledDaily = filtered
                .filter(d => d.payment_type === 'CUSTOMER_PAID')
                .reduce((acc, d) => acc + ((d.received_amount || 0) * 0.3), 0);

            // Dealer-paid revenue calculation (Money collected directly by Admin via invoice)
            const totalDealerRevenue = filtered
                .filter(d => d.payment_type !== 'CUSTOMER_PAID')
                .reduce((acc, d) => {
                    const dealership = dealerships.find(ds => getShowroomCodeInternal(ds.name) === d.showroom_code);
                    return acc + (dealership?.ratePerDelivery || 0);
                }, 0);

            // Net Pending calculation: Admin's Tiered Share MINUS what was already paid upfront and what was collected by Admin directly
            const amountPending = adminShare - totalSettledDaily - totalDealerRevenue;

            setStats({
                grossEarnings: gross,
                totalRapido: rapidoTotal,
                totalPenalty: totalPenalty,
                emergencyLeavesCount: totalEmergencyHalves,
                missedUpdatesCount: missedUpdatesCount,
                missedUpdatesPenalty: missedUpdatesPenalty,
                leaves: photographerLeaves,
                salaryBenchmark: salaryBenchmark,
                daysWorked: daysWorkedCount,
                netPayableAdmin: adminShare,
                netEarningsPhotographer: photographerShare,
                totalSettledDaily: totalSettledDaily,
                amountPending: amountPending,
                netEarnings: photographerShare, // For backward compatibility
                deliveryCount: filtered.length,
                postItBonus: postItBonus,
                postItPenalty: postItPenalty,
                breakdown: Array.from(breakdownMap.entries()).map(([name, data]) => ({
                    name,
                    count: data.count,
                    rate: data.rate,
                    rapido: data.rapido,
                    total: data.rate - data.rapido
                })).sort((a, b) => b.total - a.total)
            });
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
            toast.error('Failed to load earnings data');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Wallet className="h-6 w-6 text-green-600" />
                                Earnings Tracker
                            </CardTitle>
                            <CardDescription>
                                Track your earnings based on completed deliveries
                            </CardDescription>
                        </div>
                        {stats && (
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={`text-lg py-1 px-3 ${stats.amountPending > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                    {stats.amountPending > 0 ? 'Owed to Admin: ' : 'Your Credit: '}₹{Math.abs(Math.round(stats.amountPending)).toLocaleString()}
                                </Badge>
                                <span className="text-[10px] text-gray-400 font-medium uppercase">Reconciled vs. 30% Upfront & Invoices</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Date Range Selector */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
                        {/* Photographer Selector (Admin Only) */}
                        {isAdmin && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Displaying For</label>
                                <Select
                                    value={selectedPhotographerId || ''}
                                    onValueChange={setSelectedPhotographerId}
                                >
                                    <SelectTrigger className="min-w-[200px] bg-white">
                                        <SelectValue placeholder="Select Photographer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={user.id}>Your Own Earnings</SelectItem>
                                        <hr className="my-1 border-gray-100" />
                                        {photographers.map(p => (
                                            p.id !== user.id && (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            )
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Earnings Period</label>
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal bg-white">
                                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                                            {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: dateRange.from, to: dateRange.to }}
                                            onSelect={(range: any) => {
                                                if (range?.from) {
                                                    setDateRange({ from: range.from, to: range.to || range.from });
                                                }
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="text-center px-4 border-r md:border-r-0 md:border-l border-gray-200">
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Deliveries</div>
                                <div className="text-xl font-bold text-gray-900">{stats?.deliveryCount || 0}</div>
                            </div>
                            <div className="text-center px-4 border-r border-gray-200">
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Rapido</div>
                                <div className="text-xl font-bold text-red-600">
                                    ₹{stats?.totalRapido.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="text-center px-4">
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Penalties</div>
                                <div className="text-xl font-bold text-red-600">
                                    ₹{stats?.totalPenalty.toLocaleString() || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 🚀 NEW: Payout & Settlement Metric Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="bg-blue-50/50 border-blue-100">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <Calculator className="h-5 w-5 text-blue-600 mb-2" />
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Salary Benchmark</div>
                                    <div className="text-xl font-bold text-blue-900">₹{stats.salaryBenchmark.toLocaleString()}</div>
                                    <div className="text-[10px] text-blue-600 mt-1">{stats.daysWorked} working days</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-green-50/50 border-green-100">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <TrendingUp className="h-5 w-5 text-green-600 mb-2" />
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Net Earnings (You)</div>
                                    <div className="text-xl font-bold text-green-900">₹{Math.round(stats.netEarningsPhotographer).toLocaleString()}</div>
                                    <div className="text-[10px] text-green-600 mt-1">After 10/30/50% split</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-purple-50/50 border-purple-100">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <Landmark className="h-5 w-5 text-purple-600 mb-2" />
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Admin Share</div>
                                    <div className="text-xl font-bold text-purple-900">₹{Math.round(stats.netPayableAdmin).toLocaleString()}</div>
                                    <div className="text-[10px] text-purple-600 mt-1">Platform's commission</div>
                                </CardContent>
                            </Card>

                            <Card className={stats.amountPending > 0 ? "bg-red-50/50 border-red-100" : "bg-emerald-50/50 border-emerald-100"}>
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <Wallet className={`h-5 w-5 mb-2 ${stats.amountPending > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Amount Pending</div>
                                    <div className={`text-xl font-bold ${stats.amountPending > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                                        ₹{Math.abs(Math.round(stats.amountPending)).toLocaleString()}
                                        {stats.amountPending < 0 && ' (CR)'}
                                    </div>
                                    <div className={`text-[10px] mt-1 ${stats.amountPending > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {stats.amountPending > 0 ? 'Balance to clear' : 'Admin owes you (Credit)'}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* 🚀 V18.3: Post-it Bounty Earnings & Penalties */}
                    {stats && (stats.postItBonus > 0 || stats.postItPenalty > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.postItBonus > 0 && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                                            <Trophy className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Bounty Bonuses</div>
                                            <div className="text-sm font-bold text-emerald-900">₹{stats.postItBonus.toLocaleString()} Earned from Marketplace</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-emerald-600">CLAIMED REELS</div>
                                </div>
                            )}
                            {stats.postItPenalty > 0 && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-red-600 flex items-center justify-center text-white">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-red-600 uppercase tracking-widest">Bounty Deductions</div>
                                            <div className="text-sm font-bold text-red-900">₹{stats.postItPenalty.toLocaleString()} Breached Deadline Fees</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-red-600">AUTO-REASSIGNED</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Visual Emergency Calendar (V18.1) */}
                    {stats && stats.emergencyLeavesCount > 0 && (
                        <div className="space-y-3 p-4 bg-red-50/30 border border-red-100 rounded-lg">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-red-800">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                Emergency Leaves Overview ({stats.emergencyLeavesCount} halves)
                            </h3>
                            <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-3 rounded border border-red-100 shadow-sm">
                                <Calendar
                                    mode="single"
                                    selected={undefined}
                                    onSelect={() => {}}
                                    modifiers={{
                                        emergencyFull: (date) => {
                                            const dStr = format(date, 'yyyy-MM-dd');
                                            const dayLeaves = stats.leaves.filter(l => l.date === dStr);
                                            return dayLeaves.length === 2 && dayLeaves.every(l => isEmergencyLeave(l.date, l.half, l.appliedAt));
                                        },
                                        emergencyFirst: (date) => {
                                            const dStr = format(date, 'yyyy-MM-dd');
                                            const l = stats.leaves.find(l => l.date === dStr && l.half === 'FIRST_HALF');
                                            if (!l) return false;
                                            if (!isEmergencyLeave(l.date, l.half, l.appliedAt)) return false;
                                            const r = stats.leaves.find(l => l.date === dStr && l.half === 'SECOND_HALF');
                                            return !r || !isEmergencyLeave(r.date, r.half, r.appliedAt);
                                        },
                                        emergencySecond: (date) => {
                                            const dStr = format(date, 'yyyy-MM-dd');
                                            const l = stats.leaves.find(l => l.date === dStr && l.half === 'SECOND_HALF');
                                            if (!l) return false;
                                            if (!isEmergencyLeave(l.date, l.half, l.appliedAt)) return false;
                                            const f = stats.leaves.find(l => l.date === dStr && l.half === 'FIRST_HALF');
                                            return !f || !isEmergencyLeave(f.date, f.half, f.appliedAt);
                                        }
                                    }}
                                    modifiersClassNames={{
                                        emergencyFull: "emergency-full",
                                        emergencyFirst: "emergency-first",
                                        emergencySecond: "emergency-second"
                                    }}
                                    className="scale-90"
                                />

                                <div className="space-y-4 max-w-xs">
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider border-b pb-1">Calendar Legend</p>
                                    <div className="grid grid-cols-1 gap-y-3 text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="size-4 rounded-full border border-red-400 bg-red-100/50" />
                                            <span className="font-medium">Full Day Emergency</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="size-4 rounded-full border border-red-200 bg-gradient-to-r from-red-100/50 from-50% to-transparent to-50%" />
                                            <span className="font-medium">1st Half Emergency (Late notice)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="size-4 rounded-full border border-red-200 bg-gradient-to-l from-red-100/50 from-50% to-transparent to-50%" />
                                            <span className="font-medium">2nd Half Emergency (Late notice)</span>
                                        </div>
                                        <div className="p-2 bg-red-50 text-[10px] text-red-700 italic rounded">
                                            Notice period: 24hrs prior to shift start (10AM/2PM). Quota: 6 half-days/mo.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Missed Updates Penalty Display */}
                    {stats && stats.missedUpdatesCount > 0 && (
                        <div className="space-y-2 p-3 bg-red-50/50 border border-red-200 rounded-lg">
                            <h3 className="text-xs font-bold flex items-center gap-2 text-red-900 uppercase tracking-wide">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                Send Update Missed Penalty
                            </h3>
                            <div className="text-sm text-red-800">
                                You missed sending the end-of-day update on <strong className="text-red-900">{stats.missedUpdatesCount} day(s)</strong> (since May 5th).
                                <div className="mt-1 font-bold text-red-600">
                                    Penalty Applied: ₹{stats.missedUpdatesPenalty.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Breakdown Table */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-500" />
                            Earnings Breakdown
                        </h3>

                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 border-b">
                                    <tr>
                                        <th className="py-2 px-4 text-left font-medium">Dealership/Showroom</th>
                                        <th className="py-2 px-4 text-center font-medium">Count</th>
                                        <th className="py-2 px-4 text-center font-medium">Total Amount collected from Customer</th>
                                        <th className="py-2 px-4 text-center font-medium">Rapido</th>
                                        <th className="py-2 px-4 text-right font-medium">Net Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400">Loading earnings data...</td>
                                        </tr>
                                    ) : stats?.breakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400">No completed deliveries found for this period.</td>
                                        </tr>
                                    ) : (
                                        stats?.breakdown.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 font-medium">{item.name}</td>
                                                <td className="py-3 px-4 text-center">{item.count}</td>
                                                <td className="py-3 px-4 text-center text-gray-600">₹{item.rate?.toLocaleString()}</td>
                                                <td className="py-3 px-4 text-center text-red-500">
                                                    {item.rapido > 0 ? `-₹${item.rapido}` : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-green-700">₹{item.total.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {stats && stats.breakdown.length > 0 && (
                                    <tfoot className="bg-green-50/50 font-bold border-t border-green-100">
                                        <tr>
                                            <td className="py-3 px-4">Total Period Earnings</td>
                                            <td className="py-3 px-4 text-center">{stats.deliveryCount}</td>
                                            <td className="py-3 px-4 text-center text-gray-400">-</td>
                                            <td className="py-3 px-4 text-center text-red-600 font-medium">₹{stats.totalRapido.toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right text-green-800 text-lg">₹{stats.netEarnings.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 flex gap-2">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <div>
                            <p className="font-semibold mb-1">Earnings Policy:</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li>Earnings are calculated based on deliveries with "DONE" status.</li>
                                <li>Earnings are calculated based on deliveries with "DONE" status.</li>
                                <li><strong>Salary Benchmark:</strong> ₹1000 × Working Days. (Defines the tiers for commission)</li>
                                <li><strong>Tiered Split (Earnings):</strong> You keep 90% of revenue up to benchmark, 70% in the next tier, and 50% thereafter.</li>
                                <li><strong>Customer Paid:</strong> Photographers settle 30% of collections upfront. The "Pending" amount reconciles this upfront payment against your final tiered share.</li>
                                <li><strong>Dealer Paid:</strong> Platform collects the full amount via invoice. Your 90/70/50% share is added to your "Credit" to be settled.</li>
                                <li><strong>Rapido & Penalties:</strong> These are deducted from the Gross Pool *before* splitting, so you don't pay commission on expenses.</li>
                                <li><strong>Missing Send Update:</strong> A penalty of ₹1000 applies per day if the end-of-day update is not sent (applicable from May 5th, 2026 onwards).</li>
                                <li><strong>Final Settlement:</strong> Credits (CR) are paid out by Admin; Owed amounts are cleared by Photographer.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
