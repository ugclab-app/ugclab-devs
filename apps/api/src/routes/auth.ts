import { Hono } from "hono";
import { createHmac, randomBytes } from "crypto";
import { compare } from "bcryptjs";
import { UserAccountStatus, UserRole, prisma } from "@ugclab/database";
import { assertDatabaseReady, databaseTimeoutMessage } from "../lib/db-ready.js";
import { verifyTotp } from "../lib/totp.js";
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from "../lib/auth-token.js";
import { resolveSession, signSessionForUser } from "../lib/session-resolve.js";
import { getPlatformSettings } from "../lib/platform-settings.js";
import { isPlatformStaff } from "../lib/platform-permissions.js";
import {
  getTenantForUser,
  listStoresForUser,
  userCanAccessTenant,
} from "../lib/merchant.js";
import { createStoreForOwner, signupErrorMessage } from "../lib/public-signup.js";
import { getStorefrontDisplayHost, getStorefrontUrl } from "../lib/storefront.js";
import { getAuthSecret, MERCHANT_WEB_URL } from "../env.js";
import { registerAuthPartnerRoutes, platformRefFromRequest } from "./platform-partners.js";

export const authRoutes = new Hono();
registerAuthPartnerRoutes(authRoutes);

function tenantPayload(tenant: {
  id: string;
  name: string;
  slug: string;
  settings: unknown;
}) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    settings: tenant.settings,
    storefrontUrl: getStorefrontUrl(tenant.slug),
    displayHost: getStorefrontDisplayHost(tenant.slug),
  };
}

authRoutes.post("/login", async (c) => {
  try {
    await assertDatabaseReady(8_000);
  } catch (err) {
    if (err instanceof Error && err.message === "DATABASE_TIMEOUT") {
      return c.json(
        {
          error: databaseTimeoutMessage(),
          hint: "Vercel cannot reach Supabase over TCP — use Prisma Accelerate: docs/PRISMA-ACCELERATE.md",
        },
        503
      );
    }
    throw err;
  }

  const body = await c.req.json<{
    email?: string;
    password?: string;
    totpCode?: string;
    rememberMe?: boolean;
  }>();
  const email = String(body.email ?? "")
    .toLowerCase()
    .trim();
  const password = String(body.password ?? "");
  const rememberMe = body.rememberMe === true;

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

  const totpCode = String(body.totpCode ?? "").trim();
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

  const tenant = await getTenantForUser(user.id);
  const token = await signSessionForUser(
    user,
    undefined,
    tenant?.id,
    { remember: rememberMe }
  );
  setSessionCookie(c, token, { remember: rememberMe });

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tenant: tenant ? tenantPayload(tenant) : null,
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

  const tenant = await getTenantForUser(session.sub, session.tid);
  return c.json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
      impersonatedBy: session.impEmail ?? null,
    },
    tenant: tenant ? tenantPayload(tenant) : null,
  });
});

authRoutes.get("/stores", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const session = await resolveSession(token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const stores = await listStoresForUser(session.sub);
  const activeId = session.tid ?? (await getTenantForUser(session.sub))?.id ?? null;
  return c.json({
    stores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      role: s.role,
      displayHost: getStorefrontDisplayHost(s.slug),
    })),
    activeTenantId: activeId,
  });
});

authRoutes.post("/switch-store", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const session = await resolveSession(token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ tenantId?: string }>();
  const tenantId = String(body.tenantId ?? "").trim();
  if (!tenantId) return c.json({ error: "tenantId required" }, 400);

  const allowed = await userCanAccessTenant(session.sub, tenantId);
  if (!allowed) return c.json({ error: "Store not found" }, 404);

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const tenant = await getTenantForUser(user.id, tenantId);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const newToken = await signSessionForUser(
    user,
    session.impBy && session.impEmail
      ? { id: session.impBy, email: session.impEmail }
      : undefined,
    tenant.id
  );
  setSessionCookie(c, newToken);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      impersonatedBy: session.impEmail ?? null,
    },
    tenant: tenantPayload(tenant),
  });
});

authRoutes.post("/create-store", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const session = await resolveSession(token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ storeName?: string; country?: string; ref?: string }>();
  const storeName = String(body.storeName ?? "").trim();
  if (!storeName) return c.json({ error: "Store name required" }, 400);

  try {
    const result = await createStoreForOwner({
      userId: session.sub,
      storeName,
      country: body.country,
      ref: platformRefFromRequest(c, body.ref),
    });
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400 | 402 | 404);
    }

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const tenant = await getTenantForUser(user.id, result.tenant.id);
    if (!tenant) return c.json({ error: "Store created but not accessible" }, 500);

    const newToken = await signSessionForUser(
      user,
      session.impBy && session.impEmail
        ? { id: session.impBy, email: session.impEmail }
        : undefined,
      tenant.id
    );
    setSessionCookie(c, newToken);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        impersonatedBy: session.impEmail ?? null,
      },
      tenant: tenantPayload(tenant),
    });
  } catch (err) {
    const { status, error } = signupErrorMessage(err);
    return c.json({ error }, status as 500 | 503);
  }
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

  const tenant = await getTenantForUser(target.id);
  const token = await signSessionForUser(
    target,
    audit
      ? { id: audit.actorUserId, email: audit.actorEmail }
      : { id: "platform", email: "platform@admin" },
    tenant?.id
  );
  setSessionCookie(c, token);

  return c.json({
    user: {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      impersonatedBy: audit?.actorEmail ?? null,
    },
    tenant: tenant ? tenantPayload(tenant) : null,
  });
});

function googleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function googleRedirectUri(): string {
  const apiBase = (
    process.env.API_PUBLIC_URL ??
    process.env.API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
  return `${apiBase}/api/auth/google/callback`;
}

function signOAuthState(): string {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", getAuthSecret())
    .update(`google:${nonce}`)
    .digest("hex")
    .slice(0, 24);
  return `${nonce}.${sig}`;
}

function verifyOAuthState(state: string): boolean {
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return false;
  const expected = createHmac("sha256", getAuthSecret())
    .update(`google:${nonce}`)
    .digest("hex")
    .slice(0, 24);
  return sig === expected;
}

authRoutes.get("/google", async (c) => {
  if (!googleOAuthConfigured()) {
    return c.json(
      {
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      },
      503
    );
  }
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const state = signOAuthState();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return c.redirect(url.toString());
});

authRoutes.get("/google/callback", async (c) => {
  const merchantWeb = MERCHANT_WEB_URL.replace(/\/$/, "");
  const fail = (msg: string) =>
    c.redirect(
      `${merchantWeb}/login?oauth_error=${encodeURIComponent(msg)}`
    );

  if (!googleOAuthConfigured()) {
    return fail("Google OAuth is not configured");
  }

  const code = c.req.query("code");
  const state = c.req.query("state") ?? "";
  if (!code || !verifyOAuthState(state)) {
    return fail("Invalid OAuth state");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return fail("Google token exchange failed");
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail("Google token missing");

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) return fail("Could not load Google profile");
  const profile = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  const email = String(profile.email ?? "")
    .toLowerCase()
    .trim();
  const providerAccountId = String(profile.sub ?? "").trim();
  if (!email || !providerAccountId) return fail("Google account has no email");
  if (profile.email_verified === false) {
    return fail("Google email is not verified");
  }

  let account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId,
      },
    },
    include: { user: true },
  });

  let user = account?.user ?? null;
  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name?.trim() || null,
          avatarUrl: profile.picture ?? null,
          passwordHash: null,
          role: UserRole.MERCHANT,
        },
      });
    }
    try {
      account = await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId,
          access_token: tokens.access_token,
          token_type: "Bearer",
          scope: "openid email profile",
        },
        include: { user: true },
      });
      user = account.user;
    } catch {
      const existing = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId,
          },
        },
        include: { user: true },
      });
      if (!existing) return fail("Could not link Google account");
      user = existing.user;
    }
  }

  if (user.accountStatus === UserAccountStatus.BANNED) {
    return fail("Account suspended");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(profile.name && !user.name ? { name: profile.name.trim() } : {}),
      ...(profile.picture && !user.avatarUrl
        ? { avatarUrl: profile.picture }
        : {}),
    },
  });

  const tenant = await getTenantForUser(user.id);
  const sessionToken = await signSessionForUser(user, undefined, tenant?.id);
  return c.redirect(
    `${merchantWeb}/login?oauth=${encodeURIComponent(sessionToken)}`
  );
});

authRoutes.post("/oauth/complete", async (c) => {
  const body = await c.req.json<{ token?: string }>();
  const token = String(body.token ?? "").trim();
  if (!token) return c.json({ error: "token required" }, 400);
  const session = await resolveSession(token);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Account suspended" }, 403);
  }

  setSessionCookie(c, token);
  const tenant = await getTenantForUser(user.id, session.tid);
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tenant: tenant ? tenantPayload(tenant) : null,
  });
});

authRoutes.get("/oauth/providers", (c) => {
  return c.json({ google: googleOAuthConfigured() });
});

authRoutes.post("/forgot-password", async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({}));
  const email = String((body as { email?: string }).email ?? "")
    .toLowerCase()
    .trim();
  // Always OK — do not reveal whether the account exists
  const okResponse = () =>
    c.json({
      ok: true,
      message:
        "If an account exists for that email, we sent a reset link.",
    });

  if (!email || !email.includes("@")) return okResponse();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || user.accountStatus === UserAccountStatus.BANNED) {
    return okResponse();
  }

  const token = randomBytes(32).toString("hex");
  const identifier = `password-reset:${email}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const merchantWeb = MERCHANT_WEB_URL.replace(/\/$/, "");
  const resetUrl = `${merchantWeb}/reset-password?token=${encodeURIComponent(token)}`;
  const { sendForgotPasswordLinkEmail } = await import(
    "../lib/user-admin-email.js"
  );
  const sent = await sendForgotPasswordLinkEmail({ to: email, resetUrl });
  if (!sent && process.env.NODE_ENV !== "production") {
    console.info("[auth] forgot-password (no email provider) resetUrl=", resetUrl);
  }
  return okResponse();
});

authRoutes.post("/reset-password", async (c) => {
  const body = await c.req.json<{ token?: string; password?: string }>();
  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  if (!token) return c.json({ error: "Reset token required" }, 400);
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) {
    if (row) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    }
    return c.json({ error: "Invalid or expired reset link" }, 400);
  }
  if (!row.identifier.startsWith("password-reset:")) {
    return c.json({ error: "Invalid or expired reset link" }, 400);
  }
  const email = row.identifier.slice("password-reset:".length);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Invalid or expired reset link" }, 400);
  }

  const { hash } = await import("bcryptjs");
  const passwordHash = await hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: row.identifier },
  });

  return c.json({ ok: true, message: "Password updated. You can sign in." });
});

authRoutes.post("/magic-link", async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({}));
  const email = String((body as { email?: string }).email ?? "")
    .toLowerCase()
    .trim();
  const okResponse = () =>
    c.json({
      ok: true,
      message: "If an account exists for that email, we sent a sign-in link.",
    });

  if (!email || !email.includes("@")) return okResponse();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.accountStatus === UserAccountStatus.BANNED) {
    return okResponse();
  }

  const token = randomBytes(32).toString("hex");
  const identifier = `magic-link:${email}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const merchantWeb = MERCHANT_WEB_URL.replace(/\/$/, "");
  const magicUrl = `${merchantWeb}/login?magic=${encodeURIComponent(token)}`;
  const { sendMagicLinkEmail } = await import("../lib/user-admin-email.js");
  const sent = await sendMagicLinkEmail({ to: email, magicUrl });
  if (!sent && process.env.NODE_ENV !== "production") {
    console.info("[auth] magic-link (no email provider) magicUrl=", magicUrl);
  }
  return okResponse();
});

authRoutes.post("/magic-link/complete", async (c) => {
  const body = await c.req.json<{
    token?: string;
    totpCode?: string;
    rememberMe?: boolean;
  }>();
  const token = String(body.token ?? "").trim();
  const rememberMe = body.rememberMe === true;
  if (!token) return c.json({ error: "token required" }, 400);

  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) {
    if (row) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    }
    return c.json({ error: "Invalid or expired sign-in link" }, 400);
  }
  if (!row.identifier.startsWith("magic-link:")) {
    return c.json({ error: "Invalid or expired sign-in link" }, 400);
  }

  const email = row.identifier.slice("magic-link:".length);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Invalid or expired sign-in link" }, 400);
  }

  const totpCode = String(body.totpCode ?? "").trim();
  if (user.totpEnabled && user.totpSecret) {
    if (!totpCode) {
      return c.json({ requires2fa: true, email: user.email }, 200);
    }
    if (!verifyTotp(user.totpSecret, totpCode)) {
      return c.json({ error: "Invalid 2FA code" }, 401);
    }
  }

  await prisma.verificationToken.deleteMany({
    where: { identifier: row.identifier },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tenant = await getTenantForUser(user.id);
  const sessionToken = await signSessionForUser(
    user,
    undefined,
    tenant?.id,
    { remember: rememberMe }
  );
  setSessionCookie(c, sessionToken, { remember: rememberMe });

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    tenant: tenant ? tenantPayload(tenant) : null,
  });
});
