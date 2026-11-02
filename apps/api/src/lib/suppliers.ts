import { OrderStatus, ProductStatus, ProductType, SupplierProvider, prisma } from "@ugclab/database";
import { normalizeSlug } from "./merchant.js";
import { downloadRemoteImage, saveProductImage } from "./uploads.js";
import { shortVariantTitle } from "./variant-title.js";

const CJ_API = "https://developers.cjdropshipping.com/api2.0/v1";

export type CatalogHit = {
  externalProductId: string;
  externalVariantId: string;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  costCents: number | null;
  costCurrency: string;
  source: "shop" | "catalog";
  suggestedPriceCents: number | null;
};

export type SupplierVariantOption = {
  externalVariantId: string;
  title: string;
  sku: string | null;
  costCents: number | null;
  inventory: number | null;
};

function last4(secret: string) {
  const clean = secret.trim();
  return clean.length <= 4 ? "••••" : `••••${clean.slice(-4)}`;
}

function usdCents(value: unknown): number | null {
  const raw = String(value ?? "").split("-")[0]?.trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const fxRates = new Map<string, { rate: number; at: number }>();

async function usdToCurrencyCents(usdCents: number | null, currency: string): Promise<number | null> {
  if (usdCents == null) return null;
  const code = currency.toUpperCase();
  if (code === "USD") return usdCents;
  const cached = fxRates.get(code);
  const rate =
    cached && Date.now() - cached.at < 60 * 60 * 1000
      ? cached.rate
      : await fetch(`https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(code)}`)
          .then(async (res) => {
            if (!res.ok) return null;
            const json = (await res.json()) as { rates?: Record<string, number> };
            return json.rates?.[code] ?? null;
          })
          .catch(() => null);
  if (!rate) return null;
  fxRates.set(code, { rate, at: Date.now() });
  return Math.round(usdCents * rate);
}

async function withSuggested(
  hits: CatalogHit[],
  currency: string,
  markupPercent?: number | null
): Promise<CatalogHit[]> {
  return Promise.all(
    hits.map(async (hit) => {
      const converted = await usdToCurrencyCents(hit.costCents, currency);
      const percent = markupPercent ?? 0;
      const suggested =
        converted != null && percent > 0
          ? Math.round((converted * (100 + percent)) / 100)
          : converted;
      return { ...hit, suggestedPriceCents: suggested };
    })
  );
}

async function readJson(res: Response) {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = String(data.message ?? data.error ?? `Request failed (${res.status})`);
    throw new Error(message);
  }
  return data;
}

async function cjToken(account: {
  id: string;
  apiKey: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}) {
  const fresh =
    account.accessToken &&
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() > Date.now() + 60_000;
  if (fresh && account.accessToken) return account.accessToken;

  const res = await fetch(`${CJ_API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: account.apiKey }),
  });
  const json = await readJson(res);
  const data = (json.data ?? {}) as {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiryDate?: string;
  };
  if (!json.result || !data.accessToken) {
    throw new Error(String(json.message ?? "CJ did not return a token"));
  }
  const expiry = data.accessTokenExpiryDate ? new Date(data.accessTokenExpiryDate) : null;
  await prisma.supplierAccount.update({
    where: { id: account.id },
    data: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? account.refreshToken,
      tokenExpiresAt: expiry && !Number.isNaN(expiry.getTime()) ? expiry : null,
    },
  });
  return data.accessToken;
}

async function cjGet(token: string, path: string) {
  const res = await fetch(`${CJ_API}${path}`, {
    headers: { "CJ-Access-Token": token },
  });
  const json = await readJson(res);
  if (json.result === false) throw new Error(String(json.message ?? "CJ request failed"));
  return json.data;
}

export async function connectSupplier(
  tenantId: string,
  provider: SupplierProvider,
  apiKey: string
) {
  const key = apiKey.trim();
  if (key.length < 8) throw new Error("Paste the supplier API key.");

  const account = await prisma.supplierAccount.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    create: { tenantId, provider, apiKey: key },
    update: { apiKey: key, accessToken: null, refreshToken: null, tokenExpiresAt: null },
  });

  try {
    if (provider === SupplierProvider.CJ) {
      await cjToken(account);
    } else if (provider === SupplierProvider.PRINTFUL) {
      const res = await fetch("https://api.printful.com/store/products?limit=1", {
        headers: { Authorization: `Bearer ${key}` },
      });
      await readJson(res);
    } else {
      const res = await fetch("https://api.printify.com/v1/shops.json", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const shops = (await readJson(res)) as unknown as { id?: number }[];
      const shopId = Array.isArray(shops) ? shops[0]?.id : undefined;
      if (!shopId) throw new Error("Printify returned no shop for this token.");
      await prisma.supplierAccount.update({
        where: { id: account.id },
        data: { externalShopId: String(shopId) },
      });
    }
  } catch (err) {
    await prisma.supplierAccount.delete({ where: { id: account.id } }).catch(() => undefined);
    throw err;
  }

  return publicAccount(await prisma.supplierAccount.findUniqueOrThrow({ where: { id: account.id } }));
}

function publicAccount(row: {
  provider: SupplierProvider;
  apiKey: string;
  externalShopId: string | null;
  markupPercent: number | null;
  updatedAt: Date;
}) {
  return {
    provider: row.provider,
    connected: true,
    keyLast4: last4(row.apiKey),
    shopId: row.externalShopId,
    markupPercent: row.markupPercent,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSupplierAccounts(tenantId: string) {
  const rows = await prisma.supplierAccount.findMany({
    where: { tenantId },
    orderBy: { provider: "asc" },
  });
  return rows.map(publicAccount);
}

export async function disconnectSupplier(tenantId: string, provider: SupplierProvider) {
  await prisma.supplierAccount.deleteMany({ where: { tenantId, provider } });
}

export async function searchSupplierCatalog(
  tenantId: string,
  provider: SupplierProvider,
  query: string,
  currency = "USD"
): Promise<CatalogHit[]> {
  const q = query.trim();
  if (q.length < 2) throw new Error("Enter at least 2 characters.");
  const account = await prisma.supplierAccount.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });
  if (!account) throw new Error("Connect this supplier first.");
  const needle = q.toLowerCase();

  if (provider === SupplierProvider.CJ) {
    const token = await cjToken(account);
    const data = (await cjGet(
      token,
      `/product/listV2?page=1&size=12&keyWord=${encodeURIComponent(q)}`
    )) as { content?: { productList?: Record<string, unknown>[] }[] };
    const products = data?.content?.flatMap((block) => block.productList ?? []) ?? [];
    const hits = products
      .slice(0, 12)
      .map((item) => ({
        externalProductId: String(item.id ?? ""),
        externalVariantId: "",
        title: String(item.nameEn ?? item.sku ?? "CJ product"),
        sku: item.sku ? String(item.sku) : null,
        imageUrl: item.bigImage ? String(item.bigImage) : null,
        costCents: usdCents(item.sellPrice),
        costCurrency: "USD",
        source: "catalog" as const,
        suggestedPriceCents: null,
      }))
      .filter((hit) => hit.externalProductId);
    return withSuggested(hits, currency, account.markupPercent);
  }

  if (provider === SupplierProvider.PRINTFUL) {
    const shop: CatalogHit[] = [];
    for (let offset = 0; offset < 100; offset += 20) {
      const res = await fetch(`https://api.printful.com/store/products?limit=20&offset=${offset}`, {
        headers: { Authorization: `Bearer ${account.apiKey}` },
      });
      const json = await readJson(res);
      const result = (json.result ?? []) as { id?: number; name?: string; thumbnail_url?: string }[];
      for (const item of result) {
        if (!String(item.name ?? "").toLowerCase().includes(needle)) continue;
        shop.push({
          externalProductId: String(item.id ?? ""),
          externalVariantId: "",
          title: String(item.name ?? "Printful product"),
          sku: null,
          imageUrl: item.thumbnail_url ?? null,
          costCents: null,
          costCurrency: "USD",
          source: "shop",
          suggestedPriceCents: null,
        });
      }
      if (result.length < 20) break;
    }
    const catalogRes = await fetch("https://api.printful.com/products", {
      headers: { Authorization: `Bearer ${account.apiKey}` },
    });
    const catalogJson = await readJson(catalogRes);
    const catalogRows = Array.isArray(catalogJson.result) ? catalogJson.result : [];
    const catalog = (catalogRows as { id?: number; brand?: string; model?: string; image?: string }[])
      .filter((item) => `${item.brand ?? ""} ${item.model ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 12)
      .map((item) => ({
        externalProductId: `catalog:${item.id}`,
        externalVariantId: "",
        title: `${item.brand ?? ""} ${item.model ?? ""}`.trim() || "Printful catalog",
        sku: null,
        imageUrl: item.image ?? null,
        costCents: null,
        costCurrency: "USD",
        source: "catalog" as const,
        suggestedPriceCents: null,
      }));
    return withSuggested(
      [...shop, ...catalog].filter((hit) => hit.externalProductId && hit.externalProductId !== "catalog:undefined").slice(0, 24),
      currency,
      account.markupPercent
    );
  }

  const shopId = account.externalShopId;
  if (!shopId) throw new Error("Printify shop is missing. Connect the token again.");
  const shop: CatalogHit[] = [];
  for (let page = 1; page <= 2; page += 1) {
    const res = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products.json?limit=50&page=${page}`,
      { headers: { Authorization: `Bearer ${account.apiKey}` } }
    );
    const json = await readJson(res);
    const result = ((json as { data?: Record<string, unknown>[] }).data ?? []) as {
      id?: string;
      title?: string;
      images?: { src?: string }[];
      variants?: { id?: number; price?: number; is_enabled?: boolean; sku?: string }[];
    }[];
    for (const item of result) {
      if (!String(item.title ?? "").toLowerCase().includes(needle)) continue;
      const variant = item.variants?.find((v) => v.is_enabled !== false) ?? item.variants?.[0];
      shop.push({
        externalProductId: String(item.id ?? ""),
        externalVariantId: variant?.id != null ? String(variant.id) : "",
        title: String(item.title ?? "Printify product"),
        sku: variant?.sku ?? null,
        imageUrl: item.images?.[0]?.src ?? null,
        costCents: variant?.price ?? null,
        costCurrency: "USD",
        source: "shop",
        suggestedPriceCents: null,
      });
    }
    if (result.length < 50) break;
  }
  const blueRes = await fetch("https://api.printify.com/v1/catalog/blueprints.json", {
    headers: { Authorization: `Bearer ${account.apiKey}` },
  });
  const blueprintJson = await readJson(blueRes);
  const blueprints = (Array.isArray(blueprintJson) ? blueprintJson : []) as {
    id?: number;
    title?: string;
    images?: string[];
  }[];
  const catalog = blueprints
    .filter((item) => String(item.title ?? "").toLowerCase().includes(needle))
    .slice(0, 12)
    .map((item) => ({
      externalProductId: `catalog:${item.id}`,
      externalVariantId: "",
      title: String(item.title ?? "Printify catalog"),
      sku: null,
      imageUrl:
        typeof item.images?.[0] === "string"
          ? item.images[0]
          : ((item.images?.[0] as { src?: string } | undefined)?.src ?? null),
      costCents: null,
      costCurrency: "USD",
      source: "catalog" as const,
      suggestedPriceCents: null,
    }));
  return withSuggested(
    [...shop, ...catalog].filter((hit) => hit.externalProductId && hit.externalProductId !== "catalog:undefined").slice(0, 24),
    currency,
    account.markupPercent
  );
}

export async function listSupplierVariants(
  tenantId: string,
  provider: SupplierProvider,
  externalProductId: string
): Promise<SupplierVariantOption[]> {
  const account = await prisma.supplierAccount.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });
  if (!account) throw new Error("Connect this supplier first.");
  const productId = externalProductId.trim();
  if (!productId) throw new Error("Choose a product first.");

  if (provider === SupplierProvider.CJ) {
    const token = await cjToken(account);
    const data = (await cjGet(token, `/product/query?pid=${encodeURIComponent(productId)}`)) as {
      productNameEn?: string;
      variants?: Record<string, unknown>[];
      inventories?: Record<string, unknown>[];
    };
    const stockRows = data.inventories ?? [];
    const productName = String(data.productNameEn ?? "");
    return (data.variants ?? [])
      .filter((variant) => variant.vid)
      .map((variant) => {
        const vid = String(variant.vid);
        const nested = Array.isArray(variant.inventories) ? variant.inventories : [];
        const matched = stockRows.filter((row) => String(row.vid ?? "") === vid);
        const rows = nested.length ? nested : matched;
        const inventory = rows.length
          ? rows.reduce((sum, row) => sum + Number((row as { totalInventory?: number }).totalInventory ?? 0), 0)
          : null;
        const key = String(variant.variantKey ?? "").trim();
        const english = String(variant.variantNameEn ?? "").trim();
        const raw = key && (!english || key.length <= english.length) ? key : english || key || vid;
        return {
          externalVariantId: vid,
          title: shortVariantTitle(raw, productName),
          sku: variant.variantSku ? String(variant.variantSku) : null,
          costCents: usdCents(variant.variantSellPrice),
          inventory: inventory != null && Number.isFinite(inventory) ? inventory : null,
        };
      });
  }

  if (provider === SupplierProvider.PRINTFUL && productId.startsWith("catalog:")) {
    const id = productId.slice("catalog:".length);
    const res = await fetch(`https://api.printful.com/products/${id}`, {
      headers: { Authorization: `Bearer ${account.apiKey}` },
    });
    const json = await readJson(res);
    const result = json.result as {
      variants?: { id?: number; name?: string; size?: string; color?: string; in_stock?: boolean; price?: string }[];
    };
    return (result.variants ?? [])
      .filter((variant) => variant.id)
      .map((variant) => ({
        externalVariantId: String(variant.id),
        title: variant.name || [variant.color, variant.size].filter(Boolean).join(" / ") || String(variant.id),
        sku: null,
        costCents: usdCents(variant.price),
        inventory: variant.in_stock === false ? 0 : null,
      }));
  }

  if (provider === SupplierProvider.PRINTFUL) {
    const res = await fetch(`https://api.printful.com/store/products/${productId}`, {
      headers: { Authorization: `Bearer ${account.apiKey}` },
    });
    const json = await readJson(res);
    const sync = (json.result ?? {}) as {
      sync_variants?: { id?: number; name?: string; sku?: string; retail_price?: string }[];
    };
    return (sync.sync_variants ?? [])
      .filter((variant) => variant.id)
      .map((variant) => ({
        externalVariantId: String(variant.id),
        title: variant.name || variant.sku || String(variant.id),
        sku: variant.sku ?? null,
        costCents: usdCents(variant.retail_price),
        inventory: null,
      }));
  }

  if (productId.startsWith("catalog:")) {
    const id = productId.slice("catalog:".length);
    const providersRes = await fetch(`https://api.printify.com/v1/catalog/blueprints/${id}/print_providers.json`, {
      headers: { Authorization: `Bearer ${account.apiKey}` },
    });
    const providers = (await readJson(providersRes)) as unknown as { id?: number }[];
    const printProviderId = Array.isArray(providers) ? providers[0]?.id : undefined;
    if (!printProviderId) return [];
    const variantsRes = await fetch(
      `https://api.printify.com/v1/catalog/blueprints/${id}/print_providers/${printProviderId}/variants.json`,
      { headers: { Authorization: `Bearer ${account.apiKey}` } }
    );
    const json = await readJson(variantsRes);
    const variants = ((json as { variants?: { id?: number; title?: string; options?: { value?: string }[] }[] }).variants ??
      []) as { id?: number; title?: string; options?: { value?: string }[] }[];
    return variants
      .filter((variant) => variant.id)
      .map((variant) => ({
        externalVariantId: String(variant.id),
        title: variant.title || variant.options?.map((opt) => opt.value).filter(Boolean).join(" / ") || String(variant.id),
        sku: null,
        costCents: null,
        inventory: null,
      }));
  }

  const shopId = account.externalShopId;
  if (!shopId) throw new Error("Printify shop is missing. Connect the token again.");
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, {
    headers: { Authorization: `Bearer ${account.apiKey}` },
  });
  const json = await readJson(res);
  const variants = ((json as { variants?: { id?: number; title?: string; sku?: string; price?: number; is_enabled?: boolean }[] }).variants ??
    []) as { id?: number; title?: string; sku?: string; price?: number; is_enabled?: boolean }[];
  return variants
    .filter((variant) => variant.id && variant.is_enabled !== false)
    .map((variant) => ({
      externalVariantId: String(variant.id),
      title: variant.title || variant.sku || String(variant.id),
      sku: variant.sku ?? null,
      costCents: variant.price ?? null,
      inventory: null,
    }));
}

export async function importSupplierProduct(opts: {
  tenantId: string;
  provider: SupplierProvider;
  externalProductId: string;
  externalVariantId?: string;
  title: string;
  imageUrl?: string | null;
  sku?: string | null;
  costCents?: number | null;
  priceAmountCents: number;
  currency: string;
  variantIds?: string[];
}) {
  const account = await prisma.supplierAccount.findUnique({
    where: { tenantId_provider: { tenantId: opts.tenantId, provider: opts.provider } },
  });
  if (!account) throw new Error("Connect this supplier first.");
  const already = await prisma.supplierProductLink.findFirst({
    where: { tenantId: opts.tenantId, accountId: account.id, externalProductId: opts.externalProductId },
    include: { product: { select: { id: true, slug: true, title: true } } },
  });
  if (already) {
    return { productId: already.product.id, slug: already.product.slug, title: already.product.title };
  }
  let variants = await listSupplierVariants(opts.tenantId, opts.provider, opts.externalProductId);
  if (opts.variantIds) {
    const picked = opts.variantIds.map((id) => id.trim()).filter(Boolean);
    if (!picked.length) throw new Error("Choose at least one variant.");
    variants = variants.filter((variant) => picked.includes(variant.externalVariantId));
    if (!variants.length) throw new Error("Choose at least one variant.");
  } else if (!variants.length && opts.externalVariantId) {
    variants = [
      {
        externalVariantId: opts.externalVariantId,
        title: "Default",
        sku: opts.sku ?? null,
        costCents: opts.costCents ?? null,
        inventory: null,
      },
    ];
  }
  if (!variants.length) throw new Error("This product has no variants to import.");
  const costCents = variants.find((variant) => variant.costCents != null)?.costCents ?? opts.costCents ?? null;
  const knownStock = variants.every((variant) => variant.inventory != null);
  const inventory = knownStock ? variants.reduce((sum, variant) => sum + (variant.inventory ?? 0), 0) : null;
  const slugBase = normalizeSlug(opts.title) || "supplier-product";
  const idBit = opts.externalProductId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-16);
  const slug = `${slugBase}-${idBit}`.replace(/[^a-z0-9-]/g, "");

  const product = await prisma.product.create({
    data: {
      tenantId: opts.tenantId,
      type: ProductType.PHYSICAL,
      status: ProductStatus.DRAFT,
      title: opts.title.slice(0, 180),
      slug,
      priceAmount: opts.priceAmountCents,
      currency: opts.currency,
      costAmountCents: costCents,
      sku: variants[0]?.sku ?? opts.sku ?? null,
      requiresShipping: true,
      inventory,
      variants: {
        create: variants.map((variant) => ({
          tenantId: opts.tenantId,
          title: shortVariantTitle(variant.title, opts.title).slice(0, 120) || "Default",
          sku: variant.sku,
          priceAmount: opts.priceAmountCents,
          inventory: variant.inventory,
          supplierVariantId: variant.externalVariantId,
        })),
      },
    },
  });

  await prisma.supplierProductLink.create({
    data: {
      tenantId: opts.tenantId,
      productId: product.id,
      accountId: account.id,
      externalProductId: opts.externalProductId,
      externalVariantId: variants[0]!.externalVariantId,
      externalSku: variants[0]?.sku ?? null,
      costCents,
      costCurrency: "USD",
    },
  });

  if (opts.imageUrl) {
    try {
      const file = await downloadRemoteImage(opts.imageUrl);
      const saved = await saveProductImage(opts.tenantId, product.id, file);
      await prisma.productImage.create({
        data: {
          tenantId: opts.tenantId,
          productId: product.id,
          storageKey: saved.storageKey,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
        },
      });
    } catch (err) {
      console.error("[suppliers] image", err);
    }
  }

  return { productId: product.id, slug: product.slug, title: product.title };
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "Customer", last: parts.slice(1).join(" ") || "Customer" };
}

export async function setSupplierMarkup(tenantId: string, provider: SupplierProvider, percent: number | null) {
  const account = await prisma.supplierAccount.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });
  if (!account) throw new Error("Connect this supplier first.");
  const markupPercent = percent == null || percent <= 0 ? null : Math.min(500, Math.round(percent));
  const row = await prisma.supplierAccount.update({
    where: { id: account.id },
    data: { markupPercent },
  });
  return publicAccount(row);
}

function matchSupplierVariant(
  local: { title: string; sku: string | null; supplierVariantId: string | null },
  remote: SupplierVariantOption[],
  productTitle: string,
  used: Set<string>
) {
  const free = remote.filter((variant) => !used.has(variant.externalVariantId));
  if (local.supplierVariantId) {
    const linked = free.find((variant) => variant.externalVariantId === local.supplierVariantId);
    if (linked) return linked;
  }
  if (local.sku) {
    const bySku = free.find((variant) => variant.sku && variant.sku === local.sku);
    if (bySku) return bySku;
  }
  const short = shortVariantTitle(local.title, productTitle);
  return free.find((variant) => variant.title === short || variant.title === local.title);
}

export async function syncSupplierStock(tenantId: string) {
  const links = await prisma.supplierProductLink.findMany({
    where: { tenantId },
    include: { account: true, product: { include: { variants: true } } },
  });
  let updated = 0;
  for (const link of links) {
    let remote: SupplierVariantOption[] = [];
    try {
      remote = await listSupplierVariants(tenantId, link.account.provider, link.externalProductId);
    } catch (err) {
      console.error("[suppliers] stock", link.productId, err);
      continue;
    }
    if (!remote.length) continue;
    const used = new Set<string>();
    if (link.product.variants.length === 0) {
      await prisma.productVariant.createMany({
        data: remote.map((variant) => ({
          tenantId,
          productId: link.productId,
          title: variant.title.slice(0, 120) || "Default",
          sku: variant.sku,
          priceAmount: link.product.priceAmount,
          inventory: variant.inventory,
          supplierVariantId: variant.externalVariantId,
        })),
      });
      updated += remote.length;
      if (remote.every((variant) => variant.inventory != null)) {
        await prisma.product.update({
          where: { id: link.productId },
          data: { inventory: remote.reduce((sum, variant) => sum + (variant.inventory ?? 0), 0) },
        });
      }
      continue;
    }
    for (const variant of link.product.variants) {
      const fresh = matchSupplierVariant(variant, remote, link.product.title, used);
      if (!fresh) continue;
      used.add(fresh.externalVariantId);
      const title = fresh.title && fresh.title !== variant.title ? fresh.title.slice(0, 120) : undefined;
      const inventory = fresh.inventory != null ? fresh.inventory : undefined;
      const linkId = variant.supplierVariantId === fresh.externalVariantId ? undefined : fresh.externalVariantId;
      if (title == null && inventory == null && linkId == null) continue;
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          ...(title ? { title } : {}),
          ...(inventory != null ? { inventory } : {}),
          ...(linkId ? { supplierVariantId: linkId } : {}),
        },
      });
      updated += 1;
    }
    const next = link.product.variants.map((variant) => {
      const fresh = matchSupplierVariant(variant, remote, link.product.title, new Set());
      return fresh?.inventory != null ? fresh.inventory : variant.inventory;
    });
    if (next.every((qty) => qty != null)) {
      await prisma.product.update({
        where: { id: link.productId },
        data: { inventory: next.reduce((sum, qty) => sum + (qty ?? 0), 0) },
      });
    }
  }
  return { updated };
}

export async function pushSupplierOrders(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            include: {
              variants: true,
              supplierLink: { include: { account: true } },
            },
          },
        },
      },
    },
  });
  if (!order || order.fulfillmentMethod === "PICKUP") {
    return prisma.supplierOrder.findMany({ where: { orderId } });
  }

  const groups = new Map<
    string,
    {
      account: NonNullable<NonNullable<(typeof order.items)[number]["product"]>["supplierLink"]>["account"];
      lines: (typeof order.items)[number][];
    }
  >();
  for (const line of order.items) {
    const link = line.product?.supplierLink;
    if (!link) continue;
    const bucket = groups.get(link.accountId) ?? { account: link.account, lines: [] };
    bucket.lines.push(line);
    groups.set(link.accountId, bucket);
  }

  for (const group of groups.values()) {
    const existing = await prisma.supplierOrder.findUnique({
      where: { orderId_accountId: { orderId: order.id, accountId: group.account.id } },
    });
    if (existing?.status === "SUBMITTED") continue;

    try {
      if (!order.shippingAddress1 || !order.shippingCity || !order.shippingCountry) {
        throw new Error("Order has no shipping address, so the supplier was not notified.");
      }
      const phone = (order.shippingPhone || "").trim();
      if (!phone) throw new Error("Add a phone number on the order before sending it to the supplier.");
      const region = (order.shippingRegion || "").trim();
      if (!region) throw new Error("Add a state or region on the order before sending it to the supplier.");
      if (!(order.shippingPostal || "").trim()) {
        throw new Error("Add a postal code on the order before sending it to the supplier.");
      }
      const remoteLines = group.lines.map((line) => {
        const link = line.product?.supplierLink;
        if (!link) throw new Error("This line is not linked to a supplier.");
        if (link.externalProductId.startsWith("catalog:")) {
          throw new Error(
            "This catalog product has no print file. Create it with a design in the supplier shop, then import that shop product."
          );
        }
        const chosen = line.variantId
          ? line.product?.variants.find((variant) => variant.id === line.variantId)
          : line.product?.variants.find((variant) => variant.supplierVariantId);
        const externalVariantId = chosen?.supplierVariantId || link.externalVariantId;
        if (!externalVariantId) throw new Error(`No supplier variant is linked for ${line.title}.`);
        return {
          variantId: externalVariantId,
          productId: link.externalProductId,
          quantity: line.quantity,
        };
      });
      const externalOrderId = await createRemoteOrder(group.account, order, remoteLines);
      await prisma.supplierOrder.upsert({
        where: { orderId_accountId: { orderId: order.id, accountId: group.account.id } },
        create: {
          tenantId: order.tenantId,
          orderId: order.id,
          accountId: group.account.id,
          provider: group.account.provider,
          externalOrderId,
          status: "SUBMITTED",
          error: null,
        },
        update: { externalOrderId, status: "SUBMITTED", error: null },
      });
      await prisma.orderEvent.create({
        data: {
          tenantId: order.tenantId,
          orderId: order.id,
          type: "NOTE",
          body: `${group.account.provider} order ${externalOrderId} created. The supplier is not paid by Tescommerce.`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Supplier order failed";
      await prisma.supplierOrder.upsert({
        where: { orderId_accountId: { orderId: order.id, accountId: group.account.id } },
        create: {
          tenantId: order.tenantId,
          orderId: order.id,
          accountId: group.account.id,
          provider: group.account.provider,
          status: "FAILED",
          error: message.slice(0, 500),
        },
        update: { status: "FAILED", error: message.slice(0, 500) },
      });
      await prisma.orderEvent.create({
        data: {
          tenantId: order.tenantId,
          orderId: order.id,
          type: "NOTE",
          body: `${group.account.provider} order failed: ${message.slice(0, 300)}`,
        },
      });
    }
  }

  return prisma.supplierOrder.findMany({ where: { orderId } });
}

async function createRemoteOrder(
  account: {
    id: string;
    provider: SupplierProvider;
    apiKey: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    externalShopId: string | null;
  },
  order: {
    id: string;
    orderNumber: string;
    shippingName: string | null;
    shippingAddress1: string | null;
    shippingAddress2: string | null;
    shippingCity: string | null;
    shippingRegion: string | null;
    shippingPostal: string | null;
    shippingPhone: string | null;
    shippingCountry: string | null;
    guestEmail: string | null;
    customer: { email: string; name: string | null } | null;
  },
  lines: { variantId: string; productId: string; quantity: number }[]
) {
  const name = order.shippingName || order.customer?.name || "Customer";
  const { first, last } = splitName(name);
  const email = order.customer?.email || order.guestEmail;
  if (!email) throw new Error("Add a customer email before sending the order to the supplier.");
  const phone = (order.shippingPhone || "").trim();
  const region = (order.shippingRegion || "").trim();
  const zip = (order.shippingPostal || "").trim();
  const country = (order.shippingCountry || "").toUpperCase();

  if (account.provider === SupplierProvider.CJ) {
    const token = await cjToken(account);
    const res = await fetch(`${CJ_API}/shopping/order/createOrderV2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        shippingCountryCode: country,
        shippingCountry: country,
        shippingProvince: region,
        shippingCity: order.shippingCity,
        shippingZip: zip,
        shippingAddress: order.shippingAddress1,
        shippingAddress2: order.shippingAddress2 || "",
        shippingCustomerName: name,
        shippingPhone: phone,
        email,
        fromCountryCode: "CN",
        platform: "tescommerce",
        remark: "Created unpaid. Pay this order in CJ.",
        products: lines.map((line) => ({ vid: line.variantId, quantity: line.quantity })),
      }),
    });
    const json = await readJson(res);
    if (json.result === false) throw new Error(String(json.message ?? "CJ order failed"));
    const data = json.data as { orderId?: string } | string | null;
    const external = typeof data === "string" ? data : data?.orderId;
    if (!external) throw new Error("CJ did not return an order id");
    return String(external);
  }

  if (account.provider === SupplierProvider.PRINTFUL) {
    const res = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        confirm: false,
        external_id: order.id,
        recipient: {
          name,
          address1: order.shippingAddress1,
          address2: order.shippingAddress2 || undefined,
          city: order.shippingCity,
          state_code: region,
          country_code: country,
          zip,
          email,
          phone,
        },
        items: lines.map((line) => ({
          sync_variant_id: Number(line.variantId),
          quantity: line.quantity,
        })),
      }),
    });
    const json = await readJson(res);
    const result = json.result as { id?: number } | undefined;
    if (!result?.id) throw new Error("Printful did not return an order id");
    return String(result.id);
  }

  if (!account.externalShopId) throw new Error("Printify shop is missing.");
  const res = await fetch(`https://api.printify.com/v1/shops/${account.externalShopId}/orders.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: order.id,
      label: order.orderNumber,
      line_items: lines.map((line) => ({
        product_id: line.productId,
        variant_id: Number(line.variantId),
        quantity: line.quantity,
      })),
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: {
        first_name: first,
        last_name: last,
        email,
        phone,
        country,
        region,
        address1: order.shippingAddress1,
        address2: order.shippingAddress2 || "",
        city: order.shippingCity,
        zip,
      },
    }),
  });
  const json = await readJson(res);
  const id = (json as { id?: string }).id;
  if (!id) throw new Error("Printify did not return an order id");
  return id;
}

export async function syncSupplierTracking(tenantId: string) {
  const rows = await prisma.supplierOrder.findMany({
    where: { tenantId, status: "SUBMITTED", externalOrderId: { not: null } },
    include: { account: true },
    take: 30,
    orderBy: { createdAt: "desc" },
  });
  let updated = 0;
  for (const row of rows) {
    if (!row.externalOrderId) continue;
    const order = await prisma.order.findUnique({
      where: { id: row.orderId },
      select: { trackingNumber: true, status: true, shippedAt: true },
    });
    if (!order || order.trackingNumber) continue;
    try {
      const tracking = await readTracking(row.account, row.externalOrderId);
      if (!tracking) continue;
      await prisma.order.update({
        where: { id: row.orderId },
        data: {
          trackingNumber: tracking,
          shippedAt: order.shippedAt ?? new Date(),
          ...(order.status === OrderStatus.PAID ? { status: OrderStatus.FULFILLED } : {}),
        },
      });
      const { sendShippingNotification } = await import("./shipping-email.js");
      await sendShippingNotification(row.orderId).catch((err) => {
        console.error("[suppliers] shipping email", row.orderId, err);
      });
      updated += 1;
    } catch (err) {
      console.error("[suppliers] tracking", row.id, err);
    }
  }
  return { updated };
}

export async function syncAllSupplierTracking() {
  const tenants = await prisma.supplierOrder.findMany({
    where: { status: "SUBMITTED", externalOrderId: { not: null } },
    distinct: ["tenantId"],
    select: { tenantId: true },
    take: 50,
  });
  let updated = 0;
  for (const row of tenants) {
    const result = await syncSupplierTracking(row.tenantId);
    updated += result.updated;
  }
  return { updated };
}

async function readTracking(
  account: {
    provider: SupplierProvider;
    apiKey: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    externalShopId: string | null;
    id: string;
  },
  externalOrderId: string
) {
  if (account.provider === SupplierProvider.CJ) {
    const token = await cjToken(account);
    const data = (await cjGet(
      token,
      `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(externalOrderId)}`
    )) as { trackNumber?: string };
    return data.trackNumber?.trim() || null;
  }
  if (account.provider === SupplierProvider.PRINTFUL) {
    const res = await fetch(`https://api.printful.com/orders/${externalOrderId}`, {
      headers: { Authorization: `Bearer ${account.apiKey}` },
    });
    const json = await readJson(res);
    const result = json.result as { shipments?: { tracking_number?: string }[] };
    return result.shipments?.find((s) => s.tracking_number)?.tracking_number?.trim() || null;
  }
  if (!account.externalShopId) return null;
  const res = await fetch(
    `https://api.printify.com/v1/shops/${account.externalShopId}/orders/${externalOrderId}.json`,
    { headers: { Authorization: `Bearer ${account.apiKey}` } }
  );
  const json = await readJson(res);
  const shipments = (json as { shipments?: { number?: string }[] }).shipments ?? [];
  return shipments.find((s) => s.number)?.number?.trim() || null;
}

export function parseSupplierProvider(value: string): SupplierProvider | null {
  const key = value.toUpperCase();
  if (key === "CJ" || key === "PRINTFUL" || key === "PRINTIFY") return key;
  return null;
}

export const SUPPLIER_CATALOG = [
  {
    provider: "CJ",
    available: true,
    note: "General catalog. Orders are created unpaid in CJ. You pay CJ, not Tescommerce.",
  },
  {
    provider: "PRINTFUL",
    available: true,
    note: "Your Printful shop plus the blank catalog. Catalog items need a design in Printful before an order can ship. Draft orders are not charged until you confirm them in Printful.",
  },
  {
    provider: "PRINTIFY",
    available: true,
    note: "Your Printify shop plus the blank catalog. Catalog items need a design in Printify before an order can ship. You pay Printify for production.",
  },
  {
    provider: "DSERS",
    available: false,
    note: "DSers only connects after they approve Tescommerce as a Channel App. Use CJ for AliExpress-style products until then.",
  },
] as const;
