import { Hono } from "hono";
import { compare } from "bcryptjs";
import { UserAccountStatus, UserRole, prisma } from "@ugclab/database";
import { verifyTotp } from "../lib/totp.js";
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from "../lib/auth-token.js";
import { resolveSession, signSessionForUser } from "../lib/session-resolve.js";
import { getPlatformSettings } from "../lib/platform-settings.js";
import { isPlatformStaff } from "../lib/platform-permissions.js";
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
  if (user.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Account suspended" }, 403);
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

  const platformSettings = await getPlatformSettings();
  const require2fa =
    user.role === UserRole.SUPER_ADMIN &&
    (user.requireAdmin2fa || platformSettings.requireSuperAdmin2fa);
  if (require2fa && !user.totpEnabled) {
    return c.json(
      { error: "2FA is required for platform admin accounts" },
      403
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await signSessionForUser(user);
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

  const session = await resolveSession(token);
  if (!session) return c.json({ user: null, tenant: null });

  const tenant = await getTenantForUser(session.sub);
  return c.json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
      impersonatedBy: session.impEmail ?? null,
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

authRoutes.post("/impersonate", async (c) => {
  const body = await c.req.json<{ token?: string }>();
  const raw = String(body.token ?? "").trim();
  if (!raw) return c.json({ error: "Token required" }, 400);

  const row = await prisma.verificationToken.findFirst({
    where: { identifier: `impersonate:${raw}` },
  });
  if (!row || row.expires < new Date()) {
    return c.json({ error: "Invalid or expired impersonation link" }, 400);
  }

  const target = await prisma.user.findUnique({ where: { id: row.token } });
  if (!target) return c.json({ error: "User not found" }, 404);
  if (target.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Account suspended" }, 403);
  }
  if (isPlatformStaff(target.role)) {
    return c.json({ error: "Cannot impersonate platform staff" }, 403);
  }

  await prisma.verificationToken.deleteMany({
    where: { identifier: `impersonate:${raw}` },
  });

  await prisma.user.update({
    where: { id: target.id },
    data: { lastLoginAt: new Date() },
  });

  const audit = await prisma.platformAuditLog.findFirst({
    where: {
      targetUserId: target.id,
      action: "user.impersonate",
    },
    orderBy: { createdAt: "desc" },
  });

  const token = await signSessionForUser(
    target,
    audit
      ? { id: audit.actorUserId, email: audit.actorEmail }
      : { id: "platform", email: "platform@admin" }
  );
  setSessionCookie(c, token);

  const tenant = await getTenantForUser(target.id);
  return c.json({
    user: {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      impersonatedBy: audit?.actorEmail ?? null,
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
