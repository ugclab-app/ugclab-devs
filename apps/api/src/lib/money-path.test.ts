import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { simulateMoneyPath } from "./merchant-balance-math.js";
import {
  assertNewShopGmvAllowed,
  evaluateMorPayoutRequest,
  isFirstPayoutHeld,
  shouldFreezeOnDisputeCount,
  disputeCountsTowardFreeze,
} from "./mor-risk.js";

/**
 * End-to-end money ledger: payment → refund → balance → payout request → paid.
 * Pure math covering the most expensive MoR regression surface.
 */
describe("money path: payment → refund → balance → payout", () => {
  it("credits net after a paid order", () => {
    const bal = simulateMoneyPath({
      paidOrders: [{ totalAmount: 10_000, platformFeeAmount: 500 }],
    });
    assert.equal(bal.earnedCents, 9_500);
    assert.equal(bal.availableCents, 9_500);
    assert.equal(bal.platformFeesCents, 500);
  });

  it("removes a fully refunded order from available balance", () => {
    const afterPay = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500 },
        { totalAmount: 4_000, platformFeeAmount: 200 },
      ],
    });
    assert.equal(afterPay.availableCents, 9_500 + 3_800);

    const afterRefund = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500, refunded: true },
        { totalAmount: 4_000, platformFeeAmount: 200 },
      ],
    });
    assert.equal(afterRefund.availableCents, 3_800);
    assert.equal(afterRefund.earnedCents, 3_800);
  });

  it("blocks disputed orders from available balance", () => {
    const bal = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500, disputed: true },
        { totalAmount: 2_000, platformFeeAmount: 100 },
      ],
    });
    assert.equal(bal.availableCents, 1_900);
    assert.equal(bal.earnedCents, 1_900);
  });

  it("holds buyer-protection funds until release", () => {
    const held = simulateMoneyPath({
      paidOrders: [
        {
          totalAmount: 10_000,
          platformFeeAmount: 500,
          buyerProtection: true,
          fundsReleasedAt: null,
        },
      ],
    });
    assert.equal(held.heldCents, 9_500);
    assert.equal(held.availableCents, 0);

    const released = simulateMoneyPath({
      paidOrders: [
        {
          totalAmount: 10_000,
          platformFeeAmount: 500,
          buyerProtection: true,
          fundsReleasedAt: new Date("2026-11-01"),
        },
      ],
    });
    // 10% reserve on protected released earnings
    assert.equal(released.reserveCents, 950);
    assert.equal(released.availableCents, 9_500 - 950);
  });

  it("reduces available when payout is requested, then marks paid", () => {
    const afterRequest = simulateMoneyPath({
      paidOrders: [{ totalAmount: 20_000, platformFeeAmount: 1_000 }],
      payoutRequests: [{ amount: 10_000, status: "PENDING" }],
    });
    assert.equal(afterRequest.availableCents, 19_000 - 10_000);
    assert.equal(afterRequest.pendingPayoutCents, 10_000);

    const afterPaid = simulateMoneyPath({
      paidOrders: [{ totalAmount: 20_000, platformFeeAmount: 1_000 }],
      payoutRequests: [{ amount: 10_000, status: "PAID" }],
    });
    assert.equal(afterPaid.availableCents, 9_000);
    assert.equal(afterPaid.paidOutCents, 10_000);
    assert.equal(afterPaid.pendingPayoutCents, 0);
  });

  it("FAILED payout returns funds to available", () => {
    const bal = simulateMoneyPath({
      paidOrders: [{ totalAmount: 10_000, platformFeeAmount: 500 }],
      payoutRequests: [{ amount: 5_000, status: "FAILED" }],
    });
    assert.equal(bal.availableCents, 9_500);
    assert.equal(bal.paidOutCents, 0);
    assert.equal(bal.pendingPayoutCents, 0);
  });

  it("full path: pay → refund one → request payout → mark paid", () => {
    // Two orders paid
    let bal = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500 },
        { totalAmount: 8_000, platformFeeAmount: 400 },
      ],
    });
    assert.equal(bal.availableCents, 9_500 + 7_600);

    // Refund first order
    bal = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500, refunded: true },
        { totalAmount: 8_000, platformFeeAmount: 400 },
      ],
    });
    assert.equal(bal.availableCents, 7_600);

    // Request full available payout
    bal = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500, refunded: true },
        { totalAmount: 8_000, platformFeeAmount: 400 },
      ],
      payoutRequests: [{ amount: 7_600, status: "PENDING" }],
    });
    assert.equal(bal.availableCents, 0);
    assert.equal(bal.pendingPayoutCents, 7_600);

    // Platform marks paid
    bal = simulateMoneyPath({
      paidOrders: [
        { totalAmount: 10_000, platformFeeAmount: 500, refunded: true },
        { totalAmount: 8_000, platformFeeAmount: 400 },
      ],
      payoutRequests: [{ amount: 7_600, status: "PAID" }],
    });
    assert.equal(bal.availableCents, 0);
    assert.equal(bal.paidOutCents, 7_600);
  });
});

describe("MoR risk rules", () => {
  it("holds first payout for N days on new shops", () => {
    const created = new Date("2026-11-01T00:00:00Z");
    const day3 = new Date("2026-11-04T00:00:00Z");
    const day20 = new Date("2026-11-21T00:00:00Z");
    assert.equal(
      isFirstPayoutHeld({
        createdAt: created,
        hasPaidPayout: false,
        now: day3,
        holdDays: 14,
      }).held,
      true
    );
    assert.equal(
      isFirstPayoutHeld({
        createdAt: created,
        hasPaidPayout: false,
        now: day20,
        holdDays: 14,
      }).held,
      false
    );
    assert.equal(
      isFirstPayoutHeld({
        createdAt: created,
        hasPaidPayout: true,
        now: day3,
        holdDays: 14,
      }).held,
      false
    );
  });

  it("caps new-shop GMV in the first week", () => {
    assert.equal(
      assertNewShopGmvAllowed({
        isNew: true,
        weekGmvCents: 40_000,
        orderCents: 10_000,
        capCents: 50_000,
      }),
      null
    );
    // 40k + 15k = 55k > 50k
    assert.match(
      assertNewShopGmvAllowed({
        isNew: true,
        weekGmvCents: 40_000,
        orderCents: 15_000,
        capCents: 50_000,
      }) ?? "",
      /New store limit/
    );
    assert.equal(
      assertNewShopGmvAllowed({
        isNew: false,
        weekGmvCents: 100_000,
        orderCents: 50_000,
        capCents: 50_000,
      }),
      null
    );
  });

  it("freezes when open/lost disputes hit threshold", () => {
    assert.equal(shouldFreezeOnDisputeCount(2, 3), false);
    assert.equal(shouldFreezeOnDisputeCount(3, 3), true);
    assert.equal(shouldFreezeOnDisputeCount(5, 0), false);
    assert.equal(disputeCountsTowardFreeze("won"), false);
    assert.equal(disputeCountsTowardFreeze("needs_response"), true);
    assert.equal(disputeCountsTowardFreeze("lost"), true);
  });

  it("evaluateMorPayoutRequest enforces hold, KYC, suspend, min", () => {
    const base = {
      tenantStatus: "ACTIVE",
      createdAt: new Date("2026-01-01"),
      hasPaidPayout: true,
      kycApproved: true,
      availableCents: 10_000,
      amountCents: 10_000,
      minPayoutCents: 5_000,
      now: new Date("2026-11-05"),
    };
    assert.equal(evaluateMorPayoutRequest(base).ok, true);

    assert.equal(
      evaluateMorPayoutRequest({ ...base, tenantStatus: "SUSPENDED" }).code,
      "SUSPENDED"
    );
    assert.equal(
      evaluateMorPayoutRequest({ ...base, kycApproved: false }).code,
      "KYC"
    );
    assert.equal(
      evaluateMorPayoutRequest({
        ...base,
        hasPaidPayout: false,
        createdAt: new Date("2026-11-01"),
        holdDays: 14,
        now: new Date("2026-11-05"),
      }).code,
      "FIRST_PAYOUT_HOLD"
    );
    assert.equal(
      evaluateMorPayoutRequest({ ...base, amountCents: 100 }).code,
      "BELOW_MIN"
    );
  });
});
