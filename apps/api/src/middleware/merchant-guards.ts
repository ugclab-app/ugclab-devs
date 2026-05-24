import type { Hono } from "hono";
import type { AuthEnv } from "./session.js";
import { requireTenant } from "../lib/merchant.js";
import {
  guardOrdersAccess,
  requireOwnerAccess,
  requireSensitive2fa,
} from "../lib/permissions.js";

export function useOrderRouteGuards(app: Hono<AuthEnv>) {
  app.use("/orders", orderGuard);
  app.use("/orders/*", orderGuard);
}

async function orderGuard(
  c: import("hono").Context<AuthEnv>,
  next: () => Promise<void>
) {
  const session = c.get("session");
  const { tenant } = await requireTenant(session);
  const gate = await guardOrdersAccess(session, tenant.id);
  if (!gate.ok) {
    return c.json(
      { error: gate.error, code: gate.code ?? "FORBIDDEN" },
      gate.status as 403
    );
  }
  await next();
}

export function useOwnerOnlyDomainGuards(app: Hono<AuthEnv>) {
  app.use("/domains", ownerGuard);
  app.use("/domains/*", ownerGuard);
}

async function ownerGuard(
  c: import("hono").Context<AuthEnv>,
  next: () => Promise<void>
) {
  const session = c.get("session");
  const { tenant } = await requireTenant(session);
  const gate = await requireOwnerAccess(session, tenant.id);
  if (!gate.ok) {
    return c.json({ error: gate.error }, gate.status as 403);
  }
  await next();
}

/** All Stripe/billing/payout routes are store-owner only. */
export function useOwnerOnlyStripeGuards(app: Hono<AuthEnv>) {
  app.use("*", ownerGuard);
}

export function usePayout2faGuards(app: Hono<AuthEnv>) {
  const paths = [
    "/mor-balance",
    "/mor-payout-request",
    "/mor-payouts/export.csv",
    "/payouts",
  ];
  for (const path of paths) {
    app.use(path, payout2faGuard);
  }
}

async function payout2faGuard(
  c: import("hono").Context<AuthEnv>,
  next: () => Promise<void>
) {
  const session = c.get("session");
  const tfa = await requireSensitive2fa(session, "payouts");
  if (!tfa.ok) {
    return c.json(
      { error: tfa.error, code: tfa.code ?? "2FA_REQUIRED" },
      tfa.status as 403
    );
  }
  await next();
}
