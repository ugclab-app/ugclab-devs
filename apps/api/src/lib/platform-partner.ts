import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { hash } from "bcryptjs";
import {
  OrderStatus,
  PlatformPartnerPayoutStatus,
  PlatformPartnerStatus,
  PlatformReferralKind,
  PlatformReferralStatus,
  prisma,
} from "@ugclab/database";
import { slugifyAffiliateCodeFromName } from "./affiliate.js";
import { sendEmail } from "./email.js";
import { PLATFORM_URL } from "../env.js";

export const PLATFORM_REF_COOKIE = "ugclab_platform_ref";
/** 20 bps = 0.2% of the paid order total. */
export const TURNOVER_COMMISSION_BPS = 20;

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.FULFILLED];

export function publicSiteUrl(): string {
  const configured = (process.env.PLATFORM_URL ?? PLATFORM_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const looksLocal = !configured || /localhost|127\.0\.0\.1/i.test(configured);
  if (process.env.VERCEL && looksLocal) return "https://tescommerce.com";
  return configured || "http://localhost:3000";
}

export function partnerSignupLink(code: string): string {
  return `${publicSiteUrl()}/signup?ref=${encodeURIComponent(code)}`;
}

export async function getPartnerProgram() {
  return prisma.platformPartnerProgram.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

function money(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

async function notify(to: string, subject: string, text: string) {
  try {
    await sendEmail({
      to,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
    });
  } catch (err) {
    console.error("[platform-partner] email", err);
  }
}

async function uniquePartnerCode(name: string): Promise<string> {
  const base = slugifyAffiliateCodeFromName(name).slice(0, 24) || "partner";
  let code = base;
  let n = 0;
  while (await prisma.platformPartner.findUnique({ where: { code }, select: { id: true } })) {
    n += 1;
    code = `${base}-${n}`.slice(0, 40);
  }
  return code;
}

function samePerson(
  partner: { email: string; userId: string | null },
  ownerEmail: string,
  ownerId: string
) {
  if (partner.userId && partner.userId === ownerId) return true;
  return partner.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}

export async function applyPlatformPartner(input: {
  name: string;
  email: string;
  password: string;
  pitch: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.platformPartner.findUnique({ where: { email } });
  if (existing) {
    return { ok: false as const, status: 409, error: "This email already applied" };
  }

  let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    const passwordHash = await hash(input.password, 8);
    user = await prisma.user.create({
      data: { email, name: input.name.trim(), passwordHash },
      select: { id: true },
    });
  }

  const code = await uniquePartnerCode(input.name);
  const partner = await prisma.platformPartner.create({
    data: {
      email,
      name: input.name.trim(),
      pitch: input.pitch.trim(),
      code,
      userId: user.id,
      status: PlatformPartnerStatus.PENDING,
    },
  });

  await notify(
    email,
    "Tescommerce partner application received",
    `Hi ${partner.name},\n\nWe received your partner application. You can sign in at the merchant admin while we review it. Your referral link goes live after approval.`
  );

  return { ok: true as const, status: partner.status };
}

export async function recordPartnerClick(
  c: Context,
  code: string,
  source?: string | null
) {
  const norm = code.trim().toLowerCase();
  if (!norm) return null;
  const partner = await prisma.platformPartner.findUnique({ where: { code: norm } });
  if (!partner || partner.status !== PlatformPartnerStatus.ACTIVE) return null;

  await prisma.platformPartnerClick.create({
    data: { partnerId: partner.id, source: source?.slice(0, 300) || null },
  });

  const program = await getPartnerProgram();
  const maxAge = Math.max(1, Math.min(365, program.cookieDays)) * 86400;
  const secure = process.env.NODE_ENV === "production";
  setCookie(c, PLATFORM_REF_COOKIE, partner.code, {
    path: "/",
    maxAge,
    httpOnly: false,
    sameSite: "Lax",
    secure,
  });
  return partner.code;
}

export function readPlatformRef(c: Context, bodyRef?: string | null): string | null {
  const fromBody = bodyRef?.trim();
  if (fromBody) return fromBody;
  return getCookie(c, PLATFORM_REF_COOKIE)?.trim() || null;
}

export async function attributePlatformPartner(opts: {
  tenantId: string;
  ownerEmail: string;
  ownerId: string;
  refCode: string | null | undefined;
}) {
  const code = opts.refCode?.trim().toLowerCase();
  if (!code) return;

  const partner = await prisma.platformPartner.findUnique({ where: { code } });
  if (!partner || partner.status !== PlatformPartnerStatus.ACTIVE) return;
  if (samePerson(partner, opts.ownerEmail, opts.ownerId)) return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    select: { id: true, name: true, platformPartnerId: true, trialEndsAt: true },
  });
  if (!tenant || tenant.platformPartnerId) return;

  const program = await getPartnerProgram();
  const promoEnd = new Date(Date.now() + program.promoTrialDays * 86400_000);
  const trialEndsAt =
    tenant.trialEndsAt && tenant.trialEndsAt > promoEnd ? tenant.trialEndsAt : promoEnd;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      platformPartnerId: partner.id,
      platformPartnerFeeBps: TURNOVER_COMMISSION_BPS,
      trialEndsAt,
    },
  });

  await notify(
    partner.email,
    "A store signed up with your Tescommerce link",
    `${tenant.name} opened a store with your link. You earn 0.2% of each paid order. Commissions stay pending for ${program.holdDays} days.`
  );
}

export async function recordPlatformReferralForPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      currency: true,
      totalAmount: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          platformPartnerId: true,
          owner: { select: { email: true } },
        },
      },
    },
  });
  if (!order?.tenant.platformPartnerId) return;

  const partner = await prisma.platformPartner.findUnique({
    where: { id: order.tenant.platformPartnerId },
  });
  if (!partner || partner.status !== PlatformPartnerStatus.ACTIVE) return;

  if (samePerson(partner, order.tenant.owner.email, order.tenant.ownerId)) {
    await prisma.platformPartnerReferral.updateMany({
      where: {
        tenantId: order.tenantId,
        payoutId: null,
        status: { in: [PlatformReferralStatus.PENDING, PlatformReferralStatus.AVAILABLE] },
      },
      data: { status: PlatformReferralStatus.VOID },
    });
    return;
  }

  const program = await getPartnerProgram();
  const availableAt = new Date(Date.now() + program.holdDays * 86400_000);
  const currency = order.currency.slice(0, 3).toUpperCase();
  const share = Math.floor((Math.max(0, order.totalAmount) * TURNOVER_COMMISSION_BPS) / 10000);
  if (share > 0) {
    await prisma.platformPartnerReferral.create({
      data: {
        partnerId: partner.id,
        tenantId: order.tenantId,
        orderId: order.id,
        kind: PlatformReferralKind.FEE_SHARE,
        periodKey: order.id,
        amountCents: share,
        currency,
        availableAt,
      },
    });
  }
}

export async function voidPlatformReferralForRefund(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, tenantId: true },
  });
  if (!order) return;

  await prisma.platformPartnerReferral.updateMany({
    where: {
      orderId,
      kind: PlatformReferralKind.FEE_SHARE,
      payoutId: null,
      status: { in: [PlatformReferralStatus.PENDING, PlatformReferralStatus.AVAILABLE] },
    },
    data: { status: PlatformReferralStatus.VOID },
  });

  const otherPaid = await prisma.order.count({
    where: {
      tenantId: order.tenantId,
      id: { not: order.id },
      status: { in: PAID_STATUSES },
    },
  });
  if (otherPaid === 0) {
    await prisma.platformPartnerReferral.updateMany({
      where: {
        tenantId: order.tenantId,
        kind: PlatformReferralKind.BOUNTY,
        payoutId: null,
        status: { in: [PlatformReferralStatus.PENDING, PlatformReferralStatus.AVAILABLE] },
      },
      data: { status: PlatformReferralStatus.VOID },
    });
  }
}

export async function voidPendingFeeShareForTenant(tenantId: string) {
  await prisma.platformPartnerReferral.updateMany({
    where: {
      tenantId,
      kind: PlatformReferralKind.FEE_SHARE,
      status: PlatformReferralStatus.PENDING,
      payoutId: null,
    },
    data: { status: PlatformReferralStatus.VOID },
  });
}

export async function releaseMaturePlatformReferrals() {
  const due = await prisma.platformPartnerReferral.findMany({
    where: { status: PlatformReferralStatus.PENDING, availableAt: { lte: new Date() } },
    include: { partner: { select: { email: true, name: true } } },
  });
  if (!due.length) return { released: 0 };

  await prisma.platformPartnerReferral.updateMany({
    where: { id: { in: due.map((row) => row.id) } },
    data: { status: PlatformReferralStatus.AVAILABLE },
  });

  const byEmail = new Map<string, { name: string; lines: string[] }>();
  for (const row of due) {
    const bucket = byEmail.get(row.partner.email) ?? { name: row.partner.name, lines: [] };
    bucket.lines.push(`${row.kind} ${money(row.amountCents, row.currency)}`);
    byEmail.set(row.partner.email, bucket);
  }
  for (const [email, bucket] of byEmail) {
    await notify(
      email,
      "Tescommerce partner commission is ready",
      `Hi ${bucket.name},\n\nThese commissions finished their hold and can be requested for payout:\n${bucket.lines.join("\n")}`
    );
  }
  return { released: due.length };
}

export async function partnerDashboard(userId: string) {
  const partner = await prisma.platformPartner.findUnique({
    where: { userId },
  });
  if (!partner) return null;

  const program = await getPartnerProgram();
  const [clicks, stores, referrals, payouts] = await Promise.all([
    prisma.platformPartnerClick.count({ where: { partnerId: partner.id } }),
    prisma.tenant.findMany({
      where: { platformPartnerId: partner.id },
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.platformPartnerReferral.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.platformPartnerPayout.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const balances: Record<string, { pending: number; available: number; paid: number }> = {};
  for (const row of referrals) {
    const bucket = balances[row.currency] ?? { pending: 0, available: 0, paid: 0 };
    if (row.status === PlatformReferralStatus.PENDING) bucket.pending += row.amountCents;
    if (row.status === PlatformReferralStatus.AVAILABLE && !row.payoutId) {
      bucket.available += row.amountCents;
    }
    if (row.status === PlatformReferralStatus.PAID) bucket.paid += row.amountCents;
    balances[row.currency] = bucket;
  }

  const link =
    partner.status === PlatformPartnerStatus.ACTIVE ? partnerSignupLink(partner.code) : null;

  return {
    status: partner.status,
    name: partner.name,
    email: partner.email,
    code: partner.status === PlatformPartnerStatus.ACTIVE ? partner.code : null,
    link,
    qrUrl: link
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`
      : null,
    blurb: link
      ? `I use Tescommerce to run an online store. Open yours here: ${link}`
      : null,
    pitch: partner.pitch,
    payoutMethod: partner.payoutMethod,
    payoutDetails: partner.payoutDetails,
    clicks,
    stores,
    balances,
    referrals,
    payouts,
    program: {
      turnoverBps: TURNOVER_COMMISSION_BPS,
      holdDays: program.holdDays,
      minPayoutCents: program.minPayoutCents,
      cookieDays: program.cookieDays,
      promoTrialDays: program.promoTrialDays,
    },
  };
}

export async function savePartnerPayoutDetails(
  userId: string,
  method: string,
  details: string
) {
  const partner = await prisma.platformPartner.findUnique({ where: { userId } });
  if (!partner) return null;
  return prisma.platformPartner.update({
    where: { id: partner.id },
    data: { payoutMethod: method.slice(0, 40), payoutDetails: details.slice(0, 2000) },
    select: { payoutMethod: true, payoutDetails: true },
  });
}

export async function requestPartnerPayout(userId: string, currency: string) {
  const partner = await prisma.platformPartner.findUnique({ where: { userId } });
  if (!partner || partner.status !== PlatformPartnerStatus.ACTIVE) {
    return { ok: false as const, status: 403, error: "Partner is not active" };
  }
  if (!partner.payoutMethod || !partner.payoutDetails) {
    return { ok: false as const, status: 400, error: "Add payout details first" };
  }
  const cur = currency.trim().toUpperCase().slice(0, 3);
  const program = await getPartnerProgram();
  const rows = await prisma.platformPartnerReferral.findMany({
    where: {
      partnerId: partner.id,
      currency: cur,
      status: PlatformReferralStatus.AVAILABLE,
      payoutId: null,
    },
    orderBy: { availableAt: "asc" },
  });
  const amount = rows.reduce((sum, row) => sum + row.amountCents, 0);
  if (amount < program.minPayoutCents) {
    return {
      ok: false as const,
      status: 400,
      error: `Minimum payout is ${money(program.minPayoutCents, cur)}`,
    };
  }

  const payout = await prisma.platformPartnerPayout.create({
    data: {
      partnerId: partner.id,
      amountCents: amount,
      currency: cur,
      note: `${partner.payoutMethod}: ${partner.payoutDetails}`,
    },
  });
  await prisma.platformPartnerReferral.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { payoutId: payout.id },
  });
  return { ok: true as const, payout };
}

export async function markPartnerPayout(
  payoutId: string,
  status: "PROCESSING" | "PAID"
) {
  const payout = await prisma.platformPartnerPayout.findUnique({
    where: { id: payoutId },
    include: { partner: true },
  });
  if (!payout) return null;
  if (payout.status === PlatformPartnerPayoutStatus.PAID) return payout;

  const updated = await prisma.platformPartnerPayout.update({
    where: { id: payoutId },
    data: {
      status:
        status === "PAID"
          ? PlatformPartnerPayoutStatus.PAID
          : PlatformPartnerPayoutStatus.PROCESSING,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });
  if (status === "PAID") {
    await prisma.platformPartnerReferral.updateMany({
      where: { payoutId },
      data: { status: PlatformReferralStatus.PAID },
    });
    await notify(
      payout.partner.email,
      "Tescommerce partner payout sent",
      `We sent ${money(payout.amountCents, payout.currency)} using ${payout.partner.payoutMethod ?? "your payout details"}.`
    );
  }
  return updated;
}
