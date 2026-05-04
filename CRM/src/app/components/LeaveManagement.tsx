
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Loader2, Plus, AlertTriangle } from 'lucide-react';
import * as leavesDb from '../lib/db/leaves';
import type { Database } from '../lib/types/database.types';
import type { Leave } from '../types';
import { getOperationalDateString, getLocalDateString, isEmergencyLeave } from '../lib/utils';

// type Leave = Database['public']['Tables']['leaves']['Row']; (Removed raw row usage)

interface LeaveManagementProps {
    photographerId: string;
}

export function LeaveManagement({ photographerId }: LeaveManagementProps) {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [missedUpdates, setMissedUpdates] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { user } = useAuth();

    // New Leave Form State
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedHalf, setSelectedHalf] = useState<'FIRST_HALF' | 'SECOND_HALF' | 'FULL_DAY'>('FULL_DAY');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadLeaves();
    }, [photographerId]);

    const loadLeaves = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Leaves
            const leaveData = await leavesDb.getLeaves(photographerId);
            setLeaves(leaveData);

            // 2. Fetch Missed Updates (Past 90 days up to today)
            const today = new Date();
            const pastDate = new Date();
            pastDate.setDate(today.getDate() - 90);
            
            const startDateStr = getLocalDateString(pastDate);
            const endDateStr = getLocalDateString(today);

            try {
                const missedData = await leavesDb.getPhotographerMissingUpdates(photographerId, startDateStr, endDateStr);
                setMissedUpdates(missedData || []);
            } catch (rpcError) {
                console.error('Failed to load missed updates. RPC might not be applied.', rpcError);
                // Graceful fallback
                setMissedUpdates([]);
            }
        } catch (error) {
            console.error('Failed to load leaves', error);
            toast.error('Failed to load leave history');
        } finally {
            setLoading(false);
        }
    };


    const handleApplyLeave = async () => {
        if (!selectedDate) {
            toast.error('Please select a date');
            return;
        }

        const dateStr = getLocalDateString(selectedDate);

        // Check validation for single-half applications (prevent exact duplicates)
        if (selectedHalf !== 'FULL_DAY') {
            const exactMatch = leaves.find(l => l.date === dateStr && l.half === selectedHalf);
            if (exactMatch) {
                toast.error('Leave already exists for this slot');
                return;
            }
        }

        try {
            setSubmitting(true);

            if (selectedHalf === 'FULL_DAY') {
                // V1 FIX: specialized handling for Full Day to allow "upgrading" partial leave
                // Check what already exists
                const existingFirst = leaves.find(l => l.date === dateStr && l.half === 'FIRST_HALF');
                const existingSecond = leaves.find(l => l.date === dateStr && l.half === 'SECOND_HALF');

                if (existingFirst && existingSecond) {
                    toast.error('Full day leave already exists');
                    return;
                }

                const promises = [];

                if (!existingFirst) {
                    promises.push(leavesDb.applyLeave({
                        photographer_id: photographerId,
                        date: dateStr,
                        half: 'FIRST_HALF',
                        applied_by: (user?.role as any) || 'PHOTOGRAPHER'
                    }));
                }

                if (!existingSecond) {
                    promises.push(leavesDb.applyLeave({
                        photographer_id: photographerId,
                        date: dateStr,
                        half: 'SECOND_HALF',
                        applied_by: (user?.role as any) || 'PHOTOGRAPHER'
                    }));
                }

                if (promises.length > 0) {
                    await Promise.all(promises);
                    toast.success('Leave applied successfully');
                } else {
                    toast.info('Leave slots were already covered');
                }
            } else {
                // Standard single half application
                await leavesDb.applyLeave({
                    photographer_id: photographerId,
                    date: dateStr,
                    half: selectedHalf,
                    applied_by: (user?.role as any) || 'PHOTOGRAPHER'
                });
                toast.success('Leave applied successfully');
            }

            setIsDialogOpen(false);
            loadLeaves();
        } catch (error: any) {
            console.error('Failed to apply leave', error);
            // Graceful error handling for race conditions
            if (error?.message?.includes('duplicate key') || error?.code === '23505') {
                toast.error('Leave partially or fully exists already. Refreshing...');
                loadLeaves();
            } else {
                toast.error('Failed to apply leave. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // V18.0: Check if current selection is emergency
    const getEmergencyStatus = () => {
        if (!selectedDate) return { isEmergency: false, message: '' };

        const dateStr = getLocalDateString(selectedDate);
        if (selectedHalf === 'FULL_DAY') {
            const firstEmergency = isEmergencyLeave(dateStr, 'FIRST_HALF', new Date().toISOString());
            const secondEmergency = isEmergencyLeave(dateStr, 'SECOND_HALF', new Date().toISOString());
            if (firstEmergency && secondEmergency) return { isEmergency: true, message: 'Full Day (2 halves)' };
            if (firstEmergency) return { isEmergency: true, message: 'First Half (Morning)' };
            if (secondEmergency) return { isEmergency: true, message: 'Second Half (Evening)' };
            return { isEmergency: false, message: '' };
        } else {
            const emergency = isEmergencyLeave(dateStr, selectedHalf, new Date().toISOString());
            return { isEmergency: emergency, message: selectedHalf === 'FIRST_HALF' ? 'First Half (Morning)' : 'Second Half (Evening)' };
        }
    };

    const emergencyStatus = getEmergencyStatus();

    // Helper to format date
    const formatDate = (dateStr: string) => {
        // Manually parse YYYY-MM-DD to avoid timezone shift in display
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            weekday: 'short'
        });
    };

    return (
        <Card className="w-full overflow-hidden border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-white border-b border-gray-50">
                <CardTitle className="text-lg font-bold text-gray-800 tracking-tight">Leave Management</CardTitle>
                <Button onClick={() => setIsDialogOpen(true)} size="sm" className="btn-gradient h-8 px-3 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Apply Leave
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Visual Calendar Overview */}
                {!loading && (leaves.length > 0 || missedUpdates.length > 0) && (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                            <Calendar
                                mode="single"
                                selected={undefined}
                                onSelect={() => {}}
                                modifiers={{
                                    emergencyFull: (date) => {
                                        const dStr = getLocalDateString(date);
                                        const dayLeaves = leaves.filter(l => l.date === dStr);
                                        return dayLeaves.length === 2 && dayLeaves.every(l => isEmergencyLeave(l.date, l.half, l.appliedAt));
                                    },
                                    emergencyFirst: (date) => {
                                        const dStr = getLocalDateString(date);
                                        const l = leaves.find(l => l.date === dStr && l.half === 'FIRST_HALF');
                                        if (!l) return false;
                                        if (!isEmergencyLeave(l.date, l.half, l.appliedAt)) return false;
                                        const r = leaves.find(l => l.date === dStr && l.half === 'SECOND_HALF');
                                        return !r || !isEmergencyLeave(r.date, r.half, r.appliedAt);
                                    },
                                    emergencySecond: (date) => {
                                        const dStr = getLocalDateString(date);
                                        const l = leaves.find(l => l.date === dStr && l.half === 'SECOND_HALF');
                                        if (!l) return false;
                                        if (!isEmergencyLeave(l.date, l.half, l.appliedAt)) return false;
                                        const f = leaves.find(l => l.date === dStr && l.half === 'FIRST_HALF');
                                        return !f || !isEmergencyLeave(f.date, f.half, f.appliedAt);
                                    },
                                    missedUpdate: (date) => {
                                        const dStr = getLocalDateString(date);
                                        return missedUpdates.includes(dStr);
                                    }
                                }}
                                modifiersClassNames={{
                                    emergencyFull: "emergency-full",
                                    emergencyFirst: "emergency-first",
                                    emergencySecond: "emergency-second",
                                    missedUpdate: "missed-update"
                                }}
                                className="scale-95 md:scale-100 p-0"
                            />
                            
                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-100 w-full px-2 text-[10px] font-medium text-gray-500">
                                <div className="flex items-center gap-2">
                                    <div className="size-2.5 rounded-full border border-red-400 bg-red-100/50" />
                                    <span>Full Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-2.5 rounded-full border border-red-200 bg-gradient-to-r from-red-100/50 from-50% to-transparent to-50%" />
                                    <span>Morning Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-2.5 rounded-full border border-red-200 bg-gradient-to-l from-red-100/50 from-50% to-transparent to-50%" />
                                    <span>Evening Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-2.5 rounded-full border border-gray-100 bg-gray-200" />
                                    <span>Normal Leave</span>
                                </div>
                                <div className="flex items-center gap-2 col-span-2 mt-1">
                                    <div className="size-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse" />
                                    <span className="text-red-600 font-bold uppercase tracking-tight">Missed Update (Breach)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                )}


                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : (() => {
                    // Group leaves by date
                    const groupedLeaves = leaves.reduce((acc, leave) => {
                        const dateKey = leave.date;
                        if (!acc[dateKey]) {
                            acc[dateKey] = [];
                        }
                        acc[dateKey].push(leave);
                        return acc;
                    }, {} as Record<string, Leave[]>);

                    // Build unified event list
                    type CalendarEvent = 
                        | { type: 'LEAVE'; date: string; dayLeaves: Leave[] }
                        | { type: 'MISSED_UPDATE'; date: string };

                    const events: CalendarEvent[] = [];

                    // 1. Add leaves
                    Object.keys(groupedLeaves).forEach(date => {
                        events.push({ type: 'LEAVE', date, dayLeaves: groupedLeaves[date] });
                    });

                    // 2. Add missed updates
                    missedUpdates.forEach(date => {
                        events.push({ type: 'MISSED_UPDATE', date });
                    });

                    // Sort events by date (Ascending)
                    events.sort((a, b) => a.date.localeCompare(b.date));

                    if (events.length === 0) {
                        return (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No recent leave history or missed updates.
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-2">
                            {events.map((event, idx) => {
                                if (event.type === 'MISSED_UPDATE') {
                                    return (
                                        <div
                                            key={`missed-${event.date}-${idx}`}
                                            className="flex items-center justify-between p-3.5 bg-red-50/30 rounded-2xl border border-red-100 shadow-[0_4px_12px_rgba(239,68,68,0.05)]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shadow-sm">
                                                    <AlertTriangle className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-red-900 tracking-tight">{formatDate(event.date)}</div>
                                                    <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-0.5">
                                                        Missed Update Report
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-white bg-red-600 px-2 py-1 rounded-lg shadow-sm">
                                                BREACH
                                            </div>
                                        </div>
                                    );
                                }

                                // Standard Leave Event
                                const { date, dayLeaves } = event;
                                const halves = dayLeaves.map(l => l.half);
                                const isFullDay = halves.includes('FIRST_HALF') && halves.includes('SECOND_HALF');
                                
                                const emergencyHalves = dayLeaves.filter(l => isEmergencyLeave(l.date, l.half, l.appliedAt));
                                const isEmergency = emergencyHalves.length > 0;

                                const displayLabel = isFullDay
                                    ? 'Full Day'
                                    : halves[0] === 'FIRST_HALF'
                                        ? 'First Half (Morning)'
                                        : 'Second Half (Afternoon)';

                                return (
                                    <div
                                        key={`leave-${date}-${idx}`}
                                        className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-50 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-9 w-9 ${isEmergency ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} rounded-xl flex items-center justify-center`}>
                                                <CalendarIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-800 tracking-tight">{formatDate(date)}</div>
                                                <div className="text-[10px] font-medium text-gray-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-wide">
                                                    {displayLabel}
                                                    {isEmergency && (
                                                        <Badge className="h-4 px-1 bg-red-50 text-red-500 border-red-100 text-[8px] font-bold">
                                                            EMERGENCY
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${isEmergency ? 'text-red-500' : 'text-gray-300'}`}>
                                            {isEmergency ? 'Unplanned' : 'Planned'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply for Leave</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-2">
                            <Label>Select Date</Label>
                            <div className="border rounded-md p-2 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    disabled={(date) => {
                                        return false; // V1 FIX: Allow selecting any date (including past)
                                    }}
                                    initialFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <Select
                                value={selectedHalf}
                                onValueChange={(val: any) => setSelectedHalf(val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FULL_DAY">Full Day</SelectItem>
                                    <SelectItem value="FIRST_HALF">First Half (Morning)</SelectItem>
                                    <SelectItem value="SECOND_HALF">Second Half (Evening)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div className="text-xs text-amber-800">
                                Applying leave will automatically unassign any <strong>Primary</strong> deliveries for this date.
                            </div>
                        </div>

                        {emergencyStatus.isEmergency && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded-md flex gap-2 animate-in fade-in slide-in-from-top-1">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                <div className="text-xs text-red-800">
                                    <p className="font-bold">Emergency Leave Warning</p>
                                    <p>This request for <strong>{emergencyStatus.message}</strong> is less than 24 hours away. It will be counted as an Emergency Leave.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl border-gray-100">Cancel</Button>
                        <Button onClick={handleApplyLeave} disabled={!selectedDate || submitting} className="btn-gradient rounded-xl flex-1">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Apply Leave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
