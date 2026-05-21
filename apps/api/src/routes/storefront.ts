import { readFile } from "fs/promises";
import path from "path";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
  PromotionType,
} from "@ugclab/database";
import { getMessages } from "@ugclab/i18n";
import { hash, compare } from "bcryptjs";
import { validateDiscountCode } from "../lib/checkout.js";
import { getCollectionProducts } from "../lib/store-collections.js";
import { getUploadRoot } from "../lib/uploads.js";
import {
  cartKey,
  CUSTOMER_COOKIE,
  getCart,
  resolveTenantBySlug,
  setCart,
} from "../lib/store-cart.js";
import {
  addCartItem,
  placeStoreOrder,
  removeCartItem,
  updateCartItem,
} from "../lib/store-place-order.js";
import { syncAbandonedCart } from "../lib/abandoned-cart.js";
import {
  ensureDefaultAutomations,
  triggerWelcomeEmail,
} from "../lib/email-automations.js";
import { isAnnouncementActive, parseStoreTheme } from "../lib/store-theme.js";
import { buildProductSearchWhere } from "../lib/product-search.js";
import { displayCurrencyMeta, priceForDisplay } from "../lib/store-display-currency.js";
import { resolveTenantFromHost } from "@ugclab/tenant";

const store = new Hono();

function tenantSlug(c: { req: { query: (k: string) => string | undefined } }) {
  return String(c.req.query("tenant") ?? "demo").toLowerCase();
}

function pickLocale(settings: { defaultLocale: string; enabledLocales: string[] } | null, q?: string) {
  const enabled = settings?.enabledLocales?.length ? settings.enabledLocales : ["en"];
  const locale = q ?? settings?.defaultLocale ?? "en";
  return enabled.includes(locale) ? locale : settings?.defaultLocale ?? "en";
}

function mapProduct(p: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ProductType;
  priceAmount: number;
  compareAt?: number | null;
  inventory?: number | null;
  translations?: unknown;
  images?: { storageKey: string }[];
  variants?: { id: string }[];
}) {
  const variantCount = p.variants?.length ?? 0;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    type: p.type,
    priceAmount: p.priceAmount,
    compareAt: p.compareAt ?? null,
    translations: p.translations,
    imageKey: p.images?.[0]?.storageKey ?? null,
    inventory: p.inventory ?? null,
    variantCount,
    defaultVariantId: p.variants?.[0]?.id ?? null,
    quickAdd:
      variantCount <= 1 &&
      !(p.type === "PHYSICAL" && p.inventory != null && p.inventory <= 0),
  };
}

function localize<T extends { title: string; description: string | null; translations?: unknown }>(
  product: T,
  locale: string
): T {
  const tr = product.translations as Record<string, { title?: string; description?: string }> | null;
  const loc = tr?.[locale];
  if (!loc) return product;
  return {
    ...product,
    title: loc.title?.trim() || product.title,
    description: loc.description?.trim() || product.description,
  };
}

store.get("/context", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const [collections, storePages, promotions] = await Promise.all([
    prisma.collection.findMany({
      where: { tenantId: tenant.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, description: true },
    }),
    prisma.storePage.findMany({
      where: { tenantId: tenant.id, pageType: "PAGE", published: true },
      orderBy: { title: "asc" },
      select: { title: true, slug: true },
    }),
    prisma.storePromotion.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cart = getCart(c).filter((i) => i.tenantId === tenant.id);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const currency = tenant.settings?.currency ?? "USD";
  const { displayCurrency, baseCurrency, showConversion } = displayCurrencyMeta(
    locale,
    tenant.settings
  );
  const sf = getMessages().storefront;

  const preview = c.req.query("preview") === "1";
  const themeRaw =
    preview && tenant.settings?.themeDraft
      ? tenant.settings.themeDraft
      : tenant.settings?.theme;
  const theme = parseStoreTheme(themeRaw);
  const now = new Date();
  const activePromotions = promotions.filter(
    (p) =>
      (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now)
  );
  const promoAnnouncements = activePromotions
    .map((p) => {
      if (p.type === PromotionType.CART_PERCENT && p.value > 0) {
        const min =
          p.minOrderAmount != null
            ? ` on orders over ${(p.minOrderAmount / 100).toFixed(0)} ${currency}`
            : "";
        return `${p.value}% off your order${min}`;
      }
      if (p.type === PromotionType.FREE_SHIPPING) {
        const min =
          p.minOrderAmount != null
            ? ` on orders over ${(p.minOrderAmount / 100).toFixed(0)} ${currency}`
            : "";
        return `Free shipping${min}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  const announcements = [...promoAnnouncements];
  if (isAnnouncementActive(theme)) {
    announcements.unshift(theme.announcementText!);
  }

  const featuredCollection = theme.heroCollectionSlug
    ? collections.find((c) => c.slug === theme.heroCollectionSlug) ?? null
    : null;

  return c.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    locale,
    currency: displayCurrency,
    baseCurrency,
    showCurrencyConversion: showConversion,
    primaryColor: tenant.settings?.primaryColor ?? "#7c3aed",
    logoUrl: tenant.settings?.logoUrl,
    enabledLocales: tenant.settings?.enabledLocales ?? ["en"],
    collections,
    storePages,
    announcements,
    theme,
    featuredCollection,
    cartCount,
    cartLabel: sf.cart,
    settings: tenant.settings,
    checkoutGuestLookup: tenant.settings?.checkoutGuestLookup !== false,
    checkoutFooterText: tenant.settings?.checkoutFooterText ?? null,
    payments: {
      stripeLive:
        Boolean(process.env.STRIPE_SECRET_KEY) &&
        Boolean(tenant.stripeAccountId) &&
        tenant.stripeChargesEnabled,
      demoMode: !process.env.STRIPE_SECRET_KEY,
    },
  });
});

store.get("/resolve-host", async (c) => {
  const host =
    c.req.query("host") ?? c.req.header("host") ?? "";
  const baseDomain = process.env.STORE_BASE_DOMAIN ?? process.env.STOREFRONT_BASE_DOMAIN;
  const resolved = await resolveTenantFromHost({
    host,
    baseDomain,
    queryTenant: null,
  });
  if (!resolved) return c.json({ error: "Store not found" }, 404);
  return c.json({ slug: resolved.slug, name: resolved.name });
});

store.get("/products", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const q = c.req.query("q")?.trim();
  const sort = c.req.query("sort");
  const typeFilter = c.req.query("type");
  const tag = c.req.query("tag");
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(locale, tenant.settings);

  let orderBy: { createdAt?: "desc"; priceAmount?: "asc" | "desc" } = {
    createdAt: "desc",
  };
  if (sort === "price_asc") orderBy = { priceAmount: "asc" };
  if (sort === "price_desc") orderBy = { priceAmount: "desc" };

  const productType =
    typeFilter && Object.values(ProductType).includes(typeFilter as ProductType)
      ? (typeFilter as ProductType)
      : undefined;

  const featured = c.req.query("featured");
  const saleFilter = featured === "sale";
  const newArrivals = featured === "new_arrivals";

  const [rawProducts, tagRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        status: ProductStatus.ACTIVE,
        ...(productType ? { type: productType } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(saleFilter ? { compareAt: { not: null } } : {}),
        ...(q ? buildProductSearchWhere(q) : {}),
      },
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        variants: { select: { id: true }, orderBy: { title: "asc" } },
      },
      orderBy,
      ...(newArrivals || saleFilter ? { take: saleFilter ? 50 : 8 } : {}),
    }),
    prisma.product.findMany({
      where: { tenantId: tenant.id, status: ProductStatus.ACTIVE },
      select: { tags: true },
    }),
  ]);

  let products = rawProducts;
  if (saleFilter) {
    products = rawProducts
      .filter((p) => p.compareAt != null && p.compareAt > p.priceAmount)
      .slice(0, 8);
  }

  const allTags = [...new Set(tagRows.flatMap((p) => p.tags))].sort();
  return c.json({
    currency: displayCurrency,
    baseCurrency,
    products: products.map((p) =>
      priceForDisplay(localize(mapProduct(p), locale), locale, tenant.settings)
    ),
    tags: allTags,
  });
});

store.get("/products/:productSlug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(locale, tenant.settings);
  const product = await prisma.product.findFirst({
    where: {
      tenantId: tenant.id,
      slug: c.req.param("productSlug"),
      status: ProductStatus.ACTIVE,
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { title: "asc" } },
    },
  });
  if (!product) return c.json({ error: "Not found" }, 404);

  const reviews = await prisma.productReview.findMany({
    where: { productId: product.id, approved: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const questions = await prisma.productQuestion.findMany({
    where: { productId: product.id, approved: true, answer: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const mapped = localize(
    {
      ...mapProduct({ ...product, images: product.images }),
      description: product.description,
    },
    locale
  );

  const translations = product.translations as Record<string, unknown> | null;
  const seoMeta = (translations?._seo as { title?: string; description?: string }) ?? {};

  return c.json({
    currency: displayCurrency,
    baseCurrency,
    product: {
      ...priceForDisplay(mapped, locale, tenant.settings),
      seoTitle: String(seoMeta.title ?? "").trim() || mapped.title,
      seoDescription: String(seoMeta.description ?? "").trim() || null,
      images: product.images.map((img) => ({
        storageKey: img.storageKey,
        alt: img.alt,
      })),
      variants: product.variants.map((v) =>
        priceForDisplay(
          { ...v, priceAmount: v.priceAmount, compareAt: null },
          locale,
          tenant.settings
        )
      ),
      inventory: product.inventory,
    },
    reviews,
    questions,
  });
});

store.get("/search/suggest", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return c.json({ suggestions: [] });

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      status: ProductStatus.ACTIVE,
      ...buildProductSearchWhere(q),
    },
    select: { id: true, title: true, slug: true, tags: true, barcode: true },
    take: 8,
    orderBy: { title: "asc" },
  });

  return c.json({
    suggestions: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      tags: p.tags,
      barcode: p.barcode,
    })),
  });
});

store.get("/products/recent", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(locale, tenant.settings);
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (ids.length === 0) return c.json({ currency: displayCurrency, products: [] });

  const raw = await prisma.product.findMany({
    where: { tenantId: tenant.id, id: { in: ids }, status: ProductStatus.ACTIVE },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      variants: { select: { id: true }, orderBy: { title: "asc" } },
    },
  });
  const byId = new Map(raw.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof raw;

  return c.json({
    currency: displayCurrency,
    baseCurrency,
    products: ordered.map((p) =>
      priceForDisplay(localize(mapProduct(p), locale), locale, tenant.settings)
    ),
  });
});

store.post("/questions", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    authorName: string;
    authorEmail?: string;
    question: string;
  }>();
  const authorName = String(body.authorName ?? "").trim();
  const question = String(body.question ?? "").trim();
  if (!authorName || question.length < 5) {
    return c.json({ error: "Name and question (min 5 chars) required" }, 400);
  }
  const product = await prisma.product.findFirst({
    where: { id: body.productId, tenantId: tenant.id, status: ProductStatus.ACTIVE },
  });
  if (!product) return c.json({ error: "Product not found" }, 404);

  await prisma.productQuestion.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      authorName,
      authorEmail: body.authorEmail?.trim() || null,
      question,
    },
  });
  return c.json({ ok: true });
});

store.get("/collections", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const collections = await prisma.collection.findMany({
    where: { tenantId: tenant.id },
    orderBy: { title: "asc" },
  });
  return c.json({ collections });
});

store.get("/collections/:collectionSlug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const { displayCurrency } = displayCurrencyMeta(locale, tenant.settings);

  const collection = await prisma.collection.findFirst({
    where: { tenantId: tenant.id, slug: c.req.param("collectionSlug") },
    include: { products: true },
  });
  if (!collection) return c.json({ error: "Not found" }, 404);

  const products = await getCollectionProducts(tenant.id, collection);
  const themeRaw =
    c.req.query("preview") === "1" && tenant.settings?.themeDraft
      ? tenant.settings.themeDraft
      : tenant.settings?.theme;
  const theme = parseStoreTheme(themeRaw);
  const hero = theme.collectionHeroes?.[collection.slug] ?? null;
  const seo = theme.collectionSeo?.[collection.slug];
  return c.json({
    collection: {
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      seoTitle: seo?.seoTitle ?? null,
      seoDescription: seo?.seoDescription ?? null,
    },
    currency: displayCurrency,
    hero,
    products: products.map((p) =>
      priceForDisplay(localize(mapProduct(p), locale), locale, tenant.settings)
    ),
  });
});

store.get("/cart", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const items = getCart(c).filter((i) => i.tenantId === tenant.id);
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });

  let total = 0;
  const lines = items
    .map((item) => {
      const p = products.find((x) => x.id === item.productId);
      if (!p) return null;
      const variant = item.variantId
        ? p.variants.find((v) => v.id === item.variantId)
        : null;
      const unit = variant?.priceAmount ?? p.priceAmount;
      const title = variant ? `${p.title} — ${variant.title}` : p.title;
      const lineTotal = unit * item.quantity;
      total += lineTotal;
      return {
        productId: p.id,
        slug: p.slug,
        variantId: item.variantId,
        title,
        unit,
        lineTotal,
        quantity: item.quantity,
        imageKey: p.images[0]?.storageKey ?? null,
      };
    })
    .filter(Boolean);

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    lines,
    total,
  });
});

async function persistAbandonedCart(c: import("hono").Context, tenant: { id: string; slug: string; settings: { currency?: string } | null }) {
  const items = getCart(c).filter((i) => i.tenantId === tenant.id);
  if (items.length === 0) return;
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true },
  });
  let subtotal = 0;
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId);
    if (!p) continue;
    const variant = item.variantId
      ? p.variants.find((v) => v.id === item.variantId)
      : null;
    subtotal += (variant?.priceAmount ?? p.priceAmount) * item.quantity;
  }
  await syncAbandonedCart({
    c,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    currency: tenant.settings?.currency ?? "USD",
    items,
    subtotalAmount: subtotal,
  });
}

store.post("/cart/add", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    variantId?: string;
    quantity?: number;
  }>();
  const qty = Math.max(1, body.quantity ?? 1);
  addCartItem(c, {
    productId: body.productId,
    tenantId: tenant.id,
    quantity: qty,
    variantId: body.variantId,
  });
  await persistAbandonedCart(c, tenant);
  return c.json({ ok: true });
});

store.post("/cart/email", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const { email } = await c.req.json<{ email: string }>();
  await persistAbandonedCart(c, tenant);
  const items = getCart(c).filter((i) => i.tenantId === tenant.id);
  if (items.length === 0) return c.json({ ok: true });
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true },
  });
  let subtotal = 0;
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId);
    if (!p) continue;
    const variant = item.variantId
      ? p.variants.find((v) => v.id === item.variantId)
      : null;
    subtotal += (variant?.priceAmount ?? p.priceAmount) * item.quantity;
  }
  await syncAbandonedCart({
    c,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    currency: tenant.settings?.currency ?? "USD",
    items,
    email: String(email ?? "").trim().toLowerCase(),
    subtotalAmount: subtotal,
  });
  return c.json({ ok: true });
});

store.patch("/cart", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>();
  updateCartItem(
    c,
    tenant.id,
    {
      productId: body.productId,
      tenantId: tenant.id,
      variantId: body.variantId,
      quantity: 1,
    },
    body.quantity
  );
  await persistAbandonedCart(c, tenant);
  return c.json({ ok: true });
});

store.delete("/cart", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{ productId: string; variantId?: string }>();
  removeCartItem(c, {
    productId: body.productId,
    tenantId: tenant.id,
    variantId: body.variantId,
  });
  await persistAbandonedCart(c, tenant);
  return c.json({ ok: true });
});

store.post("/checkout/validate-discount", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{ code: string; subtotalAmount: number }>();
  try {
    const result = await validateDiscountCode(
      tenant.id,
      body.code,
      body.subtotalAmount
    );
    if (!result) return c.json({ discountAmount: 0 });
    return c.json({
      discountAmount: result.discountAmount,
      code: result.discount.code,
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Invalid code" },
      400
    );
  }
});

store.post("/checkout/place", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const result = await placeStoreOrder(c, tenant.id, body);
    return c.json(result);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      400
    );
  }
});

store.get("/orders/:orderId", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const token = c.req.query("token");
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("orderId"), tenantId: tenant.id },
    include: {
      items: true,
      digitalDownloads: { include: { product: { include: { digitalAsset: true } } } },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.accessToken && order.accessToken !== token) {
    return c.json({ error: "Invalid token" }, 403);
  }
  return c.json({ order });
});

store.get("/account/session", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ customer: null });
  const raw = getCookie(c, CUSTOMER_COOKIE);
  if (!raw) return c.json({ customer: null });
  try {
    const { tenantId, customerId } = JSON.parse(raw) as {
      tenantId: string;
      customerId: string;
    };
    if (tenantId !== tenant.id) return c.json({ customer: null });
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return c.json({ customer });
  } catch {
    return c.json({ customer: null });
  }
});

store.post("/account/lookup", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const { email } = await c.req.json<{ email: string }>();
  const norm = String(email ?? "").trim().toLowerCase();
  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      OR: [{ guestEmail: norm }, { customer: { email: norm } }],
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      accessToken: true,
    },
  });
  return c.json({ orders });
});

store.post("/account/login", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  const norm = String(email ?? "").trim().toLowerCase();
  const customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: norm } },
  });
  if (!customer?.passwordHash) {
    return c.json({ error: "Account not found" }, 400);
  }
  const ok = await compare(password, customer.passwordHash);
  if (!ok) return c.json({ error: "Invalid password" }, 400);
  setCookie(
    c,
    CUSTOMER_COOKIE,
    JSON.stringify({ tenantId: tenant.id, customerId: customer.id }),
    { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 90 }
  );
  return c.json({ ok: true });
});

store.get("/policies/:kind", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const kind = c.req.param("kind");
  const s = tenant.settings;
  const body =
    kind === "privacy" ? s?.privacyPolicy : kind === "refund" ? s?.refundPolicy : null;
  const externalUrl =
    kind === "privacy" ? s?.privacyUrl : kind === "refund" ? s?.refundUrl : null;
  if (!body && !externalUrl) return c.json({ error: "Not found" }, 404);
  return c.json({ body, externalUrl });
});

store.get("/wishlist", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ items: [] });
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (ids.length === 0) return c.json({ items: [] });
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, id: { in: ids }, status: ProductStatus.ACTIVE },
    select: { id: true, title: true, slug: true, priceAmount: true },
  });
  return c.json({
    items: products.map((p) => ({
      productId: p.id,
      title: p.title,
      slug: p.slug,
      priceAmount: p.priceAmount,
    })),
  });
});

store.get("/pages/:slug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const page = await prisma.storePage.findFirst({
    where: {
      tenantId: tenant.id,
      slug: c.req.param("slug"),
      pageType: "PAGE",
      published: true,
    },
  });
  if (!page) return c.json({ error: "Not found" }, 404);
  const settings = tenant.settings;
  const theme = parseStoreTheme(
    c.req.query("preview") === "1" && settings?.themeDraft
      ? settings.themeDraft
      : settings?.theme
  );
  const pageBlocks = theme.pageBlocks?.[page.slug];
  return c.json({
    page: {
      title: page.title,
      slug: page.slug,
      body: page.body,
      seoTitle: page.title,
      blocks: pageBlocks ?? null,
    },
  });
});

store.get("/blog", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const posts = await prisma.storePage.findMany({
    where: { tenantId: tenant.id, pageType: "BLOG", published: true },
    orderBy: { createdAt: "desc" },
    select: { title: true, slug: true, body: true, createdAt: true },
  });
  return c.json({ posts });
});

store.get("/blog/:slug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const post = await prisma.storePage.findFirst({
    where: {
      tenantId: tenant.id,
      slug: c.req.param("slug"),
      pageType: "BLOG",
      published: true,
    },
  });
  if (!post) return c.json({ error: "Not found" }, 404);
  return c.json({ post });
});

store.get("/reviews", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const limit = Math.min(parseInt(c.req.query("limit") ?? "8", 10) || 8, 20);
  const reviews = await prisma.productReview.findMany({
    where: { tenantId: tenant.id, approved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      authorName: true,
      rating: true,
      body: true,
      createdAt: true,
      product: { select: { title: true, slug: true } },
    },
  });
  return c.json({ reviews });
});

store.post("/reviews", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    authorName: string;
    authorEmail?: string;
    rating: number;
    body?: string;
    photoUrls?: string[];
  }>();
  const authorName = String(body.authorName ?? "").trim();
  const rating = Number(body.rating);
  if (!authorName || rating < 1 || rating > 5) {
    return c.json({ error: "Invalid review" }, 400);
  }
  const product = await prisma.product.findFirst({
    where: { id: body.productId, tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Product not found" }, 404);
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls.map((u) => String(u).trim()).filter((u) => u.startsWith("http")).slice(0, 4)
    : [];
  await prisma.productReview.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      authorName,
      authorEmail: body.authorEmail?.trim() || null,
      rating,
      body: body.body?.trim() || null,
      photoUrls,
      approved: false,
    },
  });
  return c.json({ ok: true });
});

store.get("/download/:token", async (c) => {
  const download = await prisma.digitalDownload.findUnique({
    where: { token: c.req.param("token") },
    include: {
      order: true,
      product: { include: { digitalAsset: true } },
    },
  });
  if (
    !download ||
    !download.product.digitalAsset ||
    (download.order.status !== OrderStatus.PAID &&
      download.order.status !== OrderStatus.FULFILLED)
  ) {
    return c.json({ error: "Not found" }, 404);
  }
  if (download.expiresAt && download.expiresAt < new Date()) {
    return c.json({ error: "Download link expired" }, 403);
  }
  const asset = download.product.digitalAsset;
  if (download.downloads >= asset.downloadLimit) {
    return c.json({ error: "Download limit reached" }, 403);
  }
  const filePath = path.join(getUploadRoot(), asset.storageKey);
  try {
    const buf = await readFile(filePath);
    await prisma.digitalDownload.update({
      where: { id: download.id },
      data: { downloads: { increment: 1 } },
    });
    return c.body(buf, 200, {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `attachment; filename="${asset.fileName}"`,
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

store.get("/sitemap.xml", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.text("Not found", 404);
  const { buildStoreSitemapXml } = await import("../lib/sitemap.js");
  const xml = await buildStoreSitemapXml(tenant.id, slug);
  return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

store.post("/newsletter/subscribe", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const body = await c.req.json<{ email?: string; name?: string }>();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  await prisma.emailSubscriber.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    create: {
      tenantId: tenant.id,
      email,
      name: body.name?.trim() || null,
      source: "newsletter",
    },
    update: { marketingOptOut: false, name: body.name?.trim() || undefined },
  });

  const existing = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!existing) {
    await prisma.customer.create({
      data: { tenantId: tenant.id, email, name: body.name?.trim() || null },
    });
    await ensureDefaultAutomations(tenant.id);
    triggerWelcomeEmail(tenant.id, email, body.name?.trim() || null).catch(
      console.error
    );
  }

  return c.json({ ok: true });
});

store.get("/robots.txt", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.text("Not found", 404);
  const { buildRobotsTxt } = await import("../lib/sitemap.js");
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const url = `${base}/api/store/sitemap.xml?tenant=${encodeURIComponent(slug)}`;
  return c.text(buildRobotsTxt(url), 200, { "Content-Type": "text/plain; charset=utf-8" });
});

export { store };
