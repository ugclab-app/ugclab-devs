import { useAdminLocale } from "@/context/admin-locale";

/** Merchant admin translations: `ta('ordersPage.title')`, `c.save`, etc. */
export function useAdminT() {
  return useAdminLocale();
}
