import { Hono } from "hono";
import { z } from "zod";
import { registerMerchantStore, signupErrorMessage } from "../lib/public-signup.js";
import { registerPublicPartnerRoutes, platformRefFromRequest } from "./platform-partners.js";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  storeName: z.string().min(1).max(120),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter country code (e.g. US, KG)")
    .optional()
    .default("US"),
  ref: z.string().max(40).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export const publicRoutes = new Hono();
registerPublicPartnerRoutes(publicRoutes);

publicRoutes.get("/status", async (c) => {
  const { prisma } = await import("@ugclab/database");
  const { isStripeConfigured } = await import("../lib/stripe.js");
  const { emailConfigured } = await import("../lib/platform-mailbox.js");
  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }
  return c.json({
    ok: database === "up",
    services: {
      api: "up",
      database,
      email: emailConfigured() ? "configured" : "not_configured",
      stripe: isStripeConfigured() ? "configured" : "not_configured",
    },
    updatedAt: new Date().toISOString(),
  });
});

publicRoutes.get("/captcha", async (c) => {
  const { platformTurnstileSiteKey } = await import("../lib/turnstile.js");
  return c.json({ turnstileSiteKey: platformTurnstileSiteKey() });
});

publicRoutes.post("/signup", async (c) => {
  try {
    const body = schema.parse(await c.req.json());
    const { requirePlatformTurnstile } = await import("../lib/turnstile.js");
    const captcha = await requirePlatformTurnstile(c, body);
    if (captcha) return captcha;
    const result = await registerMerchantStore({
      name: body.name,
      email: body.email,
      password: body.password,
      storeName: body.storeName,
      country: body.country ?? "US",
      ref: platformRefFromRequest(c, body.ref),
    });

    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ redirect: result.redirect });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.errors[0];
      const msg = first
        ? `${first.path.join(".") || "field"}: ${first.message}`
        : "Invalid input";
      return c.json({ error: msg }, 400);
    }
    const { status, error } = signupErrorMessage(err);
    if (status === 503) return c.json({ error }, 503);
    return c.json({ error }, 500);
  }
});
