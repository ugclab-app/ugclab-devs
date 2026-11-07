import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { nextDunningStep, DUNNING_GAPS_DAYS } from "./billing-dunning-math.js";
import { auditStoreSeo } from "./seo-audit.js";
import { refundAmountCents, composeTotals, applyCredits } from "./order-math.js";

describe("dunning steps", () => {
  it("starts at step 1 when never reminded", () => {
    assert.equal(nextDunningStep(0, null), 1);
  });

  it("waits between steps", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const recent = new Date("2026-11-10T06:00:00Z");
    assert.equal(nextDunningStep(1, recent, now), null);
    const ready = new Date("2026-11-07T12:00:00Z");
    assert.equal(nextDunningStep(1, ready, now), 2);
  });

  it("stops after final step", () => {
    assert.equal(nextDunningStep(DUNNING_GAPS_DAYS.length, new Date()), null);
  });
});

describe("checkout → refund flow math", () => {
  it("composes totals then refunds a line", () => {
    const totals = composeTotals({
      subtotal: 10_000,
      discountAmount: 1_000,
      shippingAmount: 500,
      taxRateBps: 0,
      taxIncluded: false,
    });
    const paid = applyCredits(totals.totalBeforeCredits, {}).total;
    assert.equal(paid, 9_500);

    const refund = refundAmountCents(
      {
        totalAmount: paid,
        items: [
          { id: "a", unitAmount: 5000, quantity: 1 },
          { id: "b", unitAmount: 4500, quantity: 1 },
        ],
      },
      { lineItems: [{ lineId: "a", quantity: 1 }] }
    );
    assert.equal(refund, 5000);
  });
});

describe("seo audit score", () => {
  it("scores a complete store highly", () => {
    const r = auditStoreSeo({
      seoTitle: "Handmade bags from Bishkek — Tescommerce",
      seoDescription:
        "Ship handmade bags worldwide. Accept cards even when Stripe seller accounts are limited.",
      seoOgImageUrl: "https://cdn.example/og.png",
      activeProducts: 3,
      productsMissingSeoTitle: 0,
      productsMissingSeoDescription: 0,
      collectionsWithSeo: 2,
      collectionsTotal: 2,
      hasCustomDomain: true,
      blogPosts: 2,
    });
    assert.equal(r.grade, "A");
    assert.equal(r.score, r.maxScore);
  });

  it("flags empty store SEO", () => {
    const r = auditStoreSeo({
      seoTitle: "",
      seoDescription: "",
      seoOgImageUrl: null,
      activeProducts: 5,
      productsMissingSeoTitle: 5,
      productsMissingSeoDescription: 5,
      collectionsWithSeo: 0,
      collectionsTotal: 3,
      hasCustomDomain: false,
      blogPosts: 0,
    });
    assert.equal(r.grade, "F");
    assert.ok(r.checks.some((c) => c.id === "store_title" && !c.ok));
  });
});
