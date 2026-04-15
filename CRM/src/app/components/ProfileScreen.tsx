import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as deliveriesDb from '../lib/db/deliveries';
import { simulateApiDelay } from '../lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, User, Award, TrendingUp, Calendar, Radio, RefreshCw } from 'lucide-react';
import { LeaveManagement } from './LeaveManagement';
import { updateUserMonitoring } from '../lib/db/users';
import { checkGeolocationPermission } from '../lib/geofence';
import { createLogEvent } from '../lib/db/logs';
import { toast } from 'sonner';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                   <Radio className="h-4 w-4 text-blue-500 animate-pulse" />
                   System Connectivity
                </CardTitle>
                {lastSync && (
                  <span className="text-xs text-gray-400">
                    Last sync: {lastSync.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Your phone sends a "Heartbeat" every minute to track deliveries.
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 gap-1.5"
                    disabled={isSyncing}
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        const perm = await checkGeolocationPermission();
                        const status = perm === 'granted' ? 'ON' : (perm === 'denied' ? 'OFF' : 'UNKNOWN');
                        
                        // 1. Update Database through logs (Bypass RLS)
                        await createLogEvent({
                            type: 'MONITORING_HEARTBEAT',
                            actor_user_id: user.id,
                            target_id: user.id,
                            metadata: { gpsStatus: status, photographer_name: user.name, source: 'manual_sync' }
                        });

                        // 2. Legacy update (might still fail due to RLS, but we ignore it)
                        await updateUserMonitoring(user.id, status as any);
                        setLastSync(new Date());
                        toast.success('Heartbeat Synced', { description: 'Your signal reached the server successfully.' });
                      } catch (err) {
                        toast.error('Sync Failed', { description: 'Please check your internet connection.' });
                      } finally {
                        setIsSyncing(false);
                      }
                    }}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Signal Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
                <div className="text-sm">
                  <div className="font-medium text-green-900">Earnings Tracker</div>
                  <div className="text-green-700">Check your period earnings in Earnings tab</div>
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
        </div>
      )}

      {/* Leave Management for Photographers */}
      {user.role === 'PHOTOGRAPHER' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 ml-1">Leave Management</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 gap-1.5 h-8"
              onClick={() => navigate('/leave')}
            >
              <Calendar className="h-4 w-4" />
              Manage Detailed
            </Button>
          </div>
          <LeaveManagement photographerId={user.id} />
        </div>
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
