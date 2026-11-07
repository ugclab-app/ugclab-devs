import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { estimateDeliveryEta } from "./delivery-eta.js";

describe("estimateDeliveryEta", () => {
  it("returns null for digital products", () => {
    assert.equal(estimateDeliveryEta({ productType: "DIGITAL" }), null);
    assert.equal(estimateDeliveryEta({ productType: "GIFT_CARD" }), null);
  });

  it("formats a business-day window for physical goods", () => {
    const eta = estimateDeliveryEta({
      productType: "PHYSICAL",
      minDays: 2,
      maxDays: 4,
      from: new Date("2026-11-02T12:00:00Z"), // Monday
      locale: "en",
    });
    assert.ok(eta);
    assert.equal(eta!.minDays, 2);
    assert.equal(eta!.maxDays, 4);
    assert.match(eta!.summary, /^Arrives /);
  });
});
