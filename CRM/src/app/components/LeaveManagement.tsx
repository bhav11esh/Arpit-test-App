
import React, { useState, useEffect } from 'react';
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
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
            // V1 FIX: Fetch more history to ensure today's leaves aren't filtered out by edge-case time comparisons
            const data = await leavesDb.getLeaves(photographerId);
            setLeaves(data);
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
                        applied_by: 'PHOTOGRAPHER'
                    }));
                }

                if (!existingSecond) {
                    promises.push(leavesDb.applyLeave({
                        photographer_id: photographerId,
                        date: dateStr,
                        half: 'SECOND_HALF',
                        applied_by: 'PHOTOGRAPHER'
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
                    applied_by: 'PHOTOGRAPHER'
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
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Leave Management</CardTitle>
                <Button onClick={() => setIsDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Apply Leave
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Visual Calendar Overview */}
                {!loading && leaves.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
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
                                        // Only return true if it's NOT a full-day emergency
                                        const r = leaves.find(l => l.date === dStr && l.half === 'SECOND_HALF');
                                        return !r || !isEmergencyLeave(r.date, r.half, r.appliedAt);
                                    },
                                    emergencySecond: (date) => {
                                        const dStr = getLocalDateString(date);
                                        const l = leaves.find(l => l.date === dStr && l.half === 'SECOND_HALF');
                                        if (!l) return false;
                                        if (!isEmergencyLeave(l.date, l.half, l.appliedAt)) return false;
                                        // Only return true if it's NOT a full-day emergency
                                        const f = leaves.find(l => l.date === dStr && l.half === 'FIRST_HALF');
                                        return !f || !isEmergencyLeave(f.date, f.half, f.appliedAt);
                                    }
                                }}
                                modifiersClassNames={{
                                    emergencyFull: "emergency-full",
                                    emergencyFirst: "emergency-first",
                                    emergencySecond: "emergency-second"
                                }}
                                className="scale-95 md:scale-100"
                            />
                            
                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 pt-3 border-t w-full px-4 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full border border-red-400 bg-red-100/50" />
                                    <span>Full Day Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full border border-red-200 bg-gradient-to-r from-red-100/50 from-50% to-transparent to-50%" />
                                    <span>1st Half Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full border border-red-200 bg-gradient-to-l from-red-100/50 from-50% to-transparent to-50%" />
                                    <span>2nd Half Emergency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full border border-gray-100 bg-gray-200" />
                                    <span>Applied (Normal)</span>
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
                    // V1 FIX: Group leaves by date to show "Full Day"
                    const groupedLeaves = leaves.reduce((acc, leave) => {
                        // Normalize the date key to YYYY-MM-DD
                        const dateKey = leave.date;
                        if (!acc[dateKey]) {
                            acc[dateKey] = [];
                        }
                        acc[dateKey].push(leave);
                        return acc;
                    }, {} as Record<string, Leave[]>);

                    // Sort dates array
                    const sortedDates = Object.keys(groupedLeaves).sort();

                    if (sortedDates.length === 0) {
                        return (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No upcoming leaves found.
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-2">
                            {sortedDates.map((date) => {
                                const dayLeaves = groupedLeaves[date];
                                const halves = dayLeaves.map(l => l.half);
                                const isFullDay = halves.includes('FIRST_HALF') && halves.includes('SECOND_HALF');
                                
                                // Calculate if any part of this day is an emergency
                                const emergencyHalves = dayLeaves.filter(l => isEmergencyLeave(l.date, l.half, l.appliedAt));
                                const isEmergency = emergencyHalves.length > 0;

                                const displayLabel = isFullDay
                                    ? 'Full Day'
                                    : halves[0] === 'FIRST_HALF'
                                        ? 'First Half (Morning)'
                                        : 'Second Half (Afternoon)';

                                return (
                                    <div
                                        key={date}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`${isEmergency ? 'bg-red-100' : 'bg-orange-100'} p-2 rounded-full`}>
                                                <CalendarIcon className={`h-4 w-4 ${isEmergency ? 'text-red-600' : 'text-orange-600'}`} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{formatDate(date)}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    {displayLabel}
                                                    {isEmergency && (
                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-red-200 text-red-600 bg-red-50 flex items-center gap-0.5">
                                                            <AlertTriangle className="h-2 w-2" />
                                                            EMERGENCY ({emergencyHalves.length} half)
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-semibold ${isEmergency ? 'text-red-500 bg-red-100' : 'text-gray-500 bg-gray-200'} px-2 py-1 rounded`}>
                                            {isEmergency ? 'EMERGENCY' : 'APPLIED'}
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

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select Date</Label>
                            <div className="border rounded-md p-2 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    disabled={(date) => {
                                        // V1 FIX: Allow selecting 'Today' by comparing against start of day
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return date < today;
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

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApplyLeave} disabled={!selectedDate || submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Apply Leave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
