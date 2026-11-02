import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bnplMethodsForCurrency,
  collectCustomFieldAnswers,
  isCountryBlocked,
  parseCheckoutFields,
  resolvePwywUnit,
  resolveTipCents,
} from "./checkout-extras.js";
import { parseLessons, toEmbedUrl } from "./courses.js";

describe("checkout extras", () => {
  it("tips: preset percent or custom cents", () => {
    assert.equal(resolveTipCents({ enabled: true, presets: [10], subtotalCents: 5000, tipPercent: 10 }), 500);
    assert.equal(resolveTipCents({ enabled: true, presets: [10], subtotalCents: 5000, tipPercent: 7 }), 0);
    assert.equal(resolveTipCents({ enabled: true, presets: [], subtotalCents: 5000, tipCents: 300 }), 300);
    assert.equal(resolveTipCents({ enabled: false, presets: [10], subtotalCents: 5000, tipPercent: 10 }), 0);
  });

  it("custom fields: keys, required", () => {
    const fields = parseCheckoutFields([
      { label: "Delivery date", type: "date", required: true },
      { label: "VAT / INN", key: "vat" },
    ]);
    assert.equal(fields[0]!.key, "delivery_date");
    assert.equal(fields[1]!.key, "vat");
    assert.throws(() => collectCustomFieldAnswers(fields, {}), /Delivery date is required/);
    assert.deepEqual(
      collectCustomFieldAnswers(fields, { delivery_date: "2026-11-01", vat: "" }),
      { delivery_date: "2026-11-01" }
    );
  });

  it("blocked countries", () => {
    assert.equal(isCountryBlocked(["RU", "BY"], "ru"), true);
    assert.equal(isCountryBlocked([], "US"), false);
  });

  it("pay what you want clamps to minimum", () => {
    assert.equal(resolvePwywUnit({ payWhatYouWant: true, priceAmount: 1000, minPriceAmount: 500, requestedCents: 200 }), 500);
    assert.equal(resolvePwywUnit({ payWhatYouWant: true, priceAmount: 1000, minPriceAmount: null, requestedCents: 1500 }), 1500);
    assert.equal(resolvePwywUnit({ payWhatYouWant: false, priceAmount: 1000, minPriceAmount: null, requestedCents: 1 }), null);
  });

  it("bnpl by currency", () => {
    assert.ok(bnplMethodsForCurrency("usd").includes("affirm"));
    assert.deepEqual(bnplMethodsForCurrency("KGS"), []);
  });
});

describe("courses", () => {
  it("parses lessons and embeds video", () => {
    const lessons = parseLessons(JSON.stringify([{ title: "Intro", videoUrl: "https://youtu.be/abc123" }, {}]));
    assert.equal(lessons.length, 1);
    assert.equal(toEmbedUrl(lessons[0]!.videoUrl!), "https://www.youtube-nocookie.com/embed/abc123?rel=0");
    assert.equal(toEmbedUrl("https://vimeo.com/12345"), "https://player.vimeo.com/video/12345");
  });
});
