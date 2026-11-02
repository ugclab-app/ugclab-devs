import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { usePlatformLocale } from "@/i18n/locale";
import { PlatformLayout } from "@/layout/PlatformLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import TrafficPage from "@/pages/TrafficPage";
import TenantsPage from "@/pages/TenantsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import PlansPage from "@/pages/PlansPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/UserDetailPage";
import PayoutsPage from "@/pages/PayoutsPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import LocalPaymentsPage from "@/pages/LocalPaymentsPage";
import ActivityPage from "@/pages/ActivityPage";
import RevenuePage from "@/pages/RevenuePage";
import DisputesPage from "@/pages/DisputesPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import ThemesPage from "@/pages/ThemesPage";
import BlocksPage from "@/pages/BlocksPage";
import SectionsPage from "@/pages/SectionsPage";
import EmailTemplatesPage from "@/pages/EmailTemplatesPage";
import OutreachPage from "@/pages/OutreachPage";
import GrowthPage from "@/pages/GrowthPage";
import InstagramPage from "@/pages/InstagramPage";
import DomainsPage from "@/pages/DomainsPage";
import AffiliatesPage from "@/pages/AffiliatesPage";
import PlatformPartnersPage from "@/pages/PlatformPartnersPage";
import MarketingPage from "@/pages/MarketingPage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import MerchantMessagesPage from "@/pages/MerchantMessagesPage";
import ReportsPage from "@/pages/ReportsPage";
import CreateTenantPage from "@/pages/CreateTenantPage";
import ReconcilePage from "@/pages/ReconcilePage";
import PaymentErrorsPage from "@/pages/PaymentErrorsPage";
import PastDuePage from "@/pages/PastDuePage";
import BuyersPage from "@/pages/BuyersPage";
import ChangelogPage from "@/pages/ChangelogPage";
import InboxPage from "@/pages/InboxPage";
import MailPage from "@/pages/MailPage";
import SearchPage from "@/pages/SearchPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import ModerationPage from "@/pages/ModerationPage";
import CompliancePage from "@/pages/CompliancePage";
import KycPage from "@/pages/KycPage";
import SystemPage from "@/pages/SystemPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = usePlatformLocale();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        {t.loading}
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
        <Route path="traffic" element={<TrafficPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="mail" element={<MailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="reconcile" element={<ReconcilePage />} />
        <Route path="payment-errors" element={<PaymentErrorsPage />} />
        <Route path="billing" element={<PastDuePage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/new" element={<CreateTenantPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="payments-local" element={<LocalPaymentsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="buyers" element={<BuyersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="domains" element={<DomainsPage />} />
        <Route path="affiliates" element={<AffiliatesPage />} />
        <Route path="platform-partners" element={<PlatformPartnersPage />} />
        <Route path="themes" element={<ThemesPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="blocks" element={<BlocksPage />} />
        <Route path="sections" element={<SectionsPage />} />
        <Route path="email-templates" element={<EmailTemplatesPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
        <Route path="outreach" element={<OutreachPage />} />
        <Route path="growth" element={<GrowthPage />} />
        <Route path="instagram" element={<InstagramPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="merchant-messages" element={<MerchantMessagesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="system" element={<SystemPage />} />
      </Route>
    </Routes>
  );
}
