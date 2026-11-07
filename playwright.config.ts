import { defineConfig } from "@playwright/test";

const API = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`;

/**
 * Narrow smoke suite (API request-level). Requires API + seeded demo tenant.
 * Run: npm run e2e:smoke
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: API,
    extraHTTPHeaders: { "Content-Type": "application/json" },
  },
  projects: [{ name: "api-smoke", testMatch: /.*\.smoke\.spec\.ts/ }],
});
