import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { LeaveProvider } from './context/LeaveContext';
import { LoginScreen } from './components/LoginScreen';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { ReelBacklog } from './components/ReelBacklog';
import { ViewScreen } from './components/ViewScreen';
import { IncentiveTracker } from './components/IncentiveTracker';
import { ProfileScreen } from './components/ProfileScreen';
import { AdminConfigScreen } from './components/admin/AdminConfigScreen';
import { ClustersConfigScreen } from './components/admin/ClustersConfigScreen';
import { DealershipsConfigScreen } from './components/admin/DealershipsConfigScreen';
import { PhotographersConfigScreen } from './components/admin/PhotographersConfigScreen';
import { MappingsConfigScreen } from './components/admin/MappingsConfigScreen';
import { AdminLeaveManagement } from './components/admin/AdminLeaveManagement';
import { PhotographerLeaveScreen } from './components/photographer/PhotographerLeaveScreen';
import { UserManagement } from './components/admin/UserManagement';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { Toaster } from './components/ui/sonner';

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Check if we're on a config page - hide BottomNav if so
  const isConfigPage = location.pathname.startsWith('/admin/config');
  const isLeavePage = location.pathname.includes('/leave');

  return (
    <>
      <Routes>
        {/* Main App Routes */}
        <Route
          path="/"
          element={
            user.role === 'ADMIN' ? (
              // V1 SPEC: Admins don't have Home Screen - redirect to View
              <Navigate to="/view" replace />
            ) : (
              <Layout hideHeader={false}>
                <HomeScreen />
              </Layout>
            )
          }
        />
        <Route
          path="/reels"
          element={
            <Layout hideHeader={true}>
              <ReelBacklog />
            </Layout>
          }
        />
        <Route
          path="/view"
          element={
            <Layout hideHeader={true}>
              <ViewScreen />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout hideHeader={true}>
              <ProfileScreen />
            </Layout>
          }
        />

        {/* Admin Configuration Routes */}
        <Route 
          path="/admin/config" 
          element={
            <Layout hideHeader={true}>
              <AdminConfigScreen />
            </Layout>
          } 
        />
        <Route 
          path="/admin/config/clusters" 
          element={
            <Layout hideHeader={true}>
              <ClustersConfigScreen />
            </Layout>
          } 
        />
        <Route
          path="/admin/config/dealerships"
          element={
            <Layout hideHeader={true}>
              <DealershipsConfigScreen />
            </Layout>
          }
        />
        <Route
          path="/admin/config/photographers"
          element={
            <Layout hideHeader={true}>
              <PhotographersConfigScreen />
            </Layout>
          }
        />
        <Route
          path="/admin/config/mappings"
          element={
            <Layout hideHeader={true}>
              <MappingsConfigScreen />
            </Layout>
          }
        />

        {/* Leave Management Routes */}
        <Route
          path="/admin/leave"
          element={
            <Layout hideHeader={true}>
              <AdminLeaveManagement />
            </Layout>
          }
        />
        <Route
          path="/photographer/leave"
          element={
            <Layout hideHeader={true}>
              <PhotographerLeaveScreen />
            </Layout>
          }
        />

        {/* Admin Management Routes */}
        <Route
          path="/admin/users"
          element={
            <Layout hideHeader={true}>
              <UserManagement />
            </Layout>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <Layout hideHeader={true}>
              <AnalyticsDashboard />
            </Layout>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Only show BottomNav on main app routes, not config or leave pages */}
      {!isConfigPage && !isLeavePage && <BottomNav userRole={user.role} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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