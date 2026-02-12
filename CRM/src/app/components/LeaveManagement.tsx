
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Loader2, Plus, AlertTriangle } from 'lucide-react';
import * as leavesDb from '../lib/db/leaves';
import type { Database } from '../lib/types/database.types';
import type { Leave } from '../types';
import { getOperationalDateString, getLocalDateString } from '../lib/utils';

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
            <CardContent>
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
                        acc[dateKey].push(leave.half);
                        return acc;
                    }, {} as Record<string, string[]>);

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
                                const halves = groupedLeaves[date];
                                const isFullDay = halves.includes('FIRST_HALF') && halves.includes('SECOND_HALF');
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
                                            <div className="bg-orange-100 p-2 rounded-full">
                                                <CalendarIcon className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{formatDate(date)}</div>
                                                <div className="text-xs text-gray-500">
                                                    {displayLabel}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                            APPLIED
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
