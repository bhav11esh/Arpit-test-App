import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as deliveriesDb from '../../lib/db/deliveries';
import * as usersDb from '../../lib/db/users';
import type { Delivery, User } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertCircle, TrendingUp, Package, Users, DollarSign, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export function AnalyticsDashboard() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    totalPhotographers: 0,
    activePhotographers: 0,
  });
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [photographerStats, setPhotographerStats] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      loadAnalytics();
    }
  }, [currentUser]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      // Load deliveries for the last 7 days
      const deliveries = await deliveriesDb.getDeliveries({
        limit: 1000,
      });

      // Filter deliveries from last 7 days
      const recentDeliveries = deliveries.filter(
        (d) => d.date >= sevenDaysAgo && d.date <= today
      );

      // Calculate stats
      const totalDeliveries = recentDeliveries.length;
      const completedDeliveries = recentDeliveries.filter(
        (d) => d.status === 'DONE'
      ).length;
      const pendingDeliveries = recentDeliveries.filter(
        (d) => d.status !== 'DONE' && d.status !== 'POSTPONED_CANCELED'
      ).length;

      // Load photographers
      const photographers = await usersDb.getUsersByRole('PHOTOGRAPHER');
      const activePhotographers = photographers.filter((p) => p.active).length;

      setStats({
        totalDeliveries,
        completedDeliveries,
        pendingDeliveries,
        totalPhotographers: photographers.length,
        activePhotographers,
      });

      // Calculate daily stats
      const dailyData: Record<string, { date: string; completed: number; total: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyData[date] = { date, completed: 0, total: 0 };
      }

      recentDeliveries.forEach((delivery) => {
        if (dailyData[delivery.date]) {
          dailyData[delivery.date].total++;
          if (delivery.status === 'DONE') {
            dailyData[delivery.date].completed++;
          }
        }
      });

      setDailyStats(Object.values(dailyData));

      // Calculate photographer stats
      const photographerData: Record<string, { name: string; deliveries: number; completed: number }> = {};
      photographers.forEach((p) => {
        photographerData[p.id] = {
          name: p.name,
          deliveries: 0,
          completed: 0,
        };
      });

      recentDeliveries.forEach((delivery) => {
        if (delivery.assigned_user_id && photographerData[delivery.assigned_user_id]) {
          photographerData[delivery.assigned_user_id].deliveries++;
          if (delivery.status === 'DONE') {
            photographerData[delivery.assigned_user_id].completed++;
          }
        }
      });

      setPhotographerStats(
        Object.values(photographerData)
          .filter((p) => p.deliveries > 0)
          .sort((a, b) => b.deliveries - a.deliveries)
          .slice(0, 10)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You do not have permission to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of delivery operations and performance</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDeliveries > 0
                ? Math.round((stats.completedDeliveries / stats.totalDeliveries) * 100)
                : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Photographers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePhotographers}</div>
            <p className="text-xs text-muted-foreground">Out of {stats.totalPhotographers} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Delivery Trends</CardTitle>
            <CardDescription>Deliveries over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8884d8"
                  name="Total Deliveries"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#82ca9d"
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Photographers</CardTitle>
            <CardDescription>Delivery performance by photographer</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={photographerStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="deliveries" fill="#8884d8" name="Total Deliveries" />
                <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
