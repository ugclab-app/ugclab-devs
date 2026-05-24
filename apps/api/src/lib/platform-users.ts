import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import {
  prisma,
  UserAccountStatus,
  UserRole,
  type User,
} from "@ugclab/database";
import { getStorefrontUrl } from "./storefront.js";
import { logPlatformAudit } from "./platform-audit.js";
import { sendPasswordResetEmail } from "./user-admin-email.js";
import { MERCHANT_WEB_URL } from "../env.js";

function tempPassword() {
  return randomBytes(9).toString("base64url").slice(0, 12);
}

export function mapUserListRow(u: {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  accountStatus: UserAccountStatus;
  totpEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  tenants: { id: string; name: string; slug: string }[];
  _count: { tenants: number };
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    accountStatus: u.accountStatus,
    totpEnabled: u.totpEnabled,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    stores: u.tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      storefrontUrl: getStorefrontUrl(t.slug),
    })),
    storeCount: u._count.tenants,
  };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenants: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      tenantMembers: {
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      accounts: {
        select: { provider: true, providerAccountId: true, type: true },
      },
    },
  });
  if (!user) return null;

  const audits = await prisma.platformAuditLog.findMany({
    where: { targetUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
    bannedAt: user.bannedAt?.toISOString() ?? null,
    country: user.country,
    timezone: user.timezone,
    totpEnabled: user.totpEnabled,
    requireAdmin2fa: user.requireAdmin2fa,
    hasPassword: Boolean(user.passwordHash),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    sessionVersion: user.sessionVersion,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    ownedStores: user.tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      storefrontUrl: getStorefrontUrl(t.slug),
      createdAt: t.createdAt.toISOString(),
    })),
    memberships: user.tenantMembers.map((m) => ({
      id: m.id,
      role: m.role,
      email: m.email,
      tenant: m.tenant,
      acceptedAt: m.acceptedAt?.toISOString() ?? null,
    })),
    oauthAccounts: user.accounts.map((a) => ({
      provider: a.provider,
      providerAccountId: a.providerAccountId,
      type: a.type,
    })),
    recentPlatformAudit: audits.map((a) => ({
      id: a.id,
      action: a.action,
      actorEmail: a.actorEmail,
      summary: a.summary,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function resetUserPassword(
  target: User,
  actor: { id: string; email: string }
) {
  const temporaryPassword = tempPassword();
  const passwordHash = await hash(temporaryPassword, 12);
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });
  const emailSent = await sendPasswordResetEmail({
    to: target.email,
    temporaryPassword,
  });
  await logPlatformAudit({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "user.password_reset",
    targetUserId: target.id,
    summary: `Password reset for ${target.email}`,
    meta: { emailSent },
  });
  return { emailSent, temporaryPassword: emailSent ? undefined : temporaryPassword };
}

export async function createImpersonationUrl(
  target: User,
  actor: { id: string; email: string }
) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.verificationToken.create({
    data: {
      identifier: `impersonate:${token}`,
      token: target.id,
      expires,
    },
  });
  await logPlatformAudit({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "user.impersonate",
    targetUserId: target.id,
    summary: `Impersonation link issued for ${target.email}`,
  });
  return `${MERCHANT_WEB_URL}/login?impersonate=${token}`;
}

export async function revokeUserSessions(
  target: User,
  actor: { id: string; email: string }
) {
  await prisma.user.update({
    where: { id: target.id },
    data: { sessionVersion: { increment: 1 } },
  });
  await logPlatformAudit({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "user.revoke_sessions",
    targetUserId: target.id,
    summary: `Revoked all sessions for ${target.email}`,
  });
}
