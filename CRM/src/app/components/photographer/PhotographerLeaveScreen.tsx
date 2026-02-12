import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLeave } from '../../context/LeaveContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveHalf } from '../../types';
import { format } from 'date-fns';
import { getOperationalDateString } from '../../lib/utils';

export function PhotographerLeaveScreen() {
  const { user } = useAuth();
  const { leaves, addLeave, getLeavesByPhotographer } = useLeave();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHalf, setSelectedHalf] = useState<LeaveHalf>('FIRST_HALF');

  if (!user) return null;

  const myLeaves = getLeavesByPhotographer(user.id);

  const handleApplyLeave = () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      addLeave(user.id, selectedDate, selectedHalf, 'PHOTOGRAPHER');
      toast.success('Leave applied successfully');
      setSelectedDate('');
      setSelectedHalf('FIRST_HALF');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to apply leave');
      }
    }
  };

  const formatLeaveDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatLeaveHalf = (half: LeaveHalf) => {
    return half === 'FIRST_HALF' ? 'First Half' : 'Second Half';
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold">My Leaves</h1>
        <p className="text-sm text-gray-600 mt-1">
          Apply for leave on a half-day basis
        </p>
      </div>

      {/* Apply Leave Form */}
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="leave-date">Date</Label>
            <input
              id="leave-date"
              type="date"
              className="w-full px-3 py-2 border rounded-lg mt-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getOperationalDateString()}
            />
          </div>

          <div>
            <Label htmlFor="leave-half">Half</Label>
            <select
              id="leave-half"
              className="w-full px-3 py-2 border rounded-lg mt-1"
              value={selectedHalf}
              onChange={(e) => setSelectedHalf(e.target.value as LeaveHalf)}
            >
              <option value="FIRST_HALF">First Half</option>
              <option value="SECOND_HALF">Second Half</option>
            </select>
          </div>

          <Button onClick={handleApplyLeave} className="w-full">
            Apply Leave
          </Button>

          <p className="text-xs text-gray-500">
            💡 For full-day leave, apply both First Half and Second Half separately.
            Once applied, only Admin can modify or remove your leave.
          </p>
        </CardContent>
      </Card>

      {/* My Leaves List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Applied Leaves</h2>
        {myLeaves.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No leaves applied yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myLeaves.map((leave) => (
              <Card key={leave.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{formatLeaveDate(leave.date)}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatLeaveHalf(leave.half)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Applied by {leave.appliedBy === 'PHOTOGRAPHER' ? 'You' : 'Admin'}
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Applied
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
