import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  AffiliateCommissionStatus,
  AffiliatePartnerStatus,
  prisma,
} from "@ugclab/database";
import { merchantNetFromOrder } from "./merchant-balance.js";
import {
  PLATFORM_FLAG_AFFILIATES_DISABLED,
  tenantHasPlatformFlag,
} from "./platform-tenant-flags.js";

export function affiliateCookieName(tenantSlug: string) {
  return `ugclab_ref_${tenantSlug.toLowerCase()}`;
}

export function normalizeAffiliateCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function slugifyAffiliateCodeFromName(name: string): string {
  const base = normalizeAffiliateCode(name);
  return base || "partner";
}

export async function getAffiliateProgramSettings(tenantId: string) {
  return prisma.affiliateProgramSettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

export async function resolveAffiliatePartner(
  tenantId: string,
  code: string,
  buyerEmail?: string | null
) {
  const settings = await getAffiliateProgramSettings(tenantId);
  if (!settings.enabled) return null;
  if (await tenantHasPlatformFlag(tenantId, PLATFORM_FLAG_AFFILIATES_DISABLED)) {
    return null;
  }

  const norm = normalizeAffiliateCode(code);
  if (!norm) return null;

  const partner = await prisma.affiliatePartner.findUnique({
    where: { tenantId_code: { tenantId, code: norm } },
  });
  if (!partner || partner.status !== AffiliatePartnerStatus.ACTIVE) {
    return null;
  }

  const email = buyerEmail?.trim().toLowerCase();
  if (email && partner.email?.trim().toLowerCase() === email) {
    return null;
  }

  return partner;
}

export function readAffiliateCodeFromRequest(
  c: Context,
  tenantSlug: string,
  bodyCode?: string | null
): string | null {
  const fromBody = bodyCode?.trim();
  if (fromBody) return fromBody;
  const cookie = getCookie(c, affiliateCookieName(tenantSlug));
  return cookie?.trim() || null;
}

export function setAffiliateAttributionCookie(
  c: Context,
  tenantSlug: string,
  code: string,
  cookieDays: number
) {
  const maxAge = Math.max(1, Math.min(90, cookieDays)) * 86400;
  const secure = process.env.NODE_ENV === "production";
  setCookie(c, affiliateCookieName(tenantSlug), normalizeAffiliateCode(code), {
    path: "/",
    maxAge,
    httpOnly: true,
    sameSite: "Lax",
    secure,
  });
}

export async function resolveAffiliatePartnerIdForOrder(
  c: Context,
  tenantId: string,
  tenantSlug: string,
  buyerEmail: string,
  bodyCode?: string | null
): Promise<string | null> {
  const code = readAffiliateCodeFromRequest(c, tenantSlug, bodyCode);
  if (!code) return null;
  const partner = await resolveAffiliatePartner(tenantId, code, buyerEmail);
  return partner?.id ?? null;
}

export async function createAffiliateCommissionForPaidOrder(
  orderId: string,
  platformFeeAmount: number
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      tenantId: true,
      affiliatePartnerId: true,
      totalAmount: true,
      affiliateCommission: { select: { id: true } },
    },
  });
  if (!order?.affiliatePartnerId || order.affiliateCommission) return;

  const [partner, settings] = await Promise.all([
    prisma.affiliatePartner.findUnique({
      where: { id: order.affiliatePartnerId },
    }),
    getAffiliateProgramSettings(order.tenantId),
  ]);
  if (!partner || partner.status !== AffiliatePartnerStatus.ACTIVE) return;
  if (!settings.enabled) return;
  if (await tenantHasPlatformFlag(order.tenantId, PLATFORM_FLAG_AFFILIATES_DISABLED)) {
    return;
  }

  const bps = partner.commissionBps ?? settings.defaultCommissionBps;
  const merchantNet = merchantNetFromOrder(order.totalAmount, platformFeeAmount);
  const commissionCents = Math.floor((merchantNet * bps) / 10000);
  if (commissionCents <= 0) return;

  await prisma.$transaction([
    prisma.affiliateCommission.create({
      data: {
        tenantId: order.tenantId,
        partnerId: partner.id,
        orderId: order.id,
        orderTotalCents: order.totalAmount,
        merchantNetCents: merchantNet,
        commissionBps: bps,
        commissionCents,
        status: AffiliateCommissionStatus.APPROVED,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { affiliateCommissionCents: commissionCents },
    }),
  ]);
}

export async function voidAffiliateCommissionForOrder(orderId: string) {
  const row = await prisma.affiliateCommission.findUnique({
    where: { orderId },
  });
  if (!row || row.status === AffiliateCommissionStatus.VOID) return;

  await prisma.$transaction([
    prisma.affiliateCommission.update({
      where: { id: row.id },
      data: { status: AffiliateCommissionStatus.VOID },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { affiliateCommissionCents: 0 },
    }),
  ]);
}

export async function sumOwedToCreatorsCents(tenantId: string) {
  const agg = await prisma.affiliateCommission.aggregate({
    where: {
      tenantId,
      status: AffiliateCommissionStatus.APPROVED,
    },
    _sum: { commissionCents: true },
  });
  return agg._sum.commissionCents ?? 0;
}
