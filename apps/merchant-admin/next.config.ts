import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import path from "path";

// Load monorepo root .env (Next.js only auto-loads env from apps/merchant-admin/)
loadEnv({ path: path.resolve(__dirname, "../../.env") });

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
};

export default nextConfig;
