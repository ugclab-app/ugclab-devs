import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { AdminLayout } from "@/layout/AdminLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductNewPage from "@/pages/ProductNewPage";
import ProductEditPage from "@/pages/ProductEditPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import CustomersPage from "@/pages/CustomersPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import CollectionsPage from "@/pages/CollectionsPage";
import CollectionEditPage from "@/pages/CollectionEditPage";
import ShippingPage from "@/pages/ShippingPage";
import DiscountsPage from "@/pages/DiscountsPage";
import PagesPage from "@/pages/PagesPage";
import ReviewsPage from "@/pages/ReviewsPage";
import DraftOrdersPage from "@/pages/DraftOrdersPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import PromotionsPage from "@/pages/PromotionsPage";
import StorefrontPage from "@/pages/StorefrontPage";
import PageEditPage from "@/pages/PageEditPage";
import PageBuilderPage from "@/pages/PageBuilderPage";
import ReportsPage from "@/pages/ReportsPage";
import AbandonedCartsPage from "@/pages/AbandonedCartsPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import CustomerSegmentsPage from "@/pages/CustomerSegmentsPage";
import MarketingPage from "@/pages/MarketingPage";
import PaymentsPage from "@/pages/PaymentsPage";
import { PermissionGate } from "@/components/permission-gate";
import NoStorePage from "@/pages/NoStorePage";
import HelpPage from "@/pages/HelpPage";
import GrowthPage from "@/pages/GrowthPage";
import InventoryPage from "@/pages/InventoryPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, tenant, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!tenant) return <Navigate to="/no-store" replace />;
  return <>{children}</>;
}

function ProtectedUser({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
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
        path="/no-store"
        element={
          <ProtectedUser>
            <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
              <NoStorePage />
            </div>
          </ProtectedUser>
        }
      />
      <Route
        path="/*"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductNewPage />} />
        <Route path="products/:id/edit" element={<ProductEditPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="storefront" element={<PermissionGate perm="storefront"><StorefrontPage /></PermissionGate>} />
        <Route path="reports" element={<PermissionGate perm="reports"><ReportsPage /></PermissionGate>} />
        <Route path="abandoned-carts" element={<PermissionGate perm="abandoned-carts"><AbandonedCartsPage /></PermissionGate>} />
        <Route path="activity-log" element={<PermissionGate perm="activity-log"><ActivityLogPage /></PermissionGate>} />
        <Route path="customers/segments" element={<PermissionGate perm="customers"><CustomerSegmentsPage /></PermissionGate>} />
        <Route path="payments" element={<PermissionGate perm="payments"><PaymentsPage /></PermissionGate>} />
        <Route path="marketing" element={<PermissionGate perm="marketing"><MarketingPage /></PermissionGate>} />
        <Route path="growth" element={<PermissionGate perm="growth"><GrowthPage /></PermissionGate>} />
        <Route path="pages/:id/edit" element={<PermissionGate perm="pages"><PageEditPage /></PermissionGate>} />
        <Route path="pages/:id/builder" element={<PermissionGate perm="pages"><PageBuilderPage /></PermissionGate>} />
        <Route path="settings" element={<PermissionGate perm="settings"><SettingsPage /></PermissionGate>} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:id" element={<CollectionEditPage />} />
        <Route path="shipping" element={<ShippingPage />} />
        <Route path="inventory" element={<PermissionGate perm="products"><InventoryPage /></PermissionGate>} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="pages" element={<PagesPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="draft-orders" element={<DraftOrdersPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
    </Routes>
  );
}
