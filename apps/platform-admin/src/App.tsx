import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { PlatformLayout } from "@/layout/PlatformLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import TenantsPage from "@/pages/TenantsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import PlansPage from "@/pages/PlansPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/UserDetailPage";
import PayoutsPage from "@/pages/PayoutsPage";
import OrdersPage from "@/pages/OrdersPage";
import ActivityPage from "@/pages/ActivityPage";
import RevenuePage from "@/pages/RevenuePage";
import DisputesPage from "@/pages/DisputesPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import ThemesPage from "@/pages/ThemesPage";
import DomainsPage from "@/pages/DomainsPage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import ReportsPage from "@/pages/ReportsPage";
import CreateTenantPage from "@/pages/CreateTenantPage";
import InboxPage from "@/pages/InboxPage";
import SearchPage from "@/pages/SearchPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import ModerationPage from "@/pages/ModerationPage";
import CompliancePage from "@/pages/CompliancePage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <PlatformLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/new" element={<CreateTenantPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="domains" element={<DomainsPage />} />
        <Route path="themes" element={<ThemesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="system" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
