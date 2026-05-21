import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@ugclab/database",
    "@ugclab/ui",
    "@ugclab/i18n",
    "@ugclab/tenant",
  ],
};

export default nextConfig;
