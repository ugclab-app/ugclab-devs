import "./env.js";
import { serve } from "@hono/node-server";
import { runScheduledJobs } from "./jobs/scheduled.js";
import { app } from "./app.js";
import { PORT } from "./env.js";

console.log(`API http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });

if (process.env.ENABLE_CRON !== "false" && !process.env.VERCEL) {
  setInterval(() => {
    runScheduledJobs().catch((e) => console.error("[cron]", e));
  }, 60_000);
}
