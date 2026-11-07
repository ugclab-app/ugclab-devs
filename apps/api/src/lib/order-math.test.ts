import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  applyCredits,
  calcTax,
  composeTotals,
  isPartialRefund,
  refundAmountCents,
} from "./order-math.js";
import { formatInvoiceNumber } from "./invoice-numbering.js";
import { forecastDaysLeft } from "./stock-forecast-math.js";
import { rankCoPurchases, rankSimilar } from "./recommendations.js";
import {
  checkWebhookUrl,
  isPrivateIpv4,
  isPrivateIpv6,
  MAX_ATTEMPTS,
  nextRetryAt,
} from "./webhook-url-guard.js";

describe("checkout totals", () => {
  it("tax: exclusive vs included, zero rate", () => {
    assert.equal(calcTax(10000, 2000, false), 2000);
    assert.equal(calcTax(12000, 2000, true), 2000); // 12000 incl. 20% → 2000 tax
    assert.equal(calcTax(10000, 0, false), 0);
    assert.equal(calcTax(0, 2000, false), 0);
  });

  it("discount is clamped to subtotal and tax applies after discount + shipping", () => {
    const t = composeTotals({
      subtotal: 5000,
      discountAmount: 9999,
      shippingAmount: 500,
      taxRateBps: 1000,
      taxIncluded: false,
    });
    assert.equal(t.discountAmount, 5000);
    assert.equal(t.afterDiscount, 0);
    assert.equal(t.taxAmount, 50); // 10% of shipping only
    assert.equal(t.totalBeforeCredits, 550);
  });

  it("tip and gift wrap are added but not taxed; Stripe Tax zeroes tax", () => {
    const t = composeTotals({
      subtotal: 10000,
      discountAmount: 1000,
      shippingAmount: 0,
      taxRateBps: 2000,
      taxIncluded: false,
      giftWrapAmount: 300,
      tipAmount: 900,
    });
    assert.equal(t.taxAmount, 1800);
    assert.equal(t.totalBeforeCredits, 9000 + 1800 + 300 + 900);

    const s = composeTotals({ ...t, subtotal: 10000, discountAmount: 1000, shippingAmount: 0, taxRateBps: 2000, taxIncluded: false, stripeTaxEnabled: true, tipAmount: 900 });
    assert.equal(s.taxAmount, 0);
    assert.equal(s.totalBeforeCredits, 9900);
  });

  it("credits: gift card → loyalty → store credit, never below zero", () => {
    const r = applyCredits(10000, { giftCardBalance: 3000, loyaltyDiscount: 2000, storeCreditBalance: 9000 });
    assert.deepEqual(r, { giftCardAmount: 3000, loyaltyDiscountAmount: 2000, storeCreditAmount: 5000, total: 0 });

    const big = applyCredits(1000, { giftCardBalance: 5000, loyaltyDiscount: 500, storeCreditBalance: 500 });
    assert.deepEqual(big, { giftCardAmount: 1000, loyaltyDiscountAmount: 0, storeCreditAmount: 0, total: 0 });

    const none = applyCredits(1234, {});
    assert.equal(none.total, 1234);
  });
});

describe("refund math", () => {
  const order = {
    totalAmount: 7000,
    items: [
      { id: "a", unitAmount: 2000, quantity: 2 },
      { id: "b", unitAmount: 3000, quantity: 1 },
    ],
  };

  it("line items: qty clamped, unknown lines ignored", () => {
    assert.equal(refundAmountCents(order, { lineItems: [{ lineId: "a", quantity: 5 }] }), 4000);
    assert.equal(
      refundAmountCents(order, {
        lineItems: [
          { lineId: "a", quantity: 1 },
          { lineId: "zzz", quantity: 1 },
          { lineId: "b", quantity: 0 },
        ],
      }),
      2000
    );
  });

  it("explicit amount is capped at the order total; missing/zero means full refund", () => {
    assert.equal(refundAmountCents(order, { amountCents: 99999 }), 7000);
    assert.equal(refundAmountCents(order, { amountCents: 1500 }), 1500);
    assert.equal(refundAmountCents(order, {}), 7000);
    assert.equal(refundAmountCents(order, { amountCents: 0 }), 7000);
  });

  it("partial flag", () => {
    assert.equal(isPartialRefund(1500, 7000), true);
    assert.equal(isPartialRefund(7000, 7000), false);
    assert.equal(isPartialRefund(0, 7000), false);
  });
});

describe("invoice numbering", () => {
  it("pads to six digits with prefix", () => {
    assert.equal(formatInvoiceNumber("INV-", 42), "INV-000042");
    assert.equal(formatInvoiceNumber("", 1234567), "1234567");
    assert.equal(formatInvoiceNumber(null, 7), "000007");
  });
});

describe("stock forecast", () => {
  it("run-rate and levels", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const f = forecastDaysLeft({ inventory: 30, unitsSold: 60, windowDays: 30 }, now);
    assert.equal(f.dailyRate, 2);
    assert.equal(f.daysLeft, 15);
    assert.equal(f.level, "warning");
    assert.equal(f.runOutAt?.toISOString(), "2026-01-16T00:00:00.000Z");

    assert.equal(forecastDaysLeft({ inventory: 5, unitsSold: 60, windowDays: 30 }, now).level, "critical");
    assert.equal(forecastDaysLeft({ inventory: 500, unitsSold: 60, windowDays: 30 }, now).level, "ok");
    assert.equal(forecastDaysLeft({ inventory: 0, unitsSold: 0, windowDays: 30 }, now).level, "out");
    const unknown = forecastDaysLeft({ inventory: 10, unitsSold: 0, windowDays: 30 }, now);
    assert.equal(unknown.daysLeft, null);
    assert.equal(unknown.level, "unknown");
  });
});

describe("recommendations", () => {
  const d = new Date("2026-01-01");
  const target = { id: "t", type: "PHYSICAL", tags: ["tea", "green"], collectionIds: ["c1"], priceAmount: 1000, createdAt: d };
  it("similar: collections outrank tags, no self, zero-score dropped", () => {
    const ids = rankSimilar(target, [
      target,
      { id: "sameCol", type: "DIGITAL", tags: [], collectionIds: ["c1"], priceAmount: 50000, createdAt: d },
      { id: "sameTag", type: "PHYSICAL", tags: ["Tea"], collectionIds: [], priceAmount: 1100, createdAt: d },
      { id: "unrelated", type: "DIGITAL", tags: ["x"], collectionIds: ["c9"], priceAmount: 90000, createdAt: d },
    ]);
    assert.deepEqual(ids, ["sameCol", "sameTag"]);
  });
  it("bought together counts co-occurrence across orders", () => {
    const r = rankCoPurchases("t", [["t", "a", "b"], ["t", "a"], ["a", "b"], ["t"]]);
    assert.deepEqual(r, [
      { id: "a", count: 2 },
      { id: "b", count: 1 },
    ]);
  });
});

describe("webhook URL guard", () => {
  it("private ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0"]) {
      assert.equal(isPrivateIpv4(ip), true, ip);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1"]) {
      assert.equal(isPrivateIpv4(ip), false, ip);
    }
    assert.equal(isPrivateIpv6("::1"), true);
    assert.equal(isPrivateIpv6("fd00::1"), true);
    assert.equal(isPrivateIpv6("::ffff:10.0.0.1"), true);
    assert.equal(isPrivateIpv6("2606:4700::1111"), false);
  });

  it("rejects non-https, credentials, local hosts, raw private IPs", () => {
    assert.equal(checkWebhookUrl("http://example.com/x").ok, false);
    assert.equal(checkWebhookUrl("https://user:pw@example.com/x").ok, false);
    assert.equal(checkWebhookUrl("https://localhost/x").ok, false);
    assert.equal(checkWebhookUrl("https://api.internal/x").ok, false);
    assert.equal(checkWebhookUrl("https://10.0.0.5/x").ok, false);
    assert.equal(checkWebhookUrl("https://[::1]/x").ok, false);
    assert.equal(checkWebhookUrl("not a url").ok, false);
    const ok = checkWebhookUrl("https://hooks.example.com/ugclab");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.hostname, "hooks.example.com");
  });

  it("backoff schedule ends after MAX_ATTEMPTS", () => {
    const now = 0;
    assert.equal(nextRetryAt(1, now)?.getTime(), 60_000);
    assert.equal(nextRetryAt(2, now)?.getTime(), 300_000);
    assert.equal(nextRetryAt(MAX_ATTEMPTS - 1, now)?.getTime(), 43_200_000);
    assert.equal(nextRetryAt(MAX_ATTEMPTS, now), null);
  });
});
