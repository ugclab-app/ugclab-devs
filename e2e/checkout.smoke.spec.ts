import { test, expect } from "@playwright/test";

/**
 * Smoke: health → merchant login → product → cart → place order.
 * Same path as scripts/e2e-checkout-flow.mjs, via Playwright request fixtures.
 */
const TENANT = process.env.E2E_TENANT_SLUG ?? "demo";
const EMAIL = process.env.E2E_MERCHANT_EMAIL ?? "demo@ugclab.store";
const PASSWORD = process.env.E2E_MERCHANT_PASSWORD ?? "demo1234";

test.describe.configure({ mode: "serial" });

test("checkout smoke: login → cart → place", async ({ request }) => {
  const health = await request.get("/health");
  expect(health.ok(), await health.text()).toBeTruthy();

  const login = await request.post("/api/auth/login", {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const loginBody = await login.json();
  expect(loginBody.tenant?.slug).toBeTruthy();

  const products = await request.get("/api/merchant/products?limit=5");
  expect(products.ok(), await products.text()).toBeTruthy();
  const productsBody = await products.json();
  let productId: string | undefined = productsBody.products?.[0]?.id;

  if (!productId) {
    const created = await request.post("/api/merchant/products", {
      data: {
        title: `E2E Product ${Date.now()}`,
        slug: `e2e-${Date.now()}`,
        type: "DIGITAL",
        price: "9.99",
        status: "ACTIVE",
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    productId = (await created.json()).product?.id;
  }
  expect(productId).toBeTruthy();

  const q = `tenant=${TENANT}&locale=en`;
  const add = await request.post(`/api/store/cart/add?${q}`, {
    data: { productId, quantity: 1 },
  });
  expect(add.ok(), await add.text()).toBeTruthy();

  const placed = await request.post(`/api/store/checkout/place?${q}`, {
    data: {
      email: `e2e-buyer-${Date.now()}@example.com`,
      name: "E2E Buyer",
      country: "US",
      acceptPolicies: true,
      locale: "en",
    },
  });
  expect(placed.ok(), await placed.text()).toBeTruthy();
  const placeBody = await placed.json();

  if (placeBody.mode === "stripe") {
    expect(placeBody.orderId || placeBody.url).toBeTruthy();
    return;
  }

  expect(placeBody.mode).toBe("demo");
  expect(placeBody.orderId).toBeTruthy();

  const order = await request.get(`/api/merchant/orders/${placeBody.orderId}`);
  expect(order.ok(), await order.text()).toBeTruthy();
  const status = (await order.json()).order?.status;
  expect(["PAID", "FULFILLED"]).toContain(status);
});
