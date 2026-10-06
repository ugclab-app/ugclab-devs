import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { Signer } from "@mancho.devs/authorizer";
import {
  finikAmountToMinor,
  orderAmountMatchesFinik,
} from "./amount.js";
import { normalizePem, shouldUseFinikCheckout } from "./config.js";
import {
  extractFinikPaymentIds,
  finikWebhookEventId,
  isFinikSuccessStatus,
  parseFinikWebhook,
} from "./webhook-parse.js";
import { resolveWebhookHostCandidates } from "./webhook-host.js";

describe("finik amount", () => {
  it("converts soms to tyiyn", () => {
    assert.equal(finikAmountToMinor(100), 10000);
    assert.equal(finikAmountToMinor(0.01), 1);
    assert.equal(finikAmountToMinor(12.34), 1234);
  });

  it("matches order total within tolerance", () => {
    assert.equal(
      orderAmountMatchesFinik({
        orderTotalMinor: 150000,
        finikAmountMajor: 1500,
      }),
      true
    );
    assert.equal(
      orderAmountMatchesFinik({
        orderTotalMinor: 150000,
        finikAmountMajor: 1499,
      }),
      false
    );
    assert.equal(
      orderAmountMatchesFinik({
        orderTotalMinor: 100,
        finikAmountMajor: null,
      }),
      false
    );
  });
});

describe("finik webhook helpers", () => {
  it("parses success statuses case-insensitively", () => {
    assert.equal(isFinikSuccessStatus("success"), true);
    assert.equal(isFinikSuccessStatus("SUCCEEDED"), true);
    assert.equal(isFinikSuccessStatus("failed"), false);
  });

  it("extracts payment ids and amount", () => {
    const payload = parseFinikWebhook(
      JSON.stringify({
        status: "succeeded",
        amount: 100,
        transactionId: "tx-1",
        fields: { paymentId: "pay-uuid", orderId: "ord_1", amount: 100 },
      })
    );
    assert.equal(finikWebhookEventId(payload), "tx-1");
    const ids = extractFinikPaymentIds(payload);
    assert.equal(ids.paymentId, "pay-uuid");
    assert.equal(ids.orderIdFromFields, "ord_1");
    assert.equal(ids.amountMajor, 100);
  });

  it("prefers transactionId for idempotency key", () => {
    assert.equal(
      finikWebhookEventId({
        id: "id-1",
        transactionId: "tx-dup",
        fields: { paymentId: "pay-1" },
      }),
      "tx-dup"
    );
  });
});

describe("finik webhook host candidates", () => {
  it("prefers x-forwarded-host and strips port", () => {
    const hosts = resolveWebhookHostCandidates({
      host: "localhost:4000",
      forwardedHost: "api.tescommerce.com, other.example",
      publicApiUrl: "https://api.tescommerce.com",
    });
    assert.deepEqual(hosts, ["api.tescommerce.com", "localhost"]);
  });
});

describe("finik pem + checkout gate", () => {
  it("normalizes escaped newlines in PEM", () => {
    const pem = normalizePem(
      "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----"
    );
    assert.ok(pem?.includes("\nABC\n"));
  });

  it("requires KGS for checkout", () => {
    const prev = {
      key: process.env.FINIK_API_KEY,
      pem: process.env.FINIK_PRIVATE_PEM,
      acc: process.env.FINIK_ACCOUNT_ID,
    };
    process.env.FINIK_API_KEY = "k";
    process.env.FINIK_PRIVATE_PEM =
      "-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----";
    process.env.FINIK_ACCOUNT_ID = "acc";
    assert.equal(shouldUseFinikCheckout("KGS"), true);
    assert.equal(shouldUseFinikCheckout("USD"), false);
    process.env.FINIK_API_KEY = prev.key;
    process.env.FINIK_PRIVATE_PEM = prev.pem;
    process.env.FINIK_ACCOUNT_ID = prev.acc;
  });
});

describe("finik create-payment signing shape", () => {
  it("signs and verifies RSA-SHA256 with authorizer", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const body = {
      Amount: 100,
      CardType: "FINIK_QR",
      PaymentId: "a3f1c2e4-7b9d-4e2a-8c1f-3d0e9b2a5f6c",
      RedirectUrl: "https://example.com/success",
      Data: {
        accountId: "acc",
        name_en: "Test",
        webhookUrl: "https://api.example.com/api/finik/webhook",
      },
    };
    const timestamp = "1737369000000";
    const requestData = {
      httpMethod: "POST",
      path: "/v1/payment",
      headers: {
        Host: "api.acquiring.averspay.kg",
        "x-api-key": "test-key",
        "x-api-timestamp": timestamp,
      },
      queryStringParameters: null as null,
      body,
    };

    const signature = await new Signer(requestData).sign(privateKey);
    assert.ok(signature.length > 20);
    const ok = await new Signer(requestData).verify(publicKey, signature);
    assert.equal(ok, true);
  });
});
