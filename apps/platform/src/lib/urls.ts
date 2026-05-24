export const merchantAdminUrl =
  import.meta.env.VITE_MERCHANT_ADMIN_URL ??
  (import.meta.env.PROD ? "https://admin.tescommerce.com" : "http://localhost:3001");
