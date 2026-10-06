import { prisma } from "@ugclab/database";
import type Stripe from "stripe";
import { MERCHANT_WEB_URL } from "../env.js";
import { getOrCreateBillingCustomer } from "./platform-billing.js";
import { getStripe, isStripeConfigured } from "./stripe.js";

export const GIFT_WRAP_CENTS = 300;

export type GiftWrapConfig = {
  priceCents: number;
  label: string;
  cardEnabled: boolean;
};

export function parseGiftWrapConfig(raw: unknown): GiftWrapConfig {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const price = Number(o.priceCents);
  const label = String(o.label ?? "Add gift wrap").trim().slice(0, 80);
  return {
    priceCents: Number.isFinite(price) ? Math.min(20000, Math.max(0, Math.round(price))) : GIFT_WRAP_CENTS,
    label: label || "Add gift wrap",
    cardEnabled: o.cardEnabled !== false,
  };
}

const THEME_PRICES: Record<string, number> = {
  atelier: 2900,
  ritual: 1900,
  luxe: 4900,
  jewelry: 3900,
  prestige: 5900,
};

const APP_SEED = [
  {
    id: "gift-wrap",
    name: "Gift wrap",
    summary: "Let buyers add gift wrap at checkout.",
    description:
      "Adds a gift-wrap option on checkout. The store keeps the wrap fee on the order total.",
    category: "Checkout",
    priceCents: 900,
    interval: "once",
    sortOrder: 1,
  },
  {
    id: "priority-support",
    name: "Priority support",
    summary: "Your tickets are marked priority for the platform team.",
    description:
      "Support messages from this store are tagged as priority so they are answered first.",
    category: "Store",
    priceCents: 1900,
    interval: "month",
    sortOrder: 2,
  },
  {
    id: "branded-tracking",
    name: "Branded tracking page",
    summary: "Show your logo and colors on the order tracking page.",
    description:
      "The public order page uses your store logo and brand color instead of the plain layout.",
    category: "Storefront",
    priceCents: 1500,
    interval: "once",
    sortOrder: 3,
  },
  {
    id: "extra-staff",
    name: "Extra staff seats",
    summary: "Invite five more people on top of the three included seats.",
    description:
      "Each store includes 3 staff seats. This adds 5 more. Existing people stay if the subscription ends; new invites stop until it is active again.",
    category: "Store",
    priceCents: 900,
    interval: "month",
    sortOrder: 4,
  },
  {
    id: "second-store",
    name: "Second store",
    summary: "Open one more store on the same account.",
    description:
      "The first store is included. This unlocks a second store with its own address, products, and orders. A store you already opened stays if you cancel.",
    category: "Store",
    priceCents: 2900,
    interval: "once",
    sortOrder: 5,
  },
] as const;

export async function ensureMarketplace() {
  await prisma.platformApp.createMany({
    data: APP_SEED.map((app) => ({ ...app, published: true })),
    skipDuplicates: true,
  });
  for (const [id, priceCents] of Object.entries(THEME_PRICES)) {
    await prisma.storeThemeCatalog.updateMany({
      where: { id },
      data: { priceCents },
    });
  }
}

export async function activeAddonIds(tenantId: string, kind: "THEME" | "APP") {
  const rows = await prisma.tenantAddon.findMany({
    where: { tenantId, kind, status: "active" },
    select: { itemId: true },
  });
  return new Set(rows.map((r) => r.itemId));
}

export async function tenantHasApp(tenantId: string, appId: string) {
  const row = await prisma.tenantAddon.findUnique({
    where: { tenantId_kind_itemId: { tenantId, kind: "APP", itemId: appId } },
    select: { status: true },
  });
  return row?.status === "active";
}

export async function assertThemePurchased(tenantId: string, themeId: string) {
  const theme = await prisma.storeThemeCatalog.findUnique({ where: { id: themeId } });
  if (!theme || theme.priceCents <= 0) return;
  const owned = await prisma.tenantAddon.findUnique({
    where: { tenantId_kind_itemId: { tenantId, kind: "THEME", itemId: themeId } },
  });
  if (owned?.status === "active") return;
  throw new Error(`Theme "${theme.label}" costs $${(theme.priceCents / 100).toFixed(2)}. Buy it in Apps & themes.`);
}

async function addonLabel(kind: "THEME" | "APP", itemId: string) {
  if (kind === "THEME") {
    const theme = await prisma.storeThemeCatalog.findUnique({ where: { id: itemId } });
    return theme?.label ?? itemId;
  }
  const app = await prisma.platformApp.findUnique({ where: { id: itemId } });
  return app?.name ?? itemId;
}

async function sendAddonReceipt(opts: {
  tenantId: string;
  kind: "THEME" | "APP";
  itemId: string;
  priceCents: number;
  interval: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    include: { owner: { select: { email: true } } },
  });
  const to = tenant?.owner?.email;
  if (!to) return;
  const name = await addonLabel(opts.kind, opts.itemId);
  const amount = `$${(opts.priceCents / 100).toFixed(2)}`;
  const cadence = opts.interval === "month" ? "per month" : "one-time";
  const { sendEmail } = await import("./email.js");
  await sendEmail({
    to,
    subject: `Receipt: ${name}`,
    template: "addon-receipt",
    html: `<p>Thanks for your purchase on <strong>${tenant?.name ?? "your store"}</strong>.</p>
<p><strong>${name}</strong> — ${amount} (${cadence}).</p>
<p>Manage it in Apps &amp; themes.</p>`,
  }).catch(() => {});
}

export async function grantAddon(opts: {
  tenantId: string;
  kind: "THEME" | "APP";
  itemId: string;
  priceCents: number;
  interval: string;
  stripeSessionId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date | null;
}) {
  if (!opts.tenantId || !opts.itemId) return;
  const prev = await prisma.tenantAddon.findUnique({
    where: {
      tenantId_kind_itemId: {
        tenantId: opts.tenantId,
        kind: opts.kind,
        itemId: opts.itemId,
      },
    },
  });
  await prisma.tenantAddon.upsert({
    where: {
      tenantId_kind_itemId: {
        tenantId: opts.tenantId,
        kind: opts.kind,
        itemId: opts.itemId,
      },
    },
    create: {
      tenantId: opts.tenantId,
      kind: opts.kind,
      itemId: opts.itemId,
      priceCents: opts.priceCents,
      interval: opts.interval,
      status: "active",
      stripeSessionId: opts.stripeSessionId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      currentPeriodEnd: opts.currentPeriodEnd ?? null,
    },
    update: {
      status: "active",
      priceCents: opts.priceCents,
      interval: opts.interval,
      ...(opts.stripeSessionId ? { stripeSessionId: opts.stripeSessionId } : {}),
      ...(opts.stripeSubscriptionId ? { stripeSubscriptionId: opts.stripeSubscriptionId } : {}),
      ...(opts.currentPeriodEnd ? { currentPeriodEnd: opts.currentPeriodEnd } : {}),
    },
  });
  if (prev?.status !== "active") {
    await sendAddonReceipt(opts);
  }
}

export async function markAddonPastDue(stripeSubscriptionId: string) {
  const row = await prisma.tenantAddon.findFirst({
    where: { stripeSubscriptionId, status: "active" },
  });
  if (!row) return false;
  await prisma.tenantAddon.update({
    where: { id: row.id },
    data: { status: "past_due" },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { id: row.tenantId },
    include: { owner: { select: { email: true } } },
  });
  if (tenant?.owner?.email) {
    const name = await addonLabel(row.kind === "THEME" ? "THEME" : "APP", row.itemId);
    const { sendEmail } = await import("./email.js");
    await sendEmail({
      to: tenant.owner.email,
      subject: `Payment failed: ${name}`,
      template: "addon-past-due",
      html: `<p>The card for <strong>${name}</strong> was declined. The app is paused until the payment succeeds.</p>`,
    }).catch(() => {});
  }
  return true;
}

export async function markAddonRenewed(stripeSubscriptionId: string, periodEnd: Date | null) {
  const row = await prisma.tenantAddon.findFirst({ where: { stripeSubscriptionId } });
  if (!row) return false;
  await prisma.tenantAddon.update({
    where: { id: row.id },
    data: {
      status: "active",
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
    },
  });
  return true;
}

/** Grant a paid Checkout Session that never reached the webhook. */
export async function reconcileAddonCheckouts(tenantId: string) {
  if (!isStripeConfigured()) return;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeBillingCustomerId: true },
  });
  if (!tenant?.stripeBillingCustomerId) return;
  const listed = await getStripe().checkout.sessions.list({
    customer: tenant.stripeBillingCustomerId,
    limit: 20,
  });
  for (const session of listed.data) {
    if (session.metadata?.type !== "platform_addon") continue;
    if (session.metadata.tenantId !== tenantId) continue;
    if (session.payment_status !== "paid") continue;
    const kind = session.metadata.kind === "THEME" ? "THEME" : "APP";
    const itemId = session.metadata.itemId ?? "";
    if (!itemId) continue;
    const existing = await prisma.tenantAddon.findUnique({
      where: { tenantId_kind_itemId: { tenantId, kind, itemId } },
    });
    if (existing?.status === "active") continue;
    if (existing?.status === "past_due") continue;
    if (
      existing?.status === "canceled" &&
      existing.stripeSessionId === session.id
    ) {
      continue;
    }
    if (
      existing?.status === "canceled" &&
      existing.createdAt.getTime() > session.created * 1000
    ) {
      continue;
    }
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    await grantAddon({
      tenantId,
      kind,
      itemId,
      priceCents: Number(session.metadata.priceCents ?? 0),
      interval: session.metadata.interval ?? "once",
      stripeSessionId: session.id,
      stripeSubscriptionId: subscriptionId,
    });
  }
}

export async function getGiftWrapOffer(tenantId: string) {
  const row = await prisma.tenantAddon.findUnique({
    where: { tenantId_kind_itemId: { tenantId, kind: "APP", itemId: "gift-wrap" } },
  });
  if (row?.status !== "active") return null;
  return parseGiftWrapConfig(row.config);
}

async function listingPrice(kind: "THEME" | "APP", itemId: string) {
  if (kind === "THEME") {
    const theme = await prisma.storeThemeCatalog.findUnique({ where: { id: itemId } });
    if (!theme || !theme.published) throw new Error("Theme not found");
    return { name: theme.label, priceCents: theme.priceCents, interval: "once" };
  }
  const app = await prisma.platformApp.findUnique({ where: { id: itemId } });
  if (!app || !app.published) throw new Error("App not found");
  return { name: app.name, priceCents: app.priceCents, interval: app.interval };
}

export async function startAddonCheckout(opts: {
  tenantId: string;
  tenantName: string;
  ownerEmail: string;
  kind: "THEME" | "APP";
  itemId: string;
}) {
  const listing = await listingPrice(opts.kind, opts.itemId);
  const already = await prisma.tenantAddon.findUnique({
    where: {
      tenantId_kind_itemId: {
        tenantId: opts.tenantId,
        kind: opts.kind,
        itemId: opts.itemId,
      },
    },
  });
  if (already?.status === "active") {
    return { url: null as string | null, activated: true };
  }
  if (listing.priceCents <= 0) {
    await grantAddon({
      tenantId: opts.tenantId,
      kind: opts.kind,
      itemId: opts.itemId,
      priceCents: 0,
      interval: listing.interval,
    });
    return { url: null as string | null, activated: true };
  }

  if (!isStripeConfigured()) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error("Stripe is not configured");
    }
    await grantAddon({
      tenantId: opts.tenantId,
      kind: opts.kind,
      itemId: opts.itemId,
      priceCents: listing.priceCents,
      interval: listing.interval,
    });
    return { url: null as string | null, activated: true };
  }

  const customerId = await getOrCreateBillingCustomer(
    opts.tenantId,
    opts.ownerEmail,
    opts.tenantName
  );
  const recurring = listing.interval === "month";
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: listing.priceCents,
      product_data: { name: listing.name },
      ...(recurring ? { recurring: { interval: "month" } } : {}),
    },
  };
  const session = await getStripe().checkout.sessions.create({
    mode: recurring ? "subscription" : "payment",
    customer: customerId,
    line_items: [lineItem],
    success_url: `${MERCHANT_WEB_URL}/apps?purchased=1`,
    cancel_url: `${MERCHANT_WEB_URL}/apps`,
    metadata: {
      type: "platform_addon",
      tenantId: opts.tenantId,
      kind: opts.kind,
      itemId: opts.itemId,
      priceCents: String(listing.priceCents),
      interval: listing.interval,
    },
    ...(recurring
      ? {
          subscription_data: {
            metadata: {
              type: "platform_addon",
              tenantId: opts.tenantId,
              kind: opts.kind,
              itemId: opts.itemId,
            },
          },
        }
      : {}),
  });
  if (!session.url) throw new Error("Checkout did not return a URL");
  return { url: session.url, activated: false };
}
