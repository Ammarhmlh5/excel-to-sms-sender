import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/shared/hooks/useAuth";
import { useIsAdmin } from "@/admin/hooks/useIsAdmin";
import { Spinner } from "@/shared/components/Spinner";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { lazy, Suspense } from "react";

import AdminAuth from "./AdminAuth";

const SuperAdminLayout = lazy(() => import("./components/SuperAdminLayout").then(m => ({ default: m.SuperAdminLayout })));
const SuperAdminDashboard = lazy(() => import("./components/SuperAdminDashboard").then(m => ({ default: m.SuperAdminDashboard })));
const UsersManagement = lazy(() => import("./components/UsersManagement").then(m => ({ default: m.UsersManagement })));
const UserDetail = lazy(() => import("./components/UserDetail").then(m => ({ default: m.UserDetail })));
const AllCampaigns = lazy(() => import("./components/AllCampaigns").then(m => ({ default: m.AllCampaigns })));
const AllSmsLogs = lazy(() => import("./components/AllSmsLogs").then(m => ({ default: m.AllSmsLogs })));
const AllApiKeys = lazy(() => import("./components/AllApiKeys").then(m => ({ default: m.AllApiKeys })));
const AllDevices = lazy(() => import("./components/AllDevices").then(m => ({ default: m.AllDevices })));
const RolesManagement = lazy(() => import("./components/RolesManagement").then(m => ({ default: m.RolesManagement })));
const DeadLetters = lazy(() => import("./components/DeadLetters").then(m => ({ default: m.DeadLetters })));

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Spinner size="lg" color="border-white" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AdminRoutes = () => (
  <Routes>
    <Route path="/" element={<AdminAuth />} />
    <Route
      path="/super-admin"
      element={
        <AdminRoute>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950"><Spinner size="lg" color="border-white" /></div>}>
            <SuperAdminLayout />
          </Suspense>
        </AdminRoute>
      }
    >
      <Route index element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><SuperAdminDashboard /></Suspense>} />
      <Route path="users" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><UsersManagement /></Suspense>} />
      <Route path="users/:userId" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><UserDetail /></Suspense>} />
      <Route path="campaigns" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><AllCampaigns /></Suspense>} />
      <Route path="logs" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><AllSmsLogs /></Suspense>} />
      <Route path="api-keys" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><AllApiKeys /></Suspense>} />
      <Route path="devices" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><AllDevices /></Suspense>} />
      <Route path="roles" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><RolesManagement /></Suspense>} />
      <Route path="dead-letters" element={<Suspense fallback={<div className="p-8 text-center text-white">Loading...</div>}><DeadLetters /></Suspense>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const AdminApp = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AdminRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default AdminApp;
