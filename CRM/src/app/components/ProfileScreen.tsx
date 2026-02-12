import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as deliveriesDb from '../lib/db/deliveries';
import { simulateApiDelay } from '../lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, User, Award, TrendingUp, Calendar } from 'lucide-react';
import { LeaveManagement } from './LeaveManagement';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const userDeliveries = await deliveriesDb.getDeliveries({ assignedUserId: user.id });
      const completedDeliveries = userDeliveries.filter(d => d.status === 'DONE');

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisWeek = completedDeliveries.filter(
        d => new Date(d.updated_at) >= weekAgo
      ).length;

      const thisMonth = completedDeliveries.filter(
        d => new Date(d.updated_at) >= monthAgo
      ).length;

      setStats({
        totalDeliveries: completedDeliveries.length,
        thisWeek,
        thisMonth,
      });
    } catch (error) {
      console.error('Failed to load profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#2563EB] flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <Badge className="mt-1 bg-blue-100 text-blue-800">
                {user.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">Delivery Statistics</h3>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Deliveries Completed</CardDescription>
            <CardTitle className="text-4xl">{stats.totalDeliveries}</CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>This Week</CardDescription>
              <CardTitle className="text-3xl">{stats.thisWeek}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>This Month</CardDescription>
              <CardTitle className="text-3xl">{stats.thisMonth}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Performance Highlights */}
      {user.role === 'PHOTOGRAPHER' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Award className="h-5 w-5 text-green-600" />
              <div className="text-sm">
                <div className="font-medium text-green-900">Incentive Tracker</div>
                <div className="text-green-700">Check your eligibility in Incentives tab</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <div className="font-medium text-blue-900">Active Status</div>
                <div className="text-blue-700">
                  {user.active ? 'Currently active' : 'Inactive'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Management for Photographers */}
      {user.role === 'PHOTOGRAPHER' && (
        <LeaveManagement photographerId={user.id} />
      )}

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
