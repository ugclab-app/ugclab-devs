import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./routes/auth.js";
import { merchant } from "./routes/merchant.js";
import { p1 } from "./routes/merchant-p1.js";
import { p15 } from "./routes/merchant-p15.js";
import { p2 } from "./routes/merchant-p2.js";
import { p3 } from "./routes/merchant-p3.js";
import { p4 } from "./routes/merchant-p4.js";
import { p5 } from "./routes/merchant-p5.js";
import { p6 } from "./routes/merchant-p6.js";
import { p7 } from "./routes/merchant-p7.js";
import { marketing } from "./routes/merchant-marketing.js";
import { marketingPublic } from "./routes/marketing-public.js";
import { platform } from "./routes/platform.js";
import { publicRoutes } from "./routes/public.js";
import { files } from "./routes/files.js";
import { store } from "./routes/storefront.js";
import { stripeRoutes, merchantStripe } from "./routes/stripe.js";
import { MERCHANT_WEB_URL, PLATFORM_ADMIN_URL, PLATFORM_URL } from "./env.js";
import { merchantMaintenanceGuard } from "./middleware/maintenance.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: (origin) => {
        const allowed = [
          MERCHANT_WEB_URL,
          PLATFORM_ADMIN_URL,
          PLATFORM_URL,
          process.env.STOREFRONT_URL ?? "http://localhost:3002",
          "https://tescommerce.com",
          "https://www.tescommerce.com",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3001",
          "http://localhost:3002",
          "http://127.0.0.1:3002",
          "http://localhost:3003",
          "http://127.0.0.1:3003",
        ];
        if (!origin || allowed.includes(origin)) return origin ?? MERCHANT_WEB_URL;
        return MERCHANT_WEB_URL;
      },
      credentials: true,
    })
  );

  app.get("/health", (c) => c.json({ ok: true, service: "tescommerce-api" }));

  app.route("/api/public", publicRoutes);
  app.route("/api/marketing", marketingPublic);
  app.route("/api/stripe", stripeRoutes);
  app.route("/api/auth", authRoutes);
  app.use("/api/merchant/*", merchantMaintenanceGuard);
  app.route("/api/merchant", merchant);
  app.route("/api/merchant", p1);
  app.route("/api/merchant", p15);
  app.route("/api/merchant", p2);
  app.route("/api/merchant", p3);
  app.route("/api/merchant", p4);
  app.route("/api/merchant", p5);
  app.route("/api/merchant", p6);
  app.route("/api/merchant", p7);
  app.route("/api/merchant", marketing);
  app.route("/api/merchant/stripe", merchantStripe);
  app.route("/api/platform", platform);
  app.route("/api/files", files);
  app.route("/api/store", store);

  const landingRoot = (() => {
    const candidates = [
      join(process.cwd(), "public"),
      join(dirname(fileURLToPath(import.meta.url)), "..", "public"),
      join(process.cwd(), "apps", "api", "public"),
    ];
    for (const dir of candidates) {
      if (existsSync(join(dir, "index.html"))) return dir;
    }
    return candidates[0]!;
  })();

  app.use(
    "/*",
    serveStatic({
      root: landingRoot,
      rewriteRequestPath: (path) => {
        if (path.startsWith("/api")) return path;
        if (/\.[a-z0-9]+$/i.test(path)) return path;
        return "/index.html";
      },
    })
  );

  return app;
}

export const app = createApp();
