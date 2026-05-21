import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  envPrefix: ["VITE_", "STOREFRONT_"],
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "UGCLab Store",
        short_name: "Shop",
        description: "Shop on the go",
        theme_color: "#7c3aed",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ugclab/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@ugclab/i18n/store-currency": path.resolve(
        __dirname,
        "../../packages/i18n/src/store-currency.ts"
      ),
      "@ugclab/tenant/store-theme": path.resolve(
        __dirname,
        "../../packages/tenant/src/store-theme.ts"
      ),
    },
  },
  server: {
    port: 3002,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
