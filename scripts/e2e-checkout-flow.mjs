/**
 * API E2E: login → product → cart → paid order
 * Run: npm run e2e:checkout
 * Requires: API on :4000, db seeded (demo@ugclab.store / demo1234)
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const API = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`;
const TENANT = process.env.E2E_TENANT_SLUG ?? "demo";
const EMAIL = process.env.E2E_MERCHANT_EMAIL ?? "demo@ugclab.store";
const PASSWORD = process.env.E2E_MERCHANT_PASSWORD ?? "demo1234";

const jar = new Map();

function mergeCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const list = raw.length ? raw : [res.headers.get("set-cookie")].filter(Boolean);
  for (const line of list) {
    const part = String(line).split(";")[0]?.trim();
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

function cookieHeader() {
  if (jar.size === 0) return undefined;
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(path, init = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
      ...init.headers,
    },
  });
  mergeCookies(res);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${data.error ?? text}`);
  }
  return data;
}

async function main() {
  console.log("E2E checkout flow");
  console.log(" API:", API);
  console.log(" tenant:", TENANT);

  await api("/health");

  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.tenant?.slug) throw new Error("Login OK but no tenant on user");
  console.log("✓ login", login.user.email);

  const products = await api("/api/merchant/products?limit=5");
  let productId = products.products?.[0]?.id;
  if (!productId) {
    const created = await api("/api/merchant/products", {
      method: "POST",
      body: JSON.stringify({
        title: `E2E Product ${Date.now()}`,
        slug: `e2e-${Date.now()}`,
        type: "DIGITAL",
        price: "9.99",
        status: "ACTIVE",
      }),
    });
    productId = created.product?.id;
    console.log("✓ created product", productId);
  } else {
    console.log("✓ using product", productId);
  }
  if (!productId) throw new Error("No product for checkout");

  const q = `tenant=${TENANT}&locale=en`;
  await api(`/api/store/cart/add?${q}`, {
    method: "POST",
    body: JSON.stringify({ productId, quantity: 1 }),
  });
  console.log("✓ cart add");

  const placed = await api(`/api/store/checkout/place?${q}`, {
    method: "POST",
    body: JSON.stringify({
      email: `e2e-buyer-${Date.now()}@example.com`,
      name: "E2E Buyer",
      country: "US",
      acceptPolicies: true,
      locale: "en",
    }),
  });

  if (placed.mode === "stripe") {
    console.log("✓ order created (stripe mode)", placed.orderId);
    console.log("  checkout URL returned — webhook required for PAID");
    console.log("  PASS: checkout session created");
    return;
  }

  if (placed.mode !== "demo" || !placed.orderId) {
    throw new Error(`Unexpected place result: ${JSON.stringify(placed)}`);
  }
  console.log("✓ demo checkout paid", placed.orderId);

  const order = await api(`/api/merchant/orders/${placed.orderId}`);
  const status = order.order?.status;
  if (status !== "PAID" && status !== "FULFILLED") {
    throw new Error(`Expected PAID, got ${status}`);
  }
  console.log("✓ order status", status);
  console.log("\nOK: signup → product → paid order");
}

main().catch((e) => {
  console.error("\nFAIL:", e.message);
  process.exit(1);
});
