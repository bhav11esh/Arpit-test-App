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
        leaves: any[];
        salaryBenchmark: number;
        daysWorked: number;
        netPayableAdmin: number;
        netEarningsPhotographer: number;
        totalSettledDaily: number;
        amountPending: number;
        netEarnings: number;
        deliveryCount: number;
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

            const amountPending = adminShare - totalSettledDaily;

            setStats({
                grossEarnings: gross,
                totalRapido: rapidoTotal,
                totalPenalty: totalPenalty,
                emergencyLeavesCount: totalEmergencyHalves,
                leaves: photographerLeaves,
                salaryBenchmark: salaryBenchmark,
                daysWorked: daysWorkedCount,
                netPayableAdmin: adminShare,
                netEarningsPhotographer: photographerShare,
                totalSettledDaily: totalSettledDaily,
                amountPending: amountPending,
                netEarnings: photographerShare, // For backward compatibility
                deliveryCount: filtered.length,
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
                                    Pending: ₹{Math.abs(Math.round(stats.amountPending)).toLocaleString()}
                                    {stats.amountPending < 0 && ' (CR)'}
                                </Badge>
                                <span className="text-[10px] text-gray-400 font-medium uppercase">Net Payable (Admin): ₹{Math.round(stats.netPayableAdmin).toLocaleString()}</span>
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
                                        {stats.amountPending > 0 ? 'Balance to settle' : 'Overpaid (Credit)'}
                                    </div>
                                </CardContent>
                            </Card>
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
                                <li><strong>Salary Benchmark:</strong> ₹1000 × Working Days.</li>
                                <li><strong>Tiered Split (Earnings):</strong> 90% of 1st benchmark, 70% of 2nd, 50% thereafter.</li>
                                <li><strong>Tiered Split (Payable):</strong> 10% of 1st benchmark, 30% of 2nd, 50% thereafter.</li>
                                <li><strong>Daily Settlement:</strong> Photographers clear 30% of individual collections daily.</li>
                                <li><strong>Amount Pending:</strong> Reconciles monthly tiered Payable vs. actual Daily Settlements paid.</li>
                                <li>Photographers are allowed <strong>6 half-day emergency leaves</strong> per month.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
