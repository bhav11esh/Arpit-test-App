import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { LeaveProvider } from './context/LeaveContext';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { ViewScreen } from './components/ViewScreen';

// Admin Components
import { AdminConfigScreen } from './components/admin/AdminConfigScreen';
import { AdminLeaveManagement } from './components/admin/AdminLeaveManagement';
import { UserManagement } from './components/admin/UserManagement';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { ClustersConfigScreen } from './components/admin/ClustersConfigScreen';
import { DealershipsConfigScreen } from './components/admin/DealershipsConfigScreen';
import { PhotographersConfigScreen } from './components/admin/PhotographersConfigScreen';
import { MappingsConfigScreen } from './components/admin/MappingsConfigScreen';

import { ProfileScreen } from './components/ProfileScreen';
import { ReelBacklog } from './components/ReelBacklog';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { Toaster } from './components/ui/sonner';

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading auth state...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // V1 SPEC: Hide bottom nav on all admin-prefixed screens
  const isAdminModule = location.pathname.startsWith('/admin/');

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            user.role === 'ADMIN' ? (
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
            <Layout hideHeader={false}>
              <ViewScreen />
            </Layout>
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
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/crm">
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
