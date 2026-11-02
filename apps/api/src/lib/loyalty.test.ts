import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  earnPointsForPaidTotal,
  maxRedeemablePoints,
  pointsToDiscountCents,
} from "./loyalty-math.js";

describe("loyalty math", () => {
  it("earns per major unit", () => {
    assert.equal(earnPointsForPaidTotal(1250, 2), 24);
    assert.equal(earnPointsForPaidTotal(99, 1), 0);
  });

  it("caps redeem by balance and subtotal", () => {
    assert.equal(maxRedeemablePoints(100, 500, 10), 50);
    assert.equal(maxRedeemablePoints(10, 5000, 10), 10);
  });

  it("converts points to discount cents", () => {
    assert.equal(pointsToDiscountCents(25, 2), 50);
  });
});
