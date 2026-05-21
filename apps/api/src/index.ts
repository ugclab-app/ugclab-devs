import "./env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.js";
import { merchant } from "./routes/merchant.js";
import { p1 } from "./routes/merchant-p1.js";
import { p15 } from "./routes/merchant-p15.js";
import { p2 } from "./routes/merchant-p2.js";
import { p3 } from "./routes/merchant-p3.js";
import { p4 } from "./routes/merchant-p4.js";
import { p5 } from "./routes/merchant-p5.js";
import { marketing } from "./routes/merchant-marketing.js";
import { marketingPublic } from "./routes/marketing-public.js";
import { runScheduledJobs } from "./jobs/scheduled.js";
import { platform } from "./routes/platform.js";
import { files } from "./routes/files.js";
import { store } from "./routes/storefront.js";
import { stripeRoutes, merchantStripe } from "./routes/stripe.js";
import { MERCHANT_WEB_URL, PLATFORM_ADMIN_URL, PORT } from "./env.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        MERCHANT_WEB_URL,
        PLATFORM_ADMIN_URL,
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

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/marketing", marketingPublic);

app.route("/api/stripe", stripeRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/merchant", merchant);
app.route("/api/merchant", p1);
app.route("/api/merchant", p15);
app.route("/api/merchant", p2);
app.route("/api/merchant", p3);
app.route("/api/merchant", p4);
app.route("/api/merchant", p5);
app.route("/api/merchant", marketing);
app.route("/api/merchant/stripe", merchantStripe);
app.route("/api/platform", platform);
app.route("/api/files", files);
app.route("/api/store", store);

console.log(`API http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });

if (process.env.ENABLE_CRON !== "false") {
  setInterval(() => {
    runScheduledJobs().catch((e) => console.error("[cron]", e));
  }, 60_000);
}
