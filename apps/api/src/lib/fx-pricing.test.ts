import { test } from "node:test";
import assert from "node:assert/strict";
import { convertAmount, getFxRates, setFxRates } from "@ugclab/i18n/store-currency";
import {
  fixedPriceForCurrency,
  formatCurrencyPrices,
  parseCurrencyPrices,
} from "./country-price.js";
import { priceForDisplay } from "./store-display-currency.js";

test("setFxRates applies live rates and keeps USD at 1", () => {
  setFxRates({ EUR: 0.9, GBP: 0.75, USD: 5 });
  const r = getFxRates();
  assert.equal(r.EUR, 0.9);
  assert.equal(r.GBP, 0.75);
  assert.equal(r.USD, 1);
  assert.equal(convertAmount(2400, "USD", "EUR"), 2160);
});

test("setFxRates rejects broken feed values and keeps the fallback", () => {
  setFxRates({ EUR: 0, GBP: 79, PLN: Number.NaN });
  const r = getFxRates();
  assert.equal(r.EUR, 0.92);
  assert.equal(r.GBP, 0.79);
  assert.equal(r.PLN, 3.95);
});

test("currency prices parse, format and resolve", () => {
  const parsed = parseCurrencyPrices("eur=25\nGBP:21.50, junk, US=10");
  assert.deepEqual(parsed, { EUR: 2500, GBP: 2150 });
  const translations = { _currencyPrices: parsed };
  assert.equal(formatCurrencyPrices(translations), "EUR=25.00\nGBP=21.50");
  assert.equal(fixedPriceForCurrency(translations, "eur"), 2500);
  assert.equal(fixedPriceForCurrency(translations, "CAD"), null);
  assert.equal(fixedPriceForCurrency(null, "EUR"), null);
  assert.equal(parseCurrencyPrices(""), null);
});

test("storefront shows the fixed price and keeps the compare-at ratio", () => {
  setFxRates({ EUR: 0.9 });
  const settings = { currency: "USD", localeCurrencies: { en: "EUR" } };
  const item = { priceAmount: 2400, compareAt: 3000 };
  const fixed = priceForDisplay(item, "en", settings, "EUR", { _currencyPrices: { EUR: 2500 } });
  assert.equal(fixed.displayCurrency, "EUR");
  assert.equal(fixed.priceAmount, 2500);
  assert.equal(fixed.compareAt, 3125);
  const converted = priceForDisplay(item, "en", settings, "EUR", {});
  assert.equal(converted.priceAmount, 2160);
  const base = priceForDisplay(item, "en", settings, "USD", { _currencyPrices: { EUR: 2500 } });
  assert.equal(base.priceAmount, 2400);
});
