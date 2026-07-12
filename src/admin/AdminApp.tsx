import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AdminDashboard, UsersManagement, UserDetail, CampaignsOverview, SmsLogsView, ApiKeysView, DevicesView, RolesManagement } from "@/admin";
import { Spinner } from "@/components/Spinner";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/Admin";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
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
  if (!isAdmin) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" color="border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AdminRoutes = () => (
  <Routes>
    <Route
      path="/auth"
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      }
    />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route
      path="/"
      element={
        <AdminGuard>
          <Admin />
        </AdminGuard>
      }
    >
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<UsersManagement />} />
      <Route path="users/:userId" element={<UserDetail />} />
      <Route path="campaigns" element={<CampaignsOverview />} />
      <Route path="logs" element={<SmsLogsView />} />
      <Route path="api-keys" element={<ApiKeysView />} />
      <Route path="devices" element={<DevicesView />} />
      <Route path="roles" element={<RolesManagement />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const AdminApp = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AdminRoutes />
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default AdminApp;
