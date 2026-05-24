import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  envPrefix: ["VITE_", "STOREFRONT_"],
  plugins: [react(), tailwindcss()],
  resolve: {
    conditions: ["development", "import", "module", "browser", "default"],
    alias: [
      {
        find: "@ugclab/i18n/store-currency",
        replacement: path.resolve(
          __dirname,
          "../../packages/i18n/src/store-currency.ts"
        ),
      },
      {
        find: "@ugclab/tenant/store-theme",
        replacement: path.resolve(
          __dirname,
          "../../packages/tenant/src/store-theme.ts"
        ),
      },
      {
        find: "@ugclab/tenant/block-style",
        replacement: path.resolve(
          __dirname,
          "../../packages/tenant/src/block-style.ts"
        ),
      },
      {
        find: "@ugclab/i18n",
        replacement: path.resolve(__dirname, "../../packages/i18n/src/index.ts"),
      },
      { find: "@ugclab/ui", replacement: path.resolve(__dirname, "../../packages/ui/src") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
