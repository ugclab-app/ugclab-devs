import { Hono } from "hono";
import { compare } from "bcryptjs";
import { prisma } from "@ugclab/database";
import { verifyTotp } from "../lib/totp.js";
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
  signSession,
  verifySession,
} from "../lib/auth-token.js";
import { getTenantForUser } from "../lib/merchant.js";
import { getStorefrontDisplayHost, getStorefrontUrl } from "../lib/storefront.js";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = String(body.email ?? "")
    .toLowerCase()
    .trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) return c.json({ error: "Invalid email or password" }, 401);

  const totpCode = String((body as { totpCode?: string }).totpCode ?? "").trim();
  if (user.totpEnabled && user.totpSecret) {
    if (!totpCode) {
      return c.json({ requires2fa: true, email: user.email }, 200);
    }
    if (!verifyTotp(user.totpSecret, totpCode)) {
      return c.json({ error: "Invalid 2FA code" }, 401);
    }
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  setSessionCookie(c, token);

  const tenant = await getTenantForUser(user.id);
  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          settings: tenant.settings,
          storefrontUrl: getStorefrontUrl(tenant.slug),
          displayHost: getStorefrontDisplayHost(tenant.slug),
        }
      : null,
  });
});

authRoutes.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ user: null, tenant: null });

  const session = await verifySession(token);
  if (!session) return c.json({ user: null, tenant: null });

  const tenant = await getTenantForUser(session.sub);
  return c.json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    },
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          settings: tenant.settings,
          storefrontUrl: getStorefrontUrl(tenant.slug),
          displayHost: getStorefrontDisplayHost(tenant.slug),
        }
      : null,
  });
});
