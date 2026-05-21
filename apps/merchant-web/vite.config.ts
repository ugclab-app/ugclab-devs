import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  envPrefix: ["VITE_", "STOREFRONT_"],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ugclab/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@ugclab/tenant/store-theme": path.resolve(
        __dirname,
        "../../packages/tenant/src/store-theme.ts"
      ),
    },
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
