import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { takeLicenseKey } from "./license-keys.js";

describe("takeLicenseKey", () => {
  it("pops the first non-empty line", () => {
    const r = takeLicenseKey("AAA\nBBB\nCCC");
    assert.equal(r.key, "AAA");
    assert.equal(r.remaining, "BBB\nCCC");
  });

  it("returns null for empty pool", () => {
    const r = takeLicenseKey("  \n  ");
    assert.equal(r.key, null);
    assert.equal(r.remaining, null);
  });
});
