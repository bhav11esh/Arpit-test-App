import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as deliveriesDb from '../lib/db/deliveries';
import { simulateApiDelay } from '../lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, User, Award, TrendingUp, Calendar, Radio, RefreshCw, MapPin, ExternalLink, Loader2, ShieldCheck, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { LeaveManagement } from './LeaveManagement';
import { updateUserMonitoring, getUsers } from '../lib/db/users';
import { checkGeolocationPermission } from '../lib/geofence';
import { createLogEvent } from '../lib/db/logs';
import { toast } from 'sonner';
import { getMappings, getClusters, getDealerships } from '../lib/db/config';
import { getLeavesByDate } from '../lib/db/leaves';
import { getOperationalDateString } from '../lib/utils';
import { supabase } from '../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

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

  // Super Admin audit compliance log
  const [auditComplianceLog, setAuditComplianceLog] = useState<{
    admin: { id: string; name: string };
    dates: { date: string; label: string; sent: boolean }[];
  }[]>([]);
  const [loadingAuditLog, setLoadingAuditLog] = useState(false);

  // States for available showrooms
  const [isShowroomsOpen, setIsShowroomsOpen] = useState(false);
  const [availableShowrooms, setAvailableShowrooms] = useState<any[]>([]);
  const [isLoadingShowrooms, setIsLoadingShowrooms] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadStats();
    if (user?.role === 'SUPER_ADMIN') {
      loadAuditComplianceLog();
    }
  }, [user]);

  const loadAuditComplianceLog = async () => {
    setLoadingAuditLog(true);
    try {
      // Build last 7 operational dates
      const dates: { date: string; label: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        dates.push({ date: dateStr, label });
      }

      // Fetch all ADMIN users
      const allUsers = await getUsers();
      const admins = allUsers.filter(u => u.role === 'ADMIN');

      // Fetch all ADMIN_DAILY_AUDIT_UPDATE_SENT logs in range
      const oldest = dates[dates.length - 1].date;
      const { data: logs } = await supabase
        .from('log_events')
        .select('user_id, metadata, created_at')
        .eq('type', 'ADMIN_DAILY_AUDIT_UPDATE_SENT')
        .gte('created_at', `${oldest}T00:00:00`);

      const sentSet = new Set<string>(
        (logs || []).map((l: any) => `${l.user_id}__${l.metadata?.date}`)
      );

      const result = admins.map(admin => ({
        admin: { id: admin.id, name: admin.name },
        dates: dates.map(d => ({
          date: d.date,
          label: d.label,
          sent: sentSet.has(`${admin.id}__${d.date}`)
        }))
      }));

      setAuditComplianceLog(result);
    } catch (e) {
      console.error('Failed to load audit compliance log', e);
    } finally {
      setLoadingAuditLog(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
      ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const getCoords = (): Promise<GeolocationCoordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationEnabled(true);
          resolve(position.coords);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
          setLocationEnabled(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 3600000 }
      );
    });
  };

  const handleOpenAvailableShowrooms = async () => {
    setIsShowroomsOpen(true);
    setIsLoadingShowrooms(true);
    try {
      const todayDate = getOperationalDateString();
      const [coords, mappings, clusters, dealerships, users, leaves] = await Promise.all([
        getCoords(),
        getMappings(),
        getClusters(),
        getDealerships(),
        getUsers(),
        getLeavesByDate(todayDate),
      ]);

      const clustersMap = new Map(clusters.map(c => [c.id, c.name]));
      const dealershipsMap = new Map(dealerships.map(d => [d.id, d]));
      const usersMap = new Map(users.map(u => [u.id, u]));
      
      // Determine leaves today
      const leavesSet = new Set(leaves.map(l => l.photographerId));

      // 1. Partition photographers into present and absent
      const photographers = users.filter(u => u.role === 'PHOTOGRAPHER');
      const absentPhotographerIds = new Set<string>();
      const presentPhotographerIds = new Set<string>();

      for (const p of photographers) {
        if (!p.active || leavesSet.has(p.id)) {
          absentPhotographerIds.add(p.id);
        } else {
          presentPhotographerIds.add(p.id);
        }
      }

      // 2. Identify absent clusters: clusters that have at least one PRIMARY mapping with an absent photographer
      const absentClusterIds = new Set<string>();
      for (const m of mappings) {
        if (m.mappingType === 'PRIMARY' && m.photographerId && absentPhotographerIds.has(m.photographerId)) {
          absentClusterIds.add(m.clusterId);
        }
      }

      // 3. Identify covered dealerships: dealerships mapped as PRIMARY to any present photographer
      const coveredDealershipIds = new Set<string>();
      for (const m of mappings) {
        if (m.mappingType === 'PRIMARY' && m.photographerId && presentPhotographerIds.has(m.photographerId)) {
          coveredDealershipIds.add(m.dealershipId);
        }
      }

      // 4. Build map of available showrooms to group by dealershipId and avoid duplicates
      const availableMap = new Map<string, any>();

      for (const m of mappings) {
        // Exclude if explicitly covered by a present photographer
        if (coveredDealershipIds.has(m.dealershipId)) {
          continue;
        }

        const clusterName = clustersMap.get(m.clusterId) || 'Unknown Cluster';
        const dealership = dealershipsMap.get(m.dealershipId);
        if (!dealership || dealership.active === false) {
          continue;
        }
        const dealershipName = dealership.name;

        let isAvailable = false;
        let reason: 'unassigned' | 'inactive' | 'leave' | 'short-staffed' = 'unassigned';
        let assignedPhotographerName = '';

        if (m.mappingType === 'PRIMARY') {
          if (!m.photographerId) {
            isAvailable = true;
            reason = 'unassigned';
          } else if (absentPhotographerIds.has(m.photographerId)) {
            isAvailable = true;
            const assignedUser = usersMap.get(m.photographerId);
            assignedPhotographerName = assignedUser ? assignedUser.name : '';
            reason = assignedUser && !assignedUser.active ? 'inactive' : 'leave';
          }
        } else if (m.mappingType === 'SECONDARY') {
          if (absentClusterIds.has(m.clusterId)) {
            isAvailable = true;
            reason = 'short-staffed';
            const assignedUser = m.photographerId ? usersMap.get(m.photographerId) : null;
            assignedPhotographerName = assignedUser ? assignedUser.name : '';
          }
        }

        if (isAvailable) {
          let distance: number | undefined;
          if (coords && m.latitude && m.longitude && m.latitude !== 0 && m.longitude !== 0) {
            distance = calculateDistance(coords.latitude, coords.longitude, m.latitude, m.longitude);
          }

          const itemData = {
            mappingId: m.id,
            clusterName,
            dealershipName,
            mapLink: m.map_link || null,
            reason,
            assignedPhotographerName,
            distance,
            mappingType: m.mappingType,
            hasMetro: m.has_metro ?? false
          };

          // Group by dealershipId: prefer PRIMARY mapping properties if available
          const existing = availableMap.get(m.dealershipId);
          if (!existing || (existing.mappingType === 'SECONDARY' && m.mappingType === 'PRIMARY')) {
            availableMap.set(m.dealershipId, itemData);
          }
        }
      }

      const list = Array.from(availableMap.values());

      // Sort by distance (closest first)
      list.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return a.clusterName.localeCompare(b.clusterName);
      });

      setAvailableShowrooms(list);
    } catch (error) {
      console.error('Failed to load available showrooms:', error);
      toast.error('Failed to load available showrooms');
    } finally {
      setIsLoadingShowrooms(false);
    }
  };

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
    <div className="space-y-5 pb-36">
      {/* User Info Card */}
      <Card className="border-orange-100/50 shadow-sm bg-gradient-to-br from-white to-orange-50/20">
        <CardContent className="p-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-black text-gray-900 truncate tracking-tight">{user.name}</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800 border-0 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                {user.role}
              </Badge>
              <span className="text-[10px] text-gray-400 font-medium">YourPhotoCrew</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm ml-1">Delivery Statistics</h3>

        <Card className="stat-card-primary">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-orange-500 text-xs">Total Deliveries Completed</CardDescription>
            <CardTitle className="text-4xl font-bold text-orange-700">{stats.totalDeliveries}</CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="stat-card-green">
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-emerald-500 text-xs">This Week</CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-700">{stats.thisWeek}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="stat-card-purple">
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-amber-500 text-xs">This Month</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-700">{stats.thisMonth}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Super Admin: Admin Audit Update Compliance */}
      {user.role === 'SUPER_ADMIN' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm ml-1 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              Admin Audit Update Compliance
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-indigo-600"
              onClick={loadAuditComplianceLog}
              disabled={loadingAuditLog}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingAuditLog ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loadingAuditLog ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : auditComplianceLog.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-gray-400 text-xs italic">
                No admin users found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {auditComplianceLog.map(({ admin, dates }) => {
                const sentCount = dates.filter(d => d.sent).length;
                const missedCount = dates.filter(d => !d.sent).length;
                return (
                  <Card key={admin.id} className={`border-l-4 ${missedCount === 0 ? 'border-l-green-500' : missedCount >= 3 ? 'border-l-red-500' : 'border-l-amber-400'}`}>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-800">{admin.name}</span>
                        <div className="flex items-center gap-1.5">
                          {missedCount === 0 ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] font-semibold">All Sent</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-semibold">{missedCount} Missed</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {dates.map(d => (
                          <div key={d.date} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-gray-400 font-medium text-center leading-tight">{d.label}</span>
                            {d.sent ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Performance Highlights */}
      {user.role === 'PHOTOGRAPHER' && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                   <Radio className="h-4 w-4 text-orange-500 animate-pulse" />
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
                <div className="p-3 bg-orange-50/60 rounded-lg flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 min-w-0">
                    Your phone sends a "Heartbeat" every minute to track deliveries.
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 gap-1.5 flex-shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50"
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
              <CardTitle className="text-sm font-semibold">Performance Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-lg">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-sm min-w-0">
                  <div className="font-medium text-emerald-800">Earnings Tracker</div>
                  <div className="text-emerald-600 text-xs">Check your period earnings in Earnings tab</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50/60 rounded-lg">
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-sm min-w-0">
                  <div className="font-medium text-orange-800">Active Status</div>
                  <div className="text-orange-600 text-xs">
                    {user.active ? 'Currently active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Showroom Coverage Card */}
          <Card className="border-orange-100/50 shadow-sm bg-gradient-to-br from-white to-orange-50/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                Showroom Coverage
              </CardTitle>
              <CardDescription className="text-xs">
                View showrooms that are available today due to photographer leaves, deactivations, or empty assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleOpenAvailableShowrooms}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 h-9"
              >
                <MapPin className="h-3.5 w-3.5" />
                View Available Showrooms Today
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leave Management for Photographers */}
      {user.role === 'PHOTOGRAPHER' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm ml-1">Leave Management</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-orange-600 gap-1.5 h-8 text-xs"
              onClick={() => navigate('/leave')}
            >
              <Calendar className="h-3.5 w-3.5" />
              Manage Detailed
            </Button>
          </div>
          <LeaveManagement photographerId={user.id} />
        </div>
      )}

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full gap-2 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 h-11"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>

      {/* Available Showrooms Modal */}
      <Dialog open={isShowroomsOpen} onOpenChange={setIsShowroomsOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <MapPin className="h-5 w-5 text-orange-500" />
              Available Showrooms Today
            </DialogTitle>
            <DialogDescription>
              {locationEnabled === false ? (
                <span className="text-red-500 text-xs font-semibold">
                  ⚠️ Location permission is disabled or timed out. Showrooms cannot be sorted by distance.
                </span>
              ) : (
                "Showrooms currently without active coverage, sorted by distance."
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingShowrooms ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Determining availability and distances...</p>
            </div>
          ) : availableShowrooms.length === 0 ? (
            <div className="text-center p-8 space-y-2">
              <div className="text-4xl">🎉</div>
              <h4 className="font-semibold text-gray-900 text-sm">All Showrooms Covered</h4>
              <p className="text-xs text-gray-500">Every showroom has an active photographer assigned today.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {availableShowrooms.map((item) => (
                <button
                  key={item.mappingId}
                  onClick={() => {
                    if (item.mapLink) {
                      window.open(item.mapLink, '_blank');
                    } else {
                      toast.error('No map link configured for this showroom');
                    }
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-gray-100 bg-white hover:bg-orange-50/20 active:bg-orange-50/40 transition-all duration-200 shadow-sm flex flex-col gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-gray-800 tracking-tight group-hover:text-orange-600 transition-colors">
                      [{item.clusterName} {item.dealershipName}]
                    </span>
                    {item.mapLink && (
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-orange-500 flex-shrink-0 transition-colors" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.reason === 'unassigned' && (
                      <span className="border border-gray-200 text-gray-600 text-[10px] py-0.5 px-1.5 font-medium bg-gray-50 rounded-md">
                        Unassigned
                      </span>
                    )}
                    {item.reason === 'inactive' && (
                      <span className="border border-yellow-200 text-yellow-700 text-[10px] py-0.5 px-1.5 font-medium bg-yellow-50 rounded-md">
                        Photographer Inactive ({item.assignedPhotographerName})
                      </span>
                    )}
                    {item.reason === 'leave' && (
                      <span className="border border-orange-200 text-orange-700 text-[10px] py-0.5 px-1.5 font-medium bg-orange-50 rounded-md">
                        On Leave ({item.assignedPhotographerName})
                      </span>
                    )}
                    {item.reason === 'short-staffed' && (
                      <span className="border border-purple-200 text-purple-700 text-[10px] py-0.5 px-1.5 font-medium bg-purple-50 rounded-md">
                        Secondary (Short-staffed)
                      </span>
                    )}
                    {item.hasMetro && (
                      <span className="border border-emerald-200 text-emerald-700 text-[10px] py-0.5 px-1.5 font-medium bg-emerald-50 rounded-md flex items-center gap-0.5">
                        🚇 Metro
                      </span>
                    )}

                    {item.distance !== undefined && (
                      <span className="text-gray-500 text-[11px] font-medium flex items-center gap-1">
                        📍 {item.distance >= 1 ? `${item.distance.toFixed(1)} km` : `${Math.round(item.distance * 1000)} m`} away
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
