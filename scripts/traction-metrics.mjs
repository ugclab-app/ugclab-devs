// Read-only traction snapshot for the investor deck.
// Usage: node scripts/traction-metrics.mjs [--local]   (default: production via DATABASE_URL_VERCEL)
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(resolve(root, ".env"), "utf8");
const pick = (key) => env.match(new RegExp(`^${key}="([^"]+)"`, "m"))?.[1];
const url = process.argv.includes("--local") ? pick("DATABASE_URL") : pick("DATABASE_URL_VERCEL");
if (!url) {
  console.error("No URL");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const num = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])));

try {
  const tenants = num(await prisma.$queryRaw`
    SELECT
      count(*)                                                        AS total,
      count(*) FILTER (WHERE t.status = 'ACTIVE')                     AS active,
      count(*) FILTER (WHERE t."createdAt" > now() - interval '30 days') AS new_30d,
      count(*) FILTER (WHERE t."subscriptionStatus" = 'active' AND p."priceMonthly" > 0) AS paying,
      coalesce(sum(p."priceMonthly") FILTER (WHERE t."subscriptionStatus" = 'active'), 0) AS mrr_cents
    FROM "Tenant" t LEFT JOIN "SubscriptionPlan" p ON p.id = t."subscriptionPlanId"`)[0];

  const sellers = num(await prisma.$queryRaw`
    SELECT
      count(DISTINCT "tenantId")                                                          AS with_sale,
      count(DISTINCT "tenantId") FILTER (WHERE "createdAt" > now() - interval '30 days')  AS with_sale_30d
    FROM "Order" WHERE status IN ('PAID', 'FULFILLED')`)[0];

  const gmv = num(await prisma.$queryRaw`
    SELECT currency, count(*) AS orders, sum("totalAmount") AS cents,
           sum("totalAmount") FILTER (WHERE "createdAt" > now() - interval '30 days') AS cents_30d
    FROM "Order" WHERE status IN ('PAID', 'FULFILLED')
    GROUP BY currency ORDER BY cents DESC`);

  const monthly = num(await prisma.$queryRaw`
    SELECT to_char(m, 'YYYY-MM') AS month,
      (SELECT count(*) FROM "Tenant" WHERE date_trunc('month', "createdAt") = m) AS new_stores,
      (SELECT count(*) FROM "Order" WHERE status IN ('PAID', 'FULFILLED') AND date_trunc('month', "createdAt") = m) AS paid_orders,
      (SELECT coalesce(sum("totalAmount"), 0) FROM "Order" WHERE status IN ('PAID', 'FULFILLED') AND date_trunc('month', "createdAt") = m) AS gmv_cents
    FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m
    ORDER BY m`);

  const plans = num(await prisma.$queryRaw`
    SELECT coalesce(p.name, '(none)') AS plan, coalesce(t."subscriptionStatus", '-') AS status, count(*) AS stores
    FROM "Tenant" t LEFT JOIN "SubscriptionPlan" p ON p.id = t."subscriptionPlanId"
    GROUP BY 1, 2 ORDER BY 3 DESC`);

  console.log("STORES", tenants);
  console.log("SELLERS", sellers);
  console.log("GMV by currency (cents)");
  console.table(gmv);
  console.log("Last 6 months");
  console.table(monthly);
  console.log("Plans");
  console.table(plans);
} finally {
  await prisma.$disconnect();
}
