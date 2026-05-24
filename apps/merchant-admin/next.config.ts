import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import path from "path";

// Load monorepo root .env (Next.js only auto-loads env from apps/merchant-admin/)
loadEnv({ path: path.resolve(__dirname, "../../.env") });

const i18nSrc = path.join(__dirname, "../../packages/i18n/src/index.ts");
const i18nCurrencySrc = path.join(__dirname, "../../packages/i18n/src/store-currency.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@ugclab/database",
    "@ugclab/ui",
    "@ugclab/i18n",
    "@ugclab/tenant",
  ],
  turbopack: {
    resolveAlias: {
      "@ugclab/i18n": i18nSrc,
      "@ugclab/i18n/store-currency": i18nCurrencySrc,
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@ugclab/i18n": i18nSrc,
      "@ugclab/i18n/store-currency": i18nCurrencySrc,
    };
    return config;
  },
};

export default nextConfig;
