import "./env.js";
import { prisma } from "@ugclab/database";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { runScheduledJobs } from "./jobs/scheduled.js";
import { app as apiApp } from "./hono-app.js";
import { landingApp } from "./landing-app.js";
import { PORT } from "./env.js";

const app = new Hono();
// API before landing static /* — otherwise /api/* and /health return index.html locally
app.route("/", apiApp);
app.route("/", landingApp);

console.log(`API http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });

void prisma.$queryRaw`SELECT 1`.then(
  () => console.log("Database ready"),
  (err) => console.error("[dev] Database warm-up failed:", err)
);

if (process.env.ENABLE_CRON !== "false" && !process.env.VERCEL) {
  setInterval(() => {
    runScheduledJobs().catch((e) => console.error("[cron]", e));
  }, 60_000);
}
