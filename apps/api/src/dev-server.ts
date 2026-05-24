import "./env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { runScheduledJobs } from "./jobs/scheduled.js";
import { app as apiApp } from "./hono-app.js";
import { landingApp } from "./landing-app.js";
import { PORT } from "./env.js";

const app = new Hono();
app.route("/", landingApp);
app.route("/", apiApp);

console.log(`API http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });

if (process.env.ENABLE_CRON !== "false" && !process.env.VERCEL) {
  setInterval(() => {
    runScheduledJobs().catch((e) => console.error("[cron]", e));
  }, 60_000);
}
