/**
 * Local DB + optional prod health check.
 * Run: npm run supabase:verify
 * Prod: SUPABASE_VERIFY_PROD=1 npm run supabase:verify
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env"), override: true });

function normalize(url) {
  if (!url) return url;
  if (/[?&]sslmode=/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

const url = normalize(process.env.DATABASE_URL?.trim());
if (!url) {
  console.error("FAIL: DATABASE_URL missing");
  process.exit(1);
}

const host = url.match(/@([^/]+)/)?.[1] ?? "?";
const isPooler6543 = url.includes(":6543");
const isSupabase = url.includes("pooler.supabase.com") || url.includes("supabase.co");

console.log("DATABASE_URL host:", host);
console.log("Supabase pooler :6543:", isPooler6543 ? "yes" : "NO — use transaction pooler for Vercel");

let ok = true;

const t0 = Date.now();
try {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, {
    ssl: "require",
    prepare: false,
    max_pipeline: 0,
    max: 1,
    connect_timeout: 15,
  });
  await sql`SELECT 1 AS ok`;
  await sql.end({ timeout: 2 });
  console.log(`OK  local postgres.js (${Date.now() - t0}ms)`);
} catch (e) {
  ok = false;
  console.error(`FAIL local (${Date.now() - t0}ms):`, e.message?.slice(0, 200));
}

const checkProd =
  process.argv.includes("--prod") || process.env.SUPABASE_VERIFY_PROD === "1";

if (checkProd) {
  const prodUrl =
    process.env.SUPABASE_VERIFY_PROD_URL?.trim() ||
    "https://tescommerce.com/api/health/ready";
  const pingUrl = prodUrl.replace("/health/ready", "/health/ping");
  try {
    const pingRes = await fetch(pingUrl, { signal: AbortSignal.timeout(10_000) });
    const pingText = await pingRes.text();
    console.log(`prod ping ${pingRes.status}:`, pingText.slice(0, 120));
  } catch (e) {
    console.warn("prod ping failed:", e.message);
  }
  const t1 = Date.now();
  try {
    const res = await fetch(prodUrl, { signal: AbortSignal.timeout(35_000) });
    const text = await res.text();
    console.log(`prod ${res.status} (${Date.now() - t1}ms):`, text.slice(0, 200));
    if (res.ok && text.includes('"db":true')) {
      console.log("prod DB ready: OK");
    } else {
      if (res.status === 504 || text.includes("TIMEOUT")) {
        console.error(
          "prod health/ready: TIMEOUT — integration OK but Node cannot reach pooler. Next: Supabase Add-ons → IPv4 (~$4/mo), redeploy. See docs/SUPABASE-PRODUCTION.md"
        );
        console.error("Also test: https://admin.tescommerce.com/login");
      }
      ok = false;
    }
  } catch (e) {
    ok = false;
    console.error(`FAIL prod (${Date.now() - t1}ms):`, e.message);
  }
} else {
  console.log("(Skip prod — set SUPABASE_VERIFY_PROD=1 to check tescommerce.com)");
}

if (!isSupabase) {
  console.warn("WARN: DATABASE_URL does not look like Supabase");
}

process.exit(ok ? 0 : 1);
