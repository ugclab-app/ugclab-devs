import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  checkRateLimit,
  clientIpFromHeaders,
  _resetRateLimitForTests,
} from "./rate-limit.js";

describe("checkRateLimit", () => {
  beforeEach(() => _resetRateLimitForTests());

  it("allows up to max hits then blocks", () => {
    const key = "test:ip";
    assert.equal(checkRateLimit(key, { max: 3, windowMs: 60_000 }).ok, true);
    assert.equal(checkRateLimit(key, { max: 3, windowMs: 60_000 }).ok, true);
    assert.equal(checkRateLimit(key, { max: 3, windowMs: 60_000 }).ok, true);
    const blocked = checkRateLimit(key, { max: 3, windowMs: 60_000 });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
  });

  it("tracks keys independently", () => {
    assert.equal(checkRateLimit("a", { max: 1 }).ok, true);
    assert.equal(checkRateLimit("b", { max: 1 }).ok, true);
    assert.equal(checkRateLimit("a", { max: 1 }).ok, false);
    assert.equal(checkRateLimit("b", { max: 1 }).ok, false);
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers x-forwarded-for first hop", () => {
    const h = {
      get(name: string) {
        if (name === "x-forwarded-for") return "1.2.3.4, 5.6.7.8";
        return undefined;
      },
    };
    assert.equal(clientIpFromHeaders(h), "1.2.3.4");
  });

  it("falls back to unknown", () => {
    assert.equal(clientIpFromHeaders({ get: () => undefined }), "unknown");
  });
});
