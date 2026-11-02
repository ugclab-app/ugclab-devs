/**
 * Store migration: parse Shopify / WooCommerce / Etsy CSV exports into a
 * normalized shape (products, customers, orders). Pure — no DB access.
 */
import { parseCsv } from "./product-csv.js";

export type ImportSource = "shopify" | "woocommerce" | "etsy" | "generic";
export type ImportKind = "products" | "customers" | "orders";

export type NormalizedVariant = {
  title: string;
  sku: string | null;
  priceCents: number;
  inventory: number | null;
  weightGrams: number | null;
};

export type NormalizedProduct = {
  handle: string;
  title: string;
  descriptionHtml: string | null;
  priceCents: number;
  compareAtCents: number | null;
  sku: string | null;
  barcode: string | null;
  inventory: number | null;
  weightGrams: number | null;
  tags: string[];
  imageUrls: string[];
  published: boolean;
  isDigital: boolean;
  variants: NormalizedVariant[];
};

export type NormalizedCustomer = {
  email: string;
  name: string | null;
  country: string | null;
  phone: string | null;
  acceptsMarketing: boolean;
};

export type NormalizedOrder = {
  orderNumber: string;
  email: string;
  totalCents: number;
  currency: string | null;
  country: string | null;
  paid: boolean;
  createdAt: Date | null;
};

export type StoreImportResult =
  | { kind: "products"; source: ImportSource; rows: NormalizedProduct[]; warnings: string[] }
  | { kind: "customers"; source: ImportSource; rows: NormalizedCustomer[]; warnings: string[] }
  | { kind: "orders"; source: ImportSource; rows: NormalizedOrder[]; warnings: string[] };

function norm(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function indexer(headers: string[]) {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const k = norm(h);
    if (!map.has(k)) map.set(k, i);
  });
  return (...names: string[]) => {
    for (const n of names) {
      const i = map.get(norm(n));
      if (i != null) return i;
    }
    return -1;
  };
}

function cellAt(cols: string[], i: number) {
  return i >= 0 ? String(cols[i] ?? "").trim() : "";
}

function money(raw: string): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function intOrNull(raw: string): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function weightToGrams(value: string, unit: string): number | null {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  const u = unit.toLowerCase();
  if (u === "kg") return Math.round(n * 1000);
  if (u === "lb") return Math.round(n * 453.592);
  if (u === "oz") return Math.round(n * 28.3495);
  return Math.round(n);
}

export function detectSource(headers: string[]): { source: ImportSource; kind: ImportKind } {
  const set = new Set(headers.map(norm));
  const has = (...n: string[]) => n.every((x) => set.has(norm(x)));

  if (has("Handle", "Title") && (set.has("variant price") || set.has("body html"))) {
    return { source: "shopify", kind: "products" };
  }
  if (has("Email") && (set.has("accepts email marketing") || set.has("accepts marketing") || set.has("default address country code"))) {
    return { source: "shopify", kind: "customers" };
  }
  if (has("Name", "Email", "Financial Status")) return { source: "shopify", kind: "orders" };

  if (set.has("regular price") || (set.has("sku") && set.has("name") && set.has("type") && set.has("published"))) {
    return { source: "woocommerce", kind: "products" };
  }
  if (set.has("order number") && (set.has("order status") || set.has("order total"))) {
    return { source: "woocommerce", kind: "orders" };
  }
  if (set.has("user email") || (set.has("email") && set.has("first name") && set.has("username"))) {
    return { source: "woocommerce", kind: "customers" };
  }

  if (has("TITLE", "PRICE") && (set.has("currency code") || set.has("image1"))) {
    return { source: "etsy", kind: "products" };
  }
  if (set.has("sale date") && set.has("order id")) return { source: "etsy", kind: "orders" };

  if (set.has("email")) return { source: "generic", kind: "customers" };
  return { source: "generic", kind: "products" };
}

export function parseStoreImport(text: string): StoreImportResult {
  const table = parseCsv(text);
  const headers = table[0] ?? [];
  const body = table.slice(1);
  const { source, kind } = detectSource(headers);
  const warnings: string[] = [];
  const col = indexer(headers);

  if (kind === "products") {
    const products = new Map<string, NormalizedProduct>();

    if (source === "shopify") {
      const iHandle = col("Handle");
      const iTitle = col("Title");
      const iBody = col("Body (HTML)", "Body HTML");
      const iTags = col("Tags");
      const iPublished = col("Published");
      const iOpt1Name = col("Option1 Name");
      const iOpt1Val = col("Option1 Value");
      const iOpt2Val = col("Option2 Value");
      const iOpt3Val = col("Option3 Value");
      const iSku = col("Variant SKU");
      const iGrams = col("Variant Grams");
      const iQty = col("Variant Inventory Qty");
      const iPrice = col("Variant Price");
      const iCompare = col("Variant Compare At Price");
      const iBarcode = col("Variant Barcode");
      const iImage = col("Image Src");
      const iRequiresShipping = col("Variant Requires Shipping");

      for (const cols of body) {
        const handle = cellAt(cols, iHandle) || slugify(cellAt(cols, iTitle));
        if (!handle) continue;
        let p = products.get(handle);
        const title = cellAt(cols, iTitle);
        if (!p) {
          if (!title) {
            // Continuation image row before the title row — rare; skip.
            continue;
          }
          p = {
            handle,
            title,
            descriptionHtml: cellAt(cols, iBody) || null,
            priceCents: money(cellAt(cols, iPrice)) ?? 0,
            compareAtCents: money(cellAt(cols, iCompare)),
            sku: cellAt(cols, iSku) || null,
            barcode: cellAt(cols, iBarcode) || null,
            inventory: intOrNull(cellAt(cols, iQty)),
            weightGrams: intOrNull(cellAt(cols, iGrams)),
            tags: cellAt(cols, iTags).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
            imageUrls: [],
            published: cellAt(cols, iPublished).toLowerCase() !== "false",
            isDigital: cellAt(cols, iRequiresShipping).toLowerCase() === "false",
            variants: [],
          };
          products.set(handle, p);
        }
        const img = cellAt(cols, iImage);
        if (img && !p.imageUrls.includes(img)) p.imageUrls.push(img);

        const optName = cellAt(cols, iOpt1Name);
        const optVals = [cellAt(cols, iOpt1Val), cellAt(cols, iOpt2Val), cellAt(cols, iOpt3Val)].filter(Boolean);
        const isDefaultOnly = optVals.length === 1 && optVals[0] === "Default Title";
        const priceCents = money(cellAt(cols, iPrice));
        if (optVals.length && !isDefaultOnly && priceCents != null && (optName || p.variants.length || title)) {
          p.variants.push({
            title: optVals.join(" / "),
            sku: cellAt(cols, iSku) || null,
            priceCents,
            inventory: intOrNull(cellAt(cols, iQty)),
            weightGrams: intOrNull(cellAt(cols, iGrams)),
          });
        }
      }
    } else if (source === "woocommerce") {
      const iId = col("ID");
      const iType = col("Type");
      const iSku = col("SKU");
      const iName = col("Name");
      const iPublished = col("Published");
      const iDesc = col("Description");
      const iShort = col("Short description");
      const iStock = col("Stock");
      const iWeight = col("Weight (kg)", "Weight");
      const iSale = col("Sale price");
      const iRegular = col("Regular price");
      const iCategories = col("Categories");
      const iTags = col("Tags");
      const iImages = col("Images");
      const iParent = col("Parent");
      const iAttr1Val = col("Attribute 1 value(s)");
      const iVirtual = col("Virtual");
      const iDownloadable = col("Downloadable");

      const byId = new Map<string, NormalizedProduct>();
      for (const cols of body) {
        const type = cellAt(cols, iType).toLowerCase();
        const name = cellAt(cols, iName);
        const id = cellAt(cols, iId);
        if (type === "variation") {
          const parentRef = cellAt(cols, iParent).replace(/^id:/i, "");
          const parent = byId.get(parentRef) ?? [...byId.values()].find((p) => p.sku && parentRef === p.sku);
          if (parent) {
            parent.variants.push({
              title: cellAt(cols, iAttr1Val) || name || `Variant ${parent.variants.length + 1}`,
              sku: cellAt(cols, iSku) || null,
              priceCents: money(cellAt(cols, iSale)) ?? money(cellAt(cols, iRegular)) ?? parent.priceCents,
              inventory: intOrNull(cellAt(cols, iStock)),
              weightGrams: weightToGrams(cellAt(cols, iWeight), "kg"),
            });
          }
          continue;
        }
        if (!name) continue;
        const regular = money(cellAt(cols, iRegular));
        const sale = money(cellAt(cols, iSale));
        const tags = [
          ...cellAt(cols, iTags).split(",").map((t) => t.trim().toLowerCase()),
          ...cellAt(cols, iCategories).split(",").map((t) => t.replace(/>.*$/, "").trim().toLowerCase()),
        ].filter(Boolean);
        const p: NormalizedProduct = {
          handle: slugify(name) || `woo-${id}`,
          title: name,
          descriptionHtml: cellAt(cols, iDesc) || cellAt(cols, iShort) || null,
          priceCents: sale ?? regular ?? 0,
          compareAtCents: sale != null && regular != null && regular > sale ? regular : null,
          sku: cellAt(cols, iSku) || null,
          barcode: null,
          inventory: intOrNull(cellAt(cols, iStock)),
          weightGrams: weightToGrams(cellAt(cols, iWeight), "kg"),
          tags: [...new Set(tags)],
          imageUrls: cellAt(cols, iImages).split(",").map((u) => u.trim()).filter(Boolean),
          published: cellAt(cols, iPublished) !== "0" && cellAt(cols, iPublished).toLowerCase() !== "false",
          isDigital: cellAt(cols, iVirtual) === "1" || cellAt(cols, iDownloadable) === "1",
          variants: [],
        };
        products.set(p.handle, p);
        if (id) byId.set(id, p);
        if (p.sku) byId.set(p.sku, p);
      }
    } else if (source === "etsy") {
      const iTitle = col("TITLE");
      const iDesc = col("DESCRIPTION");
      const iPrice = col("PRICE");
      const iQty = col("QUANTITY");
      const iTags = col("TAGS");
      const iSku = col("SKU");
      const imageCols = headers
        .map((h, i) => (/^image\d+$/i.test(h.trim()) ? i : -1))
        .filter((i) => i >= 0);
      for (const cols of body) {
        const title = cellAt(cols, iTitle);
        if (!title) continue;
        const p: NormalizedProduct = {
          handle: slugify(title),
          title,
          descriptionHtml: cellAt(cols, iDesc)
            ? `<p>${cellAt(cols, iDesc).replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`
            : null,
          priceCents: money(cellAt(cols, iPrice)) ?? 0,
          compareAtCents: null,
          sku: cellAt(cols, iSku) || null,
          barcode: null,
          inventory: intOrNull(cellAt(cols, iQty)),
          weightGrams: null,
          tags: cellAt(cols, iTags).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
          imageUrls: imageCols.map((i) => cellAt(cols, i)).filter(Boolean),
          published: true,
          isDigital: false,
          variants: [],
        };
        products.set(p.handle || `etsy-${products.size}`, p);
      }
    } else {
      warnings.push("Unknown CSV layout — use the generic product import with column mapping.");
    }

    return { kind, source, rows: [...products.values()], warnings };
  }

  if (kind === "customers") {
    const iEmail = col("Email", "User Email", "Customer Email");
    const iFirst = col("First Name");
    const iLast = col("Last Name");
    const iName = col("Name", "Full Name", "Display Name");
    const iCountry = col("Default Address Country Code", "Country Code", "Country", "Billing Country", "Shipping Country");
    const iPhone = col("Phone", "Default Address Phone", "Billing Phone");
    const iMarketing = col("Accepts Email Marketing", "Accepts Marketing");
    const seen = new Set<string>();
    const rows: NormalizedCustomer[] = [];
    for (const cols of body) {
      const email = cellAt(cols, iEmail).toLowerCase();
      if (!email.includes("@") || seen.has(email)) continue;
      seen.add(email);
      const name =
        [cellAt(cols, iFirst), cellAt(cols, iLast)].filter(Boolean).join(" ") ||
        cellAt(cols, iName) ||
        null;
      const countryRaw = cellAt(cols, iCountry).toUpperCase();
      rows.push({
        email,
        name,
        country: /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null,
        phone: cellAt(cols, iPhone) || null,
        acceptsMarketing: /^(yes|true|1)$/i.test(cellAt(cols, iMarketing)),
      });
    }
    return { kind, source, rows, warnings };
  }

  // orders
  const iNumber = col("Name", "Order Number", "Order ID", "Order");
  const iEmail = col("Email", "Customer Email", "Billing Email", "Buyer Email");
  const iTotal = col("Total", "Order Total", "Order Total Amount", "Order Value");
  const iCurrency = col("Currency");
  const iCountry = col("Shipping Country", "Shipping Country Code", "Billing Country", "Ship Country");
  const iStatus = col("Financial Status", "Order Status", "Status");
  const iDate = col("Created at", "Order Date", "Sale Date", "Date");
  const seen = new Set<string>();
  const rows: NormalizedOrder[] = [];
  for (const cols of body) {
    const orderNumber = cellAt(cols, iNumber).replace(/^#/, "");
    const email = cellAt(cols, iEmail).toLowerCase();
    if (!orderNumber || !email.includes("@") || seen.has(orderNumber)) continue;
    seen.add(orderNumber);
    const status = cellAt(cols, iStatus).toLowerCase();
    const paid =
      !status ||
      /paid|completed|processing|complete|shipped|fulfilled/.test(status) && !/refund|void|cancel|pending|failed/.test(status);
    const countryRaw = cellAt(cols, iCountry).toUpperCase();
    const dateRaw = cellAt(cols, iDate);
    const created = dateRaw ? new Date(dateRaw) : null;
    rows.push({
      orderNumber,
      email,
      totalCents: money(cellAt(cols, iTotal)) ?? 0,
      currency: cellAt(cols, iCurrency).toUpperCase().slice(0, 3) || null,
      country: /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null,
      paid,
      createdAt: created && !Number.isNaN(created.getTime()) ? created : null,
    });
  }
  return { kind, source, rows, warnings };
}
