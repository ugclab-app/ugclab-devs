import {
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";
import { hash } from "bcryptjs";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  newAccessToken,
  resolveShipping,
  validateDiscountCode,
} from "./checkout.js";
import { composeTotals } from "./order-math.js";
import { validateGiftCard } from "./gift-card.js";
import { parseStoreTheme } from "./store-theme.js";
import { applyAutoPromotions } from "./promotions.js";
import { fixedPriceForCurrency, priceForCountry } from "./country-price.js";
import { ensureFxRates } from "./fx-rates.js";
import { fulfillPaidOrder } from "./fulfill-order.js";
import {
  calcPlatformFeeAmount,
  resolvePlatformFeeBps,
} from "./platform-fee.js";
import type Stripe from "stripe";
import { isMorPaymentModel } from "./payment-model.js";
import { getStripe, isStripeConfigured } from "./stripe.js";
import { STRIPE_SHIPPING_COUNTRIES } from "./stripe-shipping-countries.js";
import { shouldUseGoPayCheckout } from "./gopay/config.js";
import {
  createGoPayCheckout,
  newGoPayOrderId,
} from "./gopay/checkout.js";
import { shouldUseFinikCheckout } from "./finik/config.js";
import { createFinikCheckout } from "./finik/checkout.js";
import { resolveTaxRateBps, resolveCheckoutCurrency } from "./store-markets.js";
import { convertAmount } from "@ugclab/i18n/store-currency";
import { getStorefrontUrl } from "./storefront.js";
import {
  cartKey,
  chargedUnit,
  CUSTOMER_COOKIE,
  getCart,
  setCart,
  type CartItem,
} from "./store-cart.js";
import {
  getStoreSessionKey,
  markAbandonedCartConverted,
} from "./abandoned-cart.js";
import { resolveAffiliatePartnerIdForOrder } from "./affiliate.js";

export type PreparedOrder = {
  tenantId: string;
  tenantSlug: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  feeBps: number;
  email: string;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  platformFeeAmount: number;
  discountCodeId: string | null;
  giftCardId: string | null;
  giftCardAmount: number;
  loyaltyPointsSpent: number;
  loyaltyDiscountAmount: number;
  storeCreditAmount: number;
  tipAmount: number;
  customFields: Record<string, string> | null;
  bnplEnabled: boolean;
  giftWrapAmount: number;
  giftMessage: string | null;
  country: string;
  hasPhysical: boolean;
  shippingName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostal: string | null;
  shippingPhone: string | null;
  customerId: string;
  orderNumber: string;
  accessToken: string;
  stripeTaxEnabled: boolean;
  stripeLinkEnabled: boolean;
  stripePaypalEnabled: boolean;
  shippingLabel: string | null;
  affiliatePartnerId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPath: string | null;
  liveSessionId: string | null;
  fulfillmentMethod: "SHIP" | "PICKUP";
  pickupWarehouseId: string | null;
  b2bCompanyId: string | null;
  isSubscriptionCheckout: boolean;
  subscriptionInterval: "week" | "month" | "year" | null;
  subscriptionProductId: string | null;
  hasPreorder: boolean;
  hasTryBeforeYouBuy: boolean;
  tryBeforeYouBuyDays: number | null;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  paymentHold: boolean;
  captureMethod: "automatic" | "manual";
  buyerProtection: boolean;
  lineData: {
    productId: string;
    variantId: string | null;
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    type: ProductType;
    subscriptionEnabled?: boolean;
    subscriptionInterval?: string | null;
    sellAsGiftCard?: boolean;
  }[];
};

async function prepareOrder(
  c: Context,
  tenantId: string,
  body: Record<string, unknown>
): Promise<PreparedOrder> {
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(body.name ?? "").trim();
  const country = String(body.country ?? "US")
    .toUpperCase()
    .slice(0, 2);
  const discountCode = String(body.discountCode ?? "").trim();
  const createAccount = Boolean(body.createAccount);
  const password = String(body.password ?? "");
  const acceptPolicies = Boolean(body.acceptPolicies);
  const shippingName = String(body.shippingName ?? name).trim();
  const shippingAddress1 = String(body.shippingAddress1 ?? "").trim();
  const shippingAddress2 = String(body.shippingAddress2 ?? "").trim();
  const shippingCity = String(body.shippingCity ?? "").trim();
  const shippingRegion = String(body.shippingRegion ?? "").trim();
  const shippingPostal = String(body.shippingPostal ?? "").trim();
  const shippingPhone = String(body.shippingPhone ?? body.phone ?? "").trim();

  if (!email) throw new Error("Email is required");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true, subscriptionPlan: true },
  });
  if (!tenant) throw new Error("Store not found");

  const { isCountryBlocked } = await import("./checkout-extras.js");
  if (isCountryBlocked(tenant.settings?.blockedCountries, country)) {
    throw new Error("Sorry, this store does not sell to your country");
  }

  await ensureFxRates();
  const baseCurrency = tenant.settings?.currency ?? "USD";
  const currency = resolveCheckoutCurrency({
    shippingCountry: country,
    baseCurrency,
    markets: tenant.settings?.markets,
  });
  /** line index → fixed unit price in the checkout currency (product "Prices by currency") */
  const fixedUnits = new Map<number, number>();

  const bundleId = String(body.bundleId ?? "").trim();
  let cart = getCart(c).filter((i) => i.tenantId === tenantId);
  let lineData: PreparedOrder["lineData"] = [];
  let subtotal = 0;
  let totalWeightGrams = 0;
  let hasPhysical = false;

  if (bundleId) {
    const bundle = await prisma.productBundle.findFirst({
      where: { id: bundleId, tenantId, active: true },
      include: {
        items: {
          include: {
            product: { include: { variants: true, digitalAsset: true } },
          },
        },
      },
    });
    if (!bundle?.items.length) throw new Error("Bundle not found");
    const catalogSum = bundle.items.reduce(
      (s, i) => s + i.product.priceAmount * i.quantity,
      0
    );
    for (const item of bundle.items) {
      const p = item.product;
      if (p.status !== ProductStatus.ACTIVE) {
        throw new Error(`${p.title} is unavailable`);
      }
      const share =
        catalogSum > 0
          ? Math.round(
              (bundle.priceAmount * (p.priceAmount * item.quantity)) / catalogSum
            )
          : Math.round(bundle.priceAmount / bundle.items.length);
      const unit = Math.round(share / item.quantity);
      const lineTotal = unit * item.quantity;
      subtotal += lineTotal;
      if (p.type === ProductType.PHYSICAL && p.requiresShipping !== false) {
        hasPhysical = true;
        totalWeightGrams += (p.weightGrams ?? 0) * item.quantity;
      }
      lineData.push({
        productId: p.id,
        variantId: null,
        title: `${bundle.title} — ${p.title}`,
        quantity: item.quantity,
        unitAmount: unit,
        totalAmount: lineTotal,
        type: p.type,
      });
    }
    subtotal = bundle.priceAmount;
    lineData = lineData.map((l, idx, arr) => {
      if (idx < arr.length - 1) return l;
      const fixed = bundle.priceAmount - arr.slice(0, -1).reduce((s, x) => s + x.totalAmount, 0);
      return {
        ...l,
        totalAmount: fixed,
        unitAmount: Math.round(fixed / l.quantity),
      };
    });
  } else {
    if (cart.length === 0) throw new Error("Cart is empty");

    const products = await prisma.product.findMany({
      where: {
        id: { in: cart.map((i) => i.productId) },
        tenantId,
        status: ProductStatus.ACTIVE,
      },
      include: { digitalAsset: true, variants: true },
    });

    // Resolve B2B price list early from email if buyer exists
    let b2bPriceMap = new Map<string, number>();
    {
      const earlyCustomer = await prisma.customer.findUnique({
        where: { tenantId_email: { tenantId, email } },
        include: {
          b2bCompany: {
            include: { priceList: { include: { items: true } } },
          },
        },
      });
      if (
        earlyCustomer?.b2bCompany?.status === "ACTIVE" &&
        earlyCustomer.b2bCompany.priceList?.active
      ) {
        for (const item of earlyCustomer.b2bCompany.priceList.items) {
          const key = `${item.productId}:${item.variantId ?? ""}`;
          b2bPriceMap.set(key, item.priceAmount);
        }
      }
    }

    for (const item of cart) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) continue;
      const variant = item.variantId
        ? p.variants.find((v) => v.id === item.variantId)
        : null;
      const b2bKey = `${p.id}:${variant?.id ?? ""}`;
      const b2bUnit = b2bPriceMap.get(b2bKey) ?? b2bPriceMap.get(`${p.id}:`);
      const fixedUnit =
        !variant && currency !== baseCurrency
          ? fixedPriceForCurrency(p.translations, currency)
          : null;
      // a fixed price enters the base-currency maths at its converted value and is
      // restored exactly when the order is converted to the checkout currency below
      const catalog =
        variant?.priceAmount ??
        (fixedUnit != null
          ? convertAmount(fixedUnit, currency, baseCurrency)
          : priceForCountry(p.priceAmount, p.translations, country));
      const unit = chargedUnit(item, b2bUnit ?? catalog);
      if (fixedUnit != null && b2bUnit == null && unit === catalog) {
        fixedUnits.set(lineData.length, fixedUnit);
      }
      const title = variant ? `${p.title} — ${variant.title}` : p.title;
      const stock = variant?.inventory ?? p.inventory;
      if (
        p.type === ProductType.PHYSICAL &&
        !p.preorderEnabled &&
        stock != null &&
        stock < item.quantity
      ) {
        throw new Error(`${title} is out of stock`);
      }
      const lineTotal = unit * item.quantity;
      subtotal += lineTotal;
      if (p.type === ProductType.PHYSICAL && p.requiresShipping !== false) {
        hasPhysical = true;
        totalWeightGrams +=
          (variant?.weightGrams ?? p.weightGrams ?? 0) * item.quantity;
      }
      lineData.push({
        productId: p.id,
        variantId: variant?.id ?? null,
        title: p.preorderEnabled ? `${title} (Pre-order)` : title,
        quantity: item.quantity,
        unitAmount: unit,
        totalAmount: lineTotal,
        type: p.type,
        subscriptionEnabled: Boolean(item.subscribe) && p.subscriptionEnabled,
        subscriptionInterval: p.subscriptionInterval,
      });
    }
  }

  if (lineData.length === 0) throw new Error("No valid products in cart");

  const settings = tenant.settings;
  const hasPolicies =
    settings?.privacyUrl ||
    settings?.refundUrl ||
    settings?.privacyPolicy ||
    settings?.refundPolicy;
  if (hasPolicies && !acceptPolicies) {
    throw new Error("Please accept store policies");
  }

  const auto = await applyAutoPromotions(tenantId, subtotal);
  let discountAmount = auto.discountAmount;
  let discountCodeId: string | null = null;
  if (discountCode) {
    const d = await validateDiscountCode(
      tenantId,
      discountCode,
      subtotal - discountAmount,
      lineData.map((l) => l.productId).filter((id): id is string => Boolean(id))
    );
    if (d) {
      discountAmount += d.discountAmount;
      discountCodeId = d.discount.id;
    }
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const afterDiscount = subtotal - discountAmount;
  const theme = parseStoreTheme(settings?.theme);

  const fulfillmentMethod =
    String(body.fulfillmentMethod ?? "SHIP").toUpperCase() === "PICKUP"
      ? ("PICKUP" as const)
      : ("SHIP" as const);
  let pickupWarehouseId: string | null = null;
  if (fulfillmentMethod === "PICKUP") {
    const whId = String(body.pickupWarehouseId ?? "").trim();
    const wh = await prisma.warehouse.findFirst({
      where: {
        tenantId,
        pickupEnabled: true,
        ...(whId ? { id: whId } : {}),
      },
      orderBy: { isDefault: "desc" },
    });
    if (!wh) throw new Error("No pickup location available");
    pickupWarehouseId = wh.id;
  }

  const shippingQuote =
    hasPhysical && fulfillmentMethod === "SHIP"
      ? await resolveShipping(tenantId, country, afterDiscount, totalWeightGrams)
      : { amount: 0, label: null };
  let shippingAmount = shippingQuote.amount;
  if (auto.freeShipping && hasPhysical && fulfillmentMethod === "SHIP") {
    shippingAmount = 0;
  }
  const customShipping = parseInt(String(body.shippingAmountCents ?? ""), 10);
  if (
    Number.isFinite(customShipping) &&
    customShipping >= 0 &&
    hasPhysical &&
    fulfillmentMethod === "SHIP"
  ) {
    shippingAmount = customShipping;
  }

  const shippingLabel =
    fulfillmentMethod === "PICKUP"
      ? "Store pickup"
      : theme.shippingCarrierLabel?.trim() ||
        shippingQuote.label ||
        (hasPhysical ? "Standard shipping" : null);

  const stripeTaxEnabled =
    settings?.stripeTaxEnabled === true || theme.stripeTaxEnabled === true;
  const stripeLinkEnabled = theme.stripeLinkEnabled !== false;
  const stripePaypalEnabled = theme.stripePaypalEnabled === true;
  const taxRateBps = resolveTaxRateBps({
    shippingCountry: country,
    defaultTaxRateBps: settings?.taxRateBps ?? 0,
    markets: settings?.markets,
  });
  const {
    resolveTipCents,
    parseCheckoutFields,
    collectCustomFieldAnswers,
  } = await import("./checkout-extras.js");
  const tipAmount = resolveTipCents({
    enabled: settings?.tipsEnabled === true,
    presets: settings?.tipPresets ?? [],
    subtotalCents: afterDiscount,
    tipPercent: body.tipPercent,
    tipCents: body.tipCents,
  });
  const customFields = collectCustomFieldAnswers(
    parseCheckoutFields(settings?.checkoutFields),
    body.customFields
  );
  let giftWrapAmount = 0;
  let giftMessage: string | null = null;
  if (body.giftWrap === true) {
    const { getGiftWrapOffer } = await import("./marketplace.js");
    const offer = await getGiftWrapOffer(tenantId);
    if (offer) {
      giftWrapAmount = offer.priceCents;
      if (offer.cardEnabled) {
        const note = String(body.giftMessage ?? "").trim().slice(0, 280);
        giftMessage = note || null;
      }
    }
  }
  const totals = composeTotals({
    subtotal,
    discountAmount,
    shippingAmount,
    taxRateBps,
    taxIncluded: settings?.taxIncluded ?? false,
    stripeTaxEnabled,
    giftWrapAmount,
    tipAmount,
  });
  let taxAmount = totals.taxAmount;
  let totalAmount = totals.totalBeforeCredits;

  let giftCardId: string | null = null;
  let giftCardAmount = 0;
  const giftCardCode = String(body.giftCardCode ?? "").trim();
  if (giftCardCode) {
    const gc = await validateGiftCard(tenantId, giftCardCode, totalAmount);
    if (gc) {
      giftCardAmount = gc.giftCardAmount;
      giftCardId = gc.card.id;
      totalAmount -= giftCardAmount;
    }
  }

  let loyaltyPointsSpent = 0;
  let loyaltyDiscountAmount = 0;
  const wantLoyalty = body.useLoyaltyPoints === true || body.useLoyaltyPoints === "true";
  if (wantLoyalty) {
    const { loyaltyFromSettings, maxRedeemablePoints, pointsToDiscountCents } =
      await import("./loyalty.js");
    const loyalty = loyaltyFromSettings(settings);
    if (loyalty.enabled) {
      const emailForLoyalty = email;
      const cust = await prisma.customer.findUnique({
        where: { tenantId_email: { tenantId, email: emailForLoyalty } },
        select: { loyaltyPoints: true },
      });
      const balance = cust?.loyaltyPoints ?? 0;
      const maxPts = maxRedeemablePoints(
        balance,
        totalAmount,
        loyalty.redeemCentsPerPoint
      );
      const requested = Math.min(
        maxPts,
        Math.max(0, parseInt(String(body.loyaltyPoints ?? maxPts), 10) || maxPts)
      );
      if (requested > 0) {
        loyaltyPointsSpent = requested;
        loyaltyDiscountAmount = pointsToDiscountCents(
          requested,
          loyalty.redeemCentsPerPoint
        );
        totalAmount = Math.max(0, totalAmount - loyaltyDiscountAmount);
      }
    }
  }

  let storeCreditAmount = 0;
  const wantCredit = body.useStoreCredit === true || body.useStoreCredit === "true";
  if (wantCredit && totalAmount > 0) {
    const cust = await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: { storeCreditCents: true },
    });
    const balance = cust?.storeCreditCents ?? 0;
    if (balance > 0) {
      storeCreditAmount = Math.min(balance, totalAmount);
      totalAmount -= storeCreditAmount;
    }
  }

  const feeBps = resolvePlatformFeeBps(tenant);
  let platformFeeAmount = calcPlatformFeeAmount(totalAmount, feeBps);
  let storeCreditAmountConverted = storeCreditAmount;
  let tipAmountConverted = tipAmount;

  if (currency !== baseCurrency) {
    const cv = (n: number) => convertAmount(n, baseCurrency, currency);
    // fixed-price lines are charged exactly; the rounding difference moves subtotal and total
    let fixedDelta = 0;
    lineData.forEach((line, i) => {
      const fixed = fixedUnits.get(i);
      const converted = cv(line.totalAmount);
      line.unitAmount = fixed ?? cv(line.unitAmount);
      line.totalAmount = fixed != null ? fixed * line.quantity : converted;
      fixedDelta += line.totalAmount - converted;
    });
    subtotal = cv(subtotal) + fixedDelta;
    discountAmount = cv(discountAmount);
    shippingAmount = cv(shippingAmount);
    taxAmount = stripeTaxEnabled ? 0 : cv(taxAmount);
    giftCardAmount = giftCardAmount ? cv(giftCardAmount) : 0;
    giftWrapAmount = giftWrapAmount ? cv(giftWrapAmount) : 0;
    storeCreditAmountConverted = storeCreditAmount ? cv(storeCreditAmount) : 0;
    tipAmountConverted = tipAmount ? cv(tipAmount) : 0;
    totalAmount = Math.max(0, cv(totalAmount) + fixedDelta);
    platformFeeAmount = calcPlatformFeeAmount(totalAmount, feeBps);
  }

  let customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { tenantId, email, name: name || null, country },
    });
    const { triggerWelcomeEmail } = await import("./email-automations.js");
    triggerWelcomeEmail(tenantId, email, name || null).catch(console.error);
  } else if (name) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name, country },
    });
  }

  if (createAccount && password.length >= 8) {
    const passwordHash = await hash(password, 12);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash },
    });
    setCookie(
      c,
      CUSTOMER_COOKIE,
      JSON.stringify({ tenantId, customerId: customer.id }),
      {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      }
    );
  }

  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = String(
    (lastOrder ? parseInt(lastOrder.orderNumber, 10) : 1000) + 1
  );

  const affiliatePartnerId = await resolveAffiliatePartnerIdForOrder(
    c,
    tenantId,
    tenant.slug,
    email,
    String(body.affiliateCode ?? body.ref ?? "").trim() || null
  );

  const utmSource = String(body.utmSource ?? "").trim().slice(0, 80) || null;
  const utmMedium = String(body.utmMedium ?? "").trim().slice(0, 80) || null;
  const utmCampaign = String(body.utmCampaign ?? "").trim().slice(0, 120) || null;
  const landingPath = String(body.landingPath ?? "").trim().slice(0, 200) || null;
  const liveSessionId = String(body.liveSessionId ?? body.sessionId ?? "")
    .trim()
    .slice(0, 64) || null;

  const productIds = lineData.map((l) => l.productId);
  const productMeta = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      preorderEnabled: true,
      tryBeforeYouBuyEnabled: true,
      tryBeforeYouBuyDays: true,
      subscriptionEnabled: true,
      subscriptionInterval: true,
      sellAsGiftCard: true,
    },
  });
  for (const l of lineData) {
    const meta = productMeta.find((p) => p.id === l.productId);
    if (meta?.sellAsGiftCard) l.sellAsGiftCard = true;
  }
  const hasPreorder = productMeta.some((p) => p.preorderEnabled);
  const tbyb = productMeta.find((p) => p.tryBeforeYouBuyEnabled);
  const subLines = lineData.filter((l) => l.subscriptionEnabled);
  const isSubscriptionCheckout = subLines.length > 0;
  const firstLine = lineData[0];
  const firstSub = subLines[0];
  if (isSubscriptionCheckout) {
    if (subLines.length !== lineData.length) {
      throw new Error(
        "Mix subscription and one-time items in separate checkouts"
      );
    }
    const intervals = new Set(
      subLines.map((l) => l.subscriptionInterval || "month")
    );
    if (intervals.size > 1) {
      throw new Error("All subscription items must share the same interval");
    }
  }
  const subscriptionInterval = isSubscriptionCheckout
    ? ((firstSub?.subscriptionInterval as "week" | "month" | "year") ??
      "month")
    : null;

  const { computeOrderRiskScore } = await import("./fraud-score.js");
  const risk = computeOrderRiskScore({
    email,
    totalAmount,
    country,
    hasPhysical,
    shippingPostal,
    isNewCustomer: !customer.createdAt || Date.now() - customer.createdAt.getTime() < 60_000,
    isB2b: Boolean(customer.b2bCompanyId),
  });
  const buyerProtection =
    Boolean(tenant.settings?.buyerProtectionEnabled) &&
    hasPhysical &&
    !isSubscriptionCheckout &&
    (fulfillmentMethod === "SHIP" || fulfillmentMethod === "PICKUP");
  const captureMethod: "automatic" | "manual" =
    tbyb || risk.hold || buyerProtection ? "manual" : "automatic";

  // B2B net terms: mark hold for invoice-style (no immediate capture required for terms)
  const company = customer.b2bCompanyId
    ? await prisma.b2bCompany.findUnique({ where: { id: customer.b2bCompanyId } })
    : null;
  const netTerms = company?.paymentTermsDays && company.paymentTermsDays > 0;

  const needsAddress = hasPhysical && fulfillmentMethod === "SHIP";
  if (needsAddress && (!shippingAddress1 || !shippingCity || !shippingRegion || !shippingPostal || !shippingPhone)) {
    throw new Error("Enter a full shipping address, state or region, postal code, and phone.");
  }

  return {
    tenantId,
    tenantSlug: tenant.slug,
    stripeAccountId: tenant.stripeAccountId,
    stripeChargesEnabled: tenant.stripeChargesEnabled,
    feeBps,
    email,
    currency,
    subtotal,
    shippingAmount,
    taxAmount,
    discountAmount,
    totalAmount,
    platformFeeAmount,
    discountCodeId,
    giftCardId,
    giftCardAmount,
    loyaltyPointsSpent,
    loyaltyDiscountAmount,
    storeCreditAmount: storeCreditAmountConverted,
    tipAmount: tipAmountConverted,
    customFields,
    bnplEnabled: settings?.bnplEnabled === true,
    giftWrapAmount,
    giftMessage,
    country,
    hasPhysical,
    shippingName: needsAddress ? shippingName || name : shippingName || name || null,
    shippingAddress1: needsAddress ? shippingAddress1 || null : null,
    shippingAddress2: needsAddress ? shippingAddress2 || null : null,
    shippingCity: needsAddress ? shippingCity || null : null,
    shippingRegion: needsAddress ? shippingRegion || null : null,
    shippingPostal: needsAddress ? shippingPostal || null : null,
    shippingPhone: shippingPhone || null,
    customerId: customer.id,
    orderNumber,
    accessToken: newAccessToken(),
    stripeTaxEnabled,
    stripeLinkEnabled,
    stripePaypalEnabled,
    shippingLabel,
    affiliatePartnerId,
    utmSource,
    utmMedium,
    utmCampaign,
    landingPath,
    liveSessionId,
    fulfillmentMethod,
    pickupWarehouseId,
    b2bCompanyId: customer.b2bCompanyId ?? null,
    isSubscriptionCheckout,
    subscriptionInterval,
    subscriptionProductId: isSubscriptionCheckout
      ? firstLine?.productId ?? null
      : null,
    hasPreorder,
    hasTryBeforeYouBuy: !!tbyb,
    tryBeforeYouBuyDays: tbyb?.tryBeforeYouBuyDays ?? null,
    riskScore: risk.score,
    riskLevel: risk.level,
    paymentHold: risk.hold || Boolean(netTerms) || buyerProtection,
    captureMethod: netTerms ? "manual" : captureMethod,
    buyerProtection,
    lineData,
  };
}

async function createPendingOrder(prepared: PreparedOrder) {
  const notes: string[] = ["Order created — awaiting payment"];
  if (prepared.hasPreorder) notes.push("Contains pre-order items");
  if (prepared.hasTryBeforeYouBuy) {
    notes.push(
      `Try-before-you-buy (${prepared.tryBeforeYouBuyDays ?? 30} days)`
    );
  }
  if (prepared.fulfillmentMethod === "PICKUP") {
    notes.push("Fulfillment: store pickup");
  }
  if (prepared.isSubscriptionCheckout) {
    notes.push(`Subscription (${prepared.subscriptionInterval})`);
  }
  if (prepared.paymentHold) {
    notes.push(`Payment hold — risk ${prepared.riskLevel} (${prepared.riskScore})`);
  }
  if (prepared.captureMethod === "manual") {
    notes.push(
      prepared.buyerProtection
        ? "Buyer protection — charge when the order ships"
        : "Authorize only — capture later"
    );
  }
  if (prepared.giftWrapAmount > 0 || prepared.giftMessage) {
    notes.push(`Gift wrap ${(prepared.giftWrapAmount / 100).toFixed(2)} ${prepared.currency}`);
  }
  if (prepared.giftMessage) {
    notes.push(`Gift card: ${prepared.giftMessage}`);
  }
  if (prepared.tipAmount > 0) {
    notes.push(`Tip ${(prepared.tipAmount / 100).toFixed(2)} ${prepared.currency}`);
  }
  if (prepared.storeCreditAmount > 0) {
    notes.push(
      `Store credit applied ${(prepared.storeCreditAmount / 100).toFixed(2)} ${prepared.currency}`
    );
  }
  if (prepared.customFields) {
    for (const [k, v] of Object.entries(prepared.customFields)) {
      notes.push(`${k}: ${v}`.slice(0, 300));
    }
  }

  const order = await prisma.order.create({
    data: {
      tenantId: prepared.tenantId,
      customerId: prepared.customerId,
      orderNumber: prepared.orderNumber,
      status: OrderStatus.PENDING,
      currency: prepared.currency,
      subtotalAmount: prepared.subtotal,
      shippingAmount: prepared.shippingAmount,
      taxAmount: prepared.taxAmount,
      discountAmount: prepared.discountAmount,
      totalAmount: prepared.totalAmount,
      platformFeeAmount: prepared.platformFeeAmount,
      shippingCountry: prepared.country,
      shippingName: prepared.shippingName,
      shippingAddress1: prepared.shippingAddress1,
      shippingAddress2: prepared.shippingAddress2,
      shippingCity: prepared.shippingCity,
      shippingRegion: prepared.shippingRegion,
      shippingPostal: prepared.shippingPostal,
      shippingPhone: prepared.shippingPhone,
      discountCodeId: prepared.discountCodeId,
      giftCardId: prepared.giftCardId,
      giftCardAmount: prepared.giftCardAmount,
      loyaltyPointsSpent: prepared.loyaltyPointsSpent,
      loyaltyDiscountAmount: prepared.loyaltyDiscountAmount,
      storeCreditAmount: prepared.storeCreditAmount,
      tipAmount: prepared.tipAmount,
      ...(prepared.customFields ? { customFields: prepared.customFields } : {}),
      affiliatePartnerId: prepared.affiliatePartnerId,
      utmSource: prepared.utmSource,
      utmMedium: prepared.utmMedium,
      utmCampaign: prepared.utmCampaign,
      landingPath: prepared.landingPath,
      accessToken: prepared.accessToken,
      guestEmail: prepared.email,
      fulfillmentMethod: prepared.fulfillmentMethod,
      pickupWarehouseId: prepared.pickupWarehouseId,
      b2bCompanyId: prepared.b2bCompanyId,
      riskScore: prepared.riskScore,
      riskLevel: prepared.riskLevel,
      paymentHold: prepared.paymentHold,
      captureMethod: prepared.captureMethod,
      buyerProtection: prepared.buyerProtection,
      paymentCaptureStatus: "NONE",
      items: {
        create: prepared.lineData.map((l) => ({
          tenantId: prepared.tenantId,
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          totalAmount: l.totalAmount,
        })),
      },
      events: {
        create: notes.map((body) => ({
          tenantId: prepared.tenantId,
          type: "STATUS_CHANGE",
          body,
        })),
      },
    },
  });
  const { routeOrderLinesToWarehouses } = await import("./fulfillment-routing.js");
  await routeOrderLinesToWarehouses(order.id).catch(() => {});
  const { reserveInventoryForOrder } = await import("./inventory.js");
  await reserveInventoryForOrder(order.id).catch(() => {});
  const { notifyMerchantPendingOrder } = await import("./notifications.js");
  await notifyMerchantPendingOrder(order.id).catch(() => {});
  if (prepared.liveSessionId) {
    const { markLiveVisitorPurchased } = await import("./live-view.js");
    await markLiveVisitorPurchased(prepared.tenantId, prepared.liveSessionId).catch(
      () => {}
    );
  }
  return order;
}

async function createStripeCheckout(
  prepared: PreparedOrder,
  orderId: string,
  locale: string
) {
  const mor = isMorPaymentModel();
  if (
    !mor &&
    (!prepared.stripeAccountId || !prepared.stripeChargesEnabled)
  ) {
    throw new Error("This store has not connected Stripe payments yet");
  }
  if (mor && !isStripeConfigured()) {
    throw new Error("Platform payments are not configured");
  }
  const stripe = getStripe();
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const successUrl = new URL(`${base}/orders/${orderId}`);
  successUrl.searchParams.set("tenant", prepared.tenantSlug);
  successUrl.searchParams.set("locale", locale);
  successUrl.searchParams.set("token", prepared.accessToken);
  successUrl.searchParams.set("paid", "1");

  const cancelUrl = new URL(`${base}/checkout`);
  cancelUrl.searchParams.set("tenant", prepared.tenantSlug);
  cancelUrl.searchParams.set("locale", locale);

  const applicationFee =
    !mor &&
    prepared.platformFeeAmount > 0 &&
    prepared.platformFeeAmount < prepared.totalAmount
      ? prepared.platformFeeAmount
      : undefined;

  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    ["card"];
  if (prepared.stripeLinkEnabled) paymentMethodTypes.push("link");
  if (prepared.stripePaypalEnabled && !prepared.isSubscriptionCheckout) {
    paymentMethodTypes.push("paypal");
  }
  if (
    prepared.bnplEnabled &&
    !prepared.isSubscriptionCheckout &&
    prepared.captureMethod === "automatic"
  ) {
    const { bnplMethodsForCurrency } = await import("./checkout-extras.js");
    for (const m of bnplMethodsForCurrency(prepared.currency)) {
      paymentMethodTypes.push(
        m as Stripe.Checkout.SessionCreateParams.PaymentMethodType
      );
    }
  }

  const customer = await prisma.customer.findUnique({
    where: { id: prepared.customerId },
  });
  let stripeCustomerId = customer?.stripeCustomerId ?? undefined;
  if (prepared.isSubscriptionCheckout && !stripeCustomerId) {
    const sc = await stripe.customers.create({
      email: prepared.email,
      name: prepared.shippingName ?? undefined,
      metadata: {
        tenantId: prepared.tenantId,
        customerId: prepared.customerId,
      },
    });
    stripeCustomerId = sc.id;
    await prisma.customer.update({
      where: { id: prepared.customerId },
      data: { stripeCustomerId: sc.id },
    });
  }

  if (prepared.isSubscriptionCheckout && prepared.subscriptionInterval) {
    const interval = prepared.subscriptionInterval;
    const feePercent =
      !mor && prepared.feeBps > 0
        ? Math.min(99, prepared.feeBps / 100)
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : prepared.email,
      line_items: [
        {
          price_data: {
            currency: prepared.currency.toLowerCase(),
            unit_amount: prepared.totalAmount,
            recurring: { interval },
            product_data: {
              name: prepared.lineData[0]?.title ?? `Order #${prepared.orderNumber}`,
              ...(mor ? { description: `Store: ${prepared.tenantSlug}` } : {}),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId,
        tenantId: prepared.tenantId,
        paymentModel: mor ? "mor" : "connect",
        type: "product_subscription",
        productId: prepared.subscriptionProductId ?? "",
      },
      subscription_data: {
        metadata: {
          orderId,
          tenantId: prepared.tenantId,
          customerId: prepared.customerId,
          productId: prepared.subscriptionProductId ?? "",
          type: "product_subscription",
        },
        ...(!mor && feePercent
          ? { application_fee_percent: feePercent }
          : {}),
        ...(!mor && prepared.stripeAccountId
          ? {
              transfer_data: { destination: prepared.stripeAccountId },
            }
          : {}),
      },
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripeCheckoutSessionId: session.id,
        stripeSubscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null,
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return session.url;
  }

  const sessionBase: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: paymentMethodTypes,
    customer_email: prepared.email,
    ...(prepared.stripeTaxEnabled
      ? {
          automatic_tax: { enabled: true },
          shipping_address_collection: {
            allowed_countries: [...STRIPE_SHIPPING_COUNTRIES],
          },
        }
      : {}),
    line_items: [
      {
        price_data: {
          currency: prepared.currency.toLowerCase(),
          unit_amount: prepared.totalAmount,
          product_data: {
            name: `Order #${prepared.orderNumber}`,
            ...(mor ? { description: `Store: ${prepared.tenantSlug}` } : {}),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId,
      tenantId: prepared.tenantId,
      paymentModel: mor ? "mor" : "connect",
    },
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  };

  const captureMethod =
    prepared.captureMethod === "manual" ? ("manual" as const) : ("automatic" as const);

  const piExtras: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    capture_method: captureMethod,
    metadata: {
      orderId,
      tenantId: prepared.tenantId,
      paymentModel: mor ? "mor" : "connect",
      riskScore: String(prepared.riskScore),
      riskLevel: prepared.riskLevel,
    },
  };

  const session = mor
    ? await stripe.checkout.sessions.create({
        ...sessionBase,
        payment_intent_data: piExtras,
      })
    : await stripe.checkout.sessions.create({
        ...sessionBase,
        payment_intent_data: {
          ...piExtras,
          application_fee_amount: applicationFee,
          transfer_data: { destination: prepared.stripeAccountId! },
        },
      });

  await prisma.order.update({
    where: { id: orderId },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function placeStoreOrder(
  c: Context,
  tenantId: string,
  body: Record<string, unknown>
) {
  const prepared = await prepareOrder(c, tenantId, body);
  if (isMorPaymentModel() && prepared.totalAmount > 0) {
    const { assertCheckoutNewShopGmv } = await import("./mor-risk-db.js");
    const tenantMeta = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, createdAt: true },
    });
    if (tenantMeta) {
      await assertCheckoutNewShopGmv(tenantMeta, prepared.totalAmount);
    }
  }
  const locale = String(body.locale ?? "en").slice(0, 5);

  if (prepared.isSubscriptionCheckout) {
    // Regional gateways don't support recurring billing yet
  }

  // Fully covered by gift card / loyalty / store credit — no gateway needed.
  if (prepared.totalAmount <= 0 && !prepared.isSubscriptionCheckout) {
    const order = await createPendingOrder(prepared);
    await fulfillPaidOrder(order.id, { platformFeeAmount: 0 });
    const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
    setCart(c, remaining);
    await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(() => {});
    return {
      mode: "demo" as const,
      orderId: order.id,
      accessToken: prepared.accessToken,
      orderNumber: prepared.orderNumber,
    };
  }

  const useFinik =
    !prepared.isSubscriptionCheckout && shouldUseFinikCheckout(prepared.currency);
  const useGoPay =
    !prepared.isSubscriptionCheckout &&
    !useFinik &&
    shouldUseGoPayCheckout(prepared.currency);
  const useStripe =
    !useFinik &&
    !useGoPay &&
    isStripeConfigured() &&
    (isMorPaymentModel() ||
      Boolean(prepared.stripeAccountId && prepared.stripeChargesEnabled));

  if (useFinik) {
    const order = await createPendingOrder(prepared);
    const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
    setCart(c, remaining);
    await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(
      () => {}
    );
    const { checkoutUrl } = await createFinikCheckout(
      prepared,
      order.id,
      locale
    );
    return {
      mode: "finik" as const,
      orderId: order.id,
      orderNumber: prepared.orderNumber,
      checkoutUrl,
    };
  }

  if (useGoPay) {
    const order = await createPendingOrder(prepared);
    const gopayOrderId = newGoPayOrderId();
    const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
    setCart(c, remaining);
    await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(
      () => {}
    );
    const checkoutUrl = await createGoPayCheckout(
      prepared,
      order.id,
      gopayOrderId,
      locale
    );
    return {
      mode: "gopay" as const,
      orderId: order.id,
      orderNumber: prepared.orderNumber,
      checkoutUrl,
    };
  }

  if (useStripe) {
    const order = await createPendingOrder(prepared);
    const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
    setCart(c, remaining);
    await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(
      () => {}
    );
    const checkoutUrl = await createStripeCheckout(prepared, order.id, locale);
    return {
      mode: "stripe" as const,
      orderId: order.id,
      orderNumber: prepared.orderNumber,
      checkoutUrl,
    };
  }

  const order = await createPendingOrder(prepared);
  await fulfillPaidOrder(order.id, {
    platformFeeAmount: prepared.platformFeeAmount,
  });

  const remaining = getCart(c).filter((i) => i.tenantId !== tenantId);
  setCart(c, remaining);
  await markAbandonedCartConverted(tenantId, getStoreSessionKey(c)).catch(() => {});

  return {
    mode: "demo" as const,
    orderId: order.id,
    accessToken: prepared.accessToken,
    orderNumber: prepared.orderNumber,
  };
}

export function updateCartItem(
  c: Context,
  tenantId: string,
  item: CartItem,
  quantity: number
) {
  const cart = getCart(c);
  const key = cartKey(item);
  const idx = cart.findIndex((i) => cartKey(i) === key);
  if (idx === -1) return getCart(c);
  if (quantity <= 0) cart.splice(idx, 1);
  else cart[idx]!.quantity = quantity;
  setCart(c, cart);
  return cart;
}

export function addCartItem(c: Context, item: CartItem) {
  const cart = getCart(c);
  const key = cartKey(item);
  const existing = cart.find((i) => cartKey(i) === key);
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  setCart(c, cart);
  return cart;
}

export function removeCartItem(
  c: Context,
  item: Pick<CartItem, "productId" | "variantId" | "tenantId" | "unitAmountCents">
) {
  const key = cartKey({ ...item, quantity: 1 });
  const cart = getCart(c).filter((i) => cartKey(i) !== key);
  setCart(c, cart);
  return cart;
}
