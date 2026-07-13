import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/shared/hooks/useAuth";
import { Spinner } from "@/shared/components/Spinner";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { MyCampaigns } from "./components/dashboard/MyCampaigns";
import { MySmsLogs } from "./components/dashboard/MySmsLogs";
import { MyApiKeys } from "./components/dashboard/MyApiKeys";
import { MyDevices } from "./components/dashboard/MyDevices";
import { AccountSettings } from "./components/dashboard/AccountSettings";

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

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/auth" element={<Auth />} />
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
