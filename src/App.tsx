import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Spinner } from "@/components/Spinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MyCampaigns } from "@/components/dashboard/MyCampaigns";
import { MySmsLogs } from "@/components/dashboard/MySmsLogs";
import { MyApiKeys } from "@/components/dashboard/MyApiKeys";
import { MyDevices } from "@/components/dashboard/MyDevices";
import { AccountSettings } from "@/components/dashboard/AccountSettings";

const SuperAdminLayout = lazy(() => import("@/components/super-admin/SuperAdminLayout").then(m => ({ default: m.SuperAdminLayout })));
const SuperAdminDashboard = lazy(() => import("@/components/super-admin/SuperAdminDashboard").then(m => ({ default: m.SuperAdminDashboard })));
const UsersManagement = lazy(() => import("@/components/super-admin/UsersManagement").then(m => ({ default: m.UsersManagement })));
const UserDetail = lazy(() => import("@/components/super-admin/UserDetail").then(m => ({ default: m.UserDetail })));
const AllCampaigns = lazy(() => import("@/components/super-admin/AllCampaigns").then(m => ({ default: m.AllCampaigns })));
const AllSmsLogs = lazy(() => import("@/components/super-admin/AllSmsLogs").then(m => ({ default: m.AllSmsLogs })));
const AllApiKeys = lazy(() => import("@/components/super-admin/AllApiKeys").then(m => ({ default: m.AllApiKeys })));
const AllDevices = lazy(() => import("@/components/super-admin/AllDevices").then(m => ({ default: m.AllDevices })));
const RolesManagement = lazy(() => import("@/components/super-admin/RolesManagement").then(m => ({ default: m.RolesManagement })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" color="border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" color="border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      }
    />
    <Route
      path="/auth"
      element={<Auth />}
    />
    <Route path="/reset-password" element={<ResetPassword />} />

    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<MyCampaigns />} />
      <Route path="sms-logs" element={<MySmsLogs />} />
      <Route path="api-keys" element={<MyApiKeys />} />
      <Route path="devices" element={<MyDevices />} />
      <Route path="settings" element={<AccountSettings />} />
    </Route>

    <Route
      path="/super-admin"
      element={
        <SuperAdminRoute>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" color="border-primary" /></div>}>
            <SuperAdminLayout />
          </Suspense>
        </SuperAdminRoute>
      }
    >
      <Route index element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><SuperAdminDashboard /></Suspense>} />
      <Route path="users" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><UsersManagement /></Suspense>} />
      <Route path="users/:userId" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><UserDetail /></Suspense>} />
      <Route path="campaigns" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><AllCampaigns /></Suspense>} />
      <Route path="logs" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><AllSmsLogs /></Suspense>} />
      <Route path="api-keys" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><AllApiKeys /></Suspense>} />
      <Route path="devices" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><AllDevices /></Suspense>} />
      <Route path="roles" element={<Suspense fallback={<div className="p-8 text-center">جارٍ التحميل...</div>}><RolesManagement /></Suspense>} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
