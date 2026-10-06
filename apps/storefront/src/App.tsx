import { Route, Routes } from "react-router-dom";
import { StoreLayout } from "@/components/store-layout";
import { useTenantBootstrap } from "@/hooks/use-tenant-bootstrap";
import { HomePage } from "@/pages/HomePage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { ProductPage } from "@/pages/ProductPage";
import { CollectionsPage } from "@/pages/CollectionsPage";
import { CollectionPage } from "@/pages/CollectionPage";
import { AccountPage } from "@/pages/AccountPage";
import { AccountLoginPage } from "@/pages/AccountLoginPage";
import { AccountRegisterPage } from "@/pages/AccountRegisterPage";
import { AccountForgotPage } from "@/pages/AccountForgotPage";
import { AccountResetPage } from "@/pages/AccountResetPage";
import { SearchPage } from "@/pages/SearchPage";
import { GiftCardBalancePage } from "@/pages/GiftCardBalancePage";
import { OrderPage } from "@/pages/OrderPage";
import { ReturnRequestPage } from "@/pages/ReturnRequestPage";
import { PolicyPage } from "@/pages/PolicyPage";
import { WishlistPage } from "@/pages/WishlistPage";
import { CmsPage } from "@/pages/CmsPage";
import { BlogPage } from "@/pages/BlogPage";
import { BlogPostPage } from "@/pages/BlogPostPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  useTenantBootstrap();
  return (
    <Routes>
      <Route path="/" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="account/login" element={<AccountLoginPage />} />
        <Route path="account/register" element={<AccountRegisterPage />} />
        <Route path="account/forgot" element={<AccountForgotPage />} />
        <Route path="account/reset" element={<AccountResetPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="gift-card" element={<GiftCardBalancePage />} />
        <Route path="orders/:id" element={<OrderPage />} />
        <Route path="orders/:id/return" element={<ReturnRequestPage />} />
        <Route path="policies/:kind" element={<PolicyPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="pages/:slug" element={<CmsPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
