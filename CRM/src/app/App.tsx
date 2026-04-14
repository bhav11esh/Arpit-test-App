import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { LeaveProvider } from './context/LeaveContext';
import { Lock } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { ViewScreen } from './components/ViewScreen';

// Admin Components
import { AdminConfigScreen } from './components/admin/AdminConfigScreen';
import { AdminLeaveManagement } from './components/admin/AdminLeaveManagement';
import { UserManagement } from './components/admin/UserManagement';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { AdminNotifier } from './components/admin/AdminNotifier';
import { ClustersConfigScreen } from './components/admin/ClustersConfigScreen';
import { DealershipsConfigScreen } from './components/admin/DealershipsConfigScreen';
import { PhotographersConfigScreen } from './components/admin/PhotographersConfigScreen';
import { MappingsConfigScreen } from './components/admin/MappingsConfigScreen';

import { ProfileScreen } from './components/ProfileScreen';
import { ReelBacklog } from './components/ReelBacklog';
import { PhotographerLeaveScreen } from './components/photographer/PhotographerLeaveScreen';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { Toaster } from './components/ui/sonner';
import { GPSPermissionPrompt } from './components/GPSPermissionPrompt';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { savePushSubscription } from './lib/db/push';
import { updateUserMonitoring } from './lib/db/users';
import { checkGeolocationPermission } from './lib/geofence';

function AppRoutes() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  // V1 SPEC: PWA Service Worker Registration
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // V1 MONITORING: Heartbeat & GPS/Notification Status tracking
  const lastStatusRef = React.useRef<{ gps: string, notification: string }>({ gps: 'unknown', notification: 'unknown' });
  const nagCountRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!user) return;

    const checkStatusAndNag = async () => {
      try {
        // 1. Check Permissions
        const gpsPerm = await checkGeolocationPermission();
        const gpsStatus = gpsPerm === 'granted' ? 'ON' : (gpsPerm === 'denied' ? 'OFF' : 'UNKNOWN');
        const notifStatus = Notification.permission === 'granted' ? 'ON' : (Notification.permission === 'denied' ? 'OFF' : 'UNKNOWN');

        // 2. Detect and Log Changes
        if (lastStatusRef.current.gps !== 'unknown' && lastStatusRef.current.gps !== gpsStatus) {
            await updateUserMonitoring(user.id, gpsStatus as any);
            const { createLogEvent } = await import('./lib/db/logs');
            await createLogEvent({
                type: 'GPS_STATUS_CHANGE',
                actor_user_id: user.id,
                target_id: user.id,
                metadata: { status: gpsStatus, photographer_name: user.name }
            });
        }

        if (lastStatusRef.current.notification !== 'unknown' && lastStatusRef.current.notification !== notifStatus) {
            const { createLogEvent } = await import('./lib/db/logs');
            await createLogEvent({
                type: 'NOTIFICATION_STATUS_CHANGE',
                actor_user_id: user.id,
                target_id: user.id,
                metadata: { status: notifStatus, photographer_name: user.name }
            });
        }

        // 3. Heartbeat Update
        await updateUserMonitoring(user.id, gpsStatus as any);
        lastStatusRef.current = { gps: gpsStatus, notification: notifStatus };

        // 4. Nagging Logic (10 AM - 7 PM)
        const now = new Date();
        const currentHour = now.getHours();
        const isWorkHours = currentHour >= 10 && currentHour < 19;

        if (isWorkHours && (gpsStatus === 'OFF' || notifStatus === 'OFF')) {
            const violationKey = `violation_start_${user.id}`;
            let violationStart = localStorage.getItem(violationKey);
            
            if (!violationStart) {
                violationStart = Date.now().toString();
                localStorage.setItem(violationKey, violationStart);
            }

            const minutesPassed = (Date.now() - parseInt(violationStart)) / (1000 * 60);

            if (minutesPassed < 20) {
                // Send Nag Notification
                const { createNotification } = await import('./lib/db/notifications');
                const { getUsers } = await import('./lib/db/users');
                const { createLogEvent } = await import('./lib/db/logs');
                
                const title = "⚠️ Action Required: Permissions Disabled";
                const body = `Your ${gpsStatus === 'OFF' ? 'GPS' : 'Notification'} permission is turned off. Please enable it to continue working.`;
                
                // Notify Photographer
                await createNotification({
                    user_id: user.id,
                    title,
                    body,
                    type: 'SYSTEM'
                });

                // Notify All Active Admins
                const allUsers = await getUsers();
                const admins = allUsers.filter(u => u.role === 'ADMIN' && u.active);
                for (const admin of admins) {
                    await createNotification({
                        user_id: admin.id,
                        title: `🚨 Photographer Alert: ${user.name}`,
                        body: `${user.name} has disabled ${gpsStatus === 'OFF' ? 'GPS' : 'Notification'} permissions.`,
                        type: 'SYSTEM'
                    });
                }

                await createLogEvent({
                    type: 'MONITORING_NAG_SENT',
                    actor_user_id: user.id,
                    target_id: user.id,
                    metadata: { gpsStatus, notifStatus, minutesPassed: Math.floor(minutesPassed) }
                });

                // Show local toast (sonner)
                const { toast } = await import('sonner');
                toast.error(title, { description: body, duration: 10000 });
            } else if (minutesPassed >= 20 && minutesPassed < 21) {
                // Log expiration only once
                const { createLogEvent } = await import('./lib/db/logs');
                await createLogEvent({
                    type: 'MONITORING_NAG_EXPIRED',
                    actor_user_id: user.id,
                    target_id: user.id,
                    metadata: { reason: '20-minute limit reached' }
                });
            }
        } else {
            // Clear violation start if back to normal or outside work hours
            localStorage.removeItem(`violation_start_${user.id}`);
        }
      } catch (err) {
        console.error('Monitoring loop failed:', err);
      }
    };

    // Initial check
    checkStatusAndNag();

    // Check status every minute
    const interval = setInterval(checkStatusAndNag, 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  // V1 PUSH: Register for Push Notifications
  React.useEffect(() => {
    if (!user) return;

    const setupPush = async () => {
      try {
        // 1. Wait for SW to be ready
        const registration = await navigator.serviceWorker.ready;

        // 2. Request notification permission (already handled globally by some components, but ensures we have it here for subscription)
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;

        // 3. Get or create subscription
        let subscription = await registration.pushManager.getSubscription();

        // V1 Note: Ideally we'd have a VAPID key from env
        // For now, checking if one exists in env, else it might fail or we'd need to provide one
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (!subscription && vapidPublicKey && vapidPublicKey !== 'undefined' && vapidPublicKey.length > 20) {
          // V5.2 FIX: Convert Base64 VAPID key to Uint8Array for browser compatibility
          const { urlBase64ToUint8Array } = await import('./lib/utils');
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
        }

        if (subscription) {
          await savePushSubscription(user.id, subscription);
          console.log('✅ Push subscription saved to DB');
        }
      } catch (err) {
        console.warn('Push setup failed (expected if local/no VAPID):', err);
      }
    };

    setupPush();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // V1 FIX: If user is null but loading is false, it means we don't have a record 
  // or they aren't logged in. Show LoginScreen.
  if (!user) {
    return <LoginScreen />;
  }

  // V1 SPEC: Hide bottom nav on all admin-prefixed screens
  const isAdminModule = location.pathname.startsWith('/admin/');

  // V5.3 ACCESS CONTROL: If user is inactive, block all routes
  if (user && user.active === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen bg-gray-50 text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Deactivated</h1>
          <p className="text-gray-600 mb-8">
            Your account has been deactivated. You no longer have access to the system. 
            If you believe this is an error, please contact your administrator.
          </p>
          <button
            onClick={async () => {
               await logout();
            }}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            user?.role === 'ADMIN' ? (
              <Navigate to="/view" replace />
            ) : (
              <Layout hideHeader={false}>
                <HomeScreen />
              </Layout>
            )
          }
        />
        <Route
          path="/view"
          element={
            user?.role === 'ADMIN' || user?.role === 'PHOTOGRAPHER' ? (
              <Layout hideHeader={false}>
                <ViewScreen />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/reels"
          element={
            <Layout hideHeader={false}>
              <ReelBacklog />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout hideHeader={false}>
              <ProfileScreen />
            </Layout>
          }
        />

        <Route
          path="/leave"
          element={
            <Layout hideHeader={false}>
              <PhotographerLeaveScreen />
            </Layout>
          }
        />

        {/* Admin Modules - Role Protected */}
        {user.role === 'ADMIN' ? (
          <>
            <Route path="/admin/config" element={<AdminConfigScreen />} />
            <Route path="/admin/config/clusters" element={<ClustersConfigScreen />} />
            <Route path="/admin/config/dealerships" element={<DealershipsConfigScreen />} />
            <Route path="/admin/config/photographers" element={<PhotographersConfigScreen />} />
            <Route path="/admin/config/mappings" element={<MappingsConfigScreen />} />
            <Route path="/admin/leave" element={<AdminLeaveManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          </>
        ) : (
          // Redirect non-admins trying to access admin routes
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
        )}

        {/* V1 SPEC: Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminModule && <BottomNav userRole={user.role} />}
      <AdminNotifier />
      <GPSPermissionPrompt />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <AuthProvider>
        <ConfigProvider>
          <LeaveProvider>
            <AppRoutes />
            <Toaster />
          </LeaveProvider>
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
