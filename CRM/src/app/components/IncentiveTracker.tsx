import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDeliveries, mockUsers, simulateApiDelay } from '../lib/mockData';
import { calculateIncentive } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Calendar as CalendarIcon, TrendingUp, Award } from 'lucide-react';
import { format } from 'date-fns';

export function IncentiveTracker() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2026, 0, 1), // Jan 1, 2026
    to: new Date(2026, 0, 7),   // Jan 7, 2026
  });
  const [incentiveData, setIncentiveData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      calculateUserIncentive();
    }
  }, [user, dateRange]);

  const calculateUserIncentive = async () => {
    setLoading(true);
    await simulateApiDelay(300);

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    const data = calculateIncentive(
      mockDeliveries,
      user?.id || '',
      startDate,
      endDate
    );

    setIncentiveData(data);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Incentive Tracker</CardTitle>
          <CardDescription>
            Earn ₹2,000 for covering ≥20 deliveries over 7 consecutive days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date Range (7 days)</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => {
                      if (date) {
                        const to = new Date(date);
                        to.setDate(to.getDate() + 6);
                        setDateRange({ from: date, to });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* V1 SPEC: Clarify "covered" semantics and leave day rules */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <p className="font-semibold mb-1">📋 Streak Rules:</p>
              <p>• Deliveries must be <strong>"covered"</strong> (completed), not just scheduled</p>
              <p>• Leave days (0 deliveries) do <strong>NOT</strong> break your streak</p>
              <p>• 20+ deliveries across any 7 consecutive calendar days = ₹2,000 incentive</p>
            </div>
          </div>

          {/* Incentive Status */}
          {incentiveData && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Deliveries Covered</div>
                  <div className="text-2xl font-bold">{incentiveData.count}</div>
                  <div className="text-xs text-gray-500">Need ≥20</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Consecutive Days</div>
                  <div className="text-2xl font-bold">{incentiveData.days}</div>
                  <div className="text-xs text-gray-500">Need ≥7</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Incentive Status</div>
                  <Badge 
                    className={incentiveData.eligible 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {incentiveData.eligible ? 'ELIGIBLE ₹2,000' : 'Not Eligible'}
                  </Badge>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Delivery Progress</span>
                    <span className="text-gray-500">{incentiveData.count}/20</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, (incentiveData.count / 20) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Day Streak Progress</span>
                    <span className="text-gray-500">{incentiveData.days}/7</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(100, (incentiveData.days / 7) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Eligibility Message */}
              {incentiveData.eligible ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                  <Award className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <div className="font-semibold">Congratulations! 🎉</div>
                    <div>You've earned the ₹2,000 incentive for this period.</div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    {incentiveData.count < 20 && (
                      <div>Complete {20 - incentiveData.count} more deliveries to reach the goal.</div>
                    )}
                    {incentiveData.days < 7 && (
                      <div>Work {7 - incentiveData.days} more consecutive days to reach the goal.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}