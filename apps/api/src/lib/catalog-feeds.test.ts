import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildGoogleMerchantRss, buildMetaCatalogCsv } from "./catalog-feeds.js";

const sample = {
  storeName: "Demo Shop",
  storefrontUrl: "https://shop.example/?tenant=demo",
  apiPublicUrl: "https://api.example.com",
  currency: "USD",
  products: [
    {
      id: "p1",
      title: 'Tee "Blue"',
      description: "<p>Soft cotton</p>",
      slug: "tee-blue",
      type: "PHYSICAL",
      priceAmount: 2599,
      inventory: 3,
      images: [{ storageKey: "t1/p1/images/a.jpg" }],
    },
  ],
};

describe("catalog feeds", () => {
  it("builds Google Merchant RSS with escaped title and price", () => {
    const xml = buildGoogleMerchantRss(sample);
    assert.match(xml, /xmlns:g=/);
    assert.match(xml, /Tee &quot;Blue&quot;/);
    assert.match(xml, /25\.99 USD/);
    assert.match(xml, /in stock/);
    assert.match(xml, /\/api\/files\//);
  });

  it("builds Meta/TikTok CSV with header row", () => {
    const csv = buildMetaCatalogCsv(sample);
    assert.match(csv, /^id,title,description,/);
    assert.match(csv, /25\.99 USD/);
    assert.match(csv, /Soft cotton/);
  });
});
