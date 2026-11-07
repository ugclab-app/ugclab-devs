import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { detectSource, parseStoreImport } from "./store-import.js";

const SHOPIFY = [
  "Handle,Title,Body (HTML),Vendor,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Grams,Variant Inventory Qty,Variant Price,Variant Compare At Price,Image Src",
  'tee,Cool Tee,"<p>Soft</p>",Acme,"summer, cotton",TRUE,Size,S,TEE-S,200,5,19.99,24.99,https://cdn/x1.jpg',
  "tee,,,,,,,M,TEE-M,200,3,19.99,,https://cdn/x2.jpg",
  'mug,Mug,<p>Ceramic</p>,Acme,,TRUE,Title,Default Title,MUG,300,10,9.5,,',
].join("\n");

const WOO = [
  "ID,Type,SKU,Name,Published,Description,Stock,Regular price,Sale price,Categories,Images,Parent,Attribute 1 value(s)",
  '1,variable,HOODIE,Hoodie,1,Warm,,49,,Clothing > Tops,https://w/h.jpg,,',
  "2,variation,HOODIE-L,Hoodie - L,1,,4,49,39,,,id:1,L",
  '3,simple,PDF,Guide,1,Ebook,,12,,Digital,,,',
].join("\n");

const ETSY = [
  "TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,IMAGE1,IMAGE2,SKU",
  'Handmade Bowl,"Nice bowl",35,USD,2,"ceramic,bowl",https://e/1.jpg,,BOWL-1',
].join("\n");

const SHOPIFY_CUSTOMERS = [
  "First Name,Last Name,Email,Accepts Email Marketing,Default Address Country Code,Phone",
  "Ann,Lee,ann@example.com,yes,US,+1555",
  "Bob,,bob@example.com,no,GB,",
].join("\n");

describe("store import detection", () => {
  it("detects shopify / woo / etsy products", () => {
    assert.deepEqual(detectSource(SHOPIFY.split("\n")[0]!.split(",")), { source: "shopify", kind: "products" });
    assert.deepEqual(detectSource(WOO.split("\n")[0]!.split(",")), { source: "woocommerce", kind: "products" });
    assert.deepEqual(detectSource(ETSY.split("\n")[0]!.split(",")), { source: "etsy", kind: "products" });
  });
});

describe("store import parsing", () => {
  it("groups shopify variant rows by handle", () => {
    const r = parseStoreImport(SHOPIFY);
    assert.equal(r.kind, "products");
    if (r.kind !== "products") return;
    assert.equal(r.rows.length, 2);
    const tee = r.rows.find((p) => p.handle === "tee")!;
    assert.equal(tee.priceCents, 1999);
    assert.equal(tee.compareAtCents, 2499);
    assert.equal(tee.variants.length, 2);
    assert.deepEqual(tee.imageUrls, ["https://cdn/x1.jpg", "https://cdn/x2.jpg"]);
    const mug = r.rows.find((p) => p.handle === "mug")!;
    assert.equal(mug.variants.length, 0);
  });

  it("attaches woo variations to parent and flags digital", () => {
    const r = parseStoreImport(WOO);
    if (r.kind !== "products") throw new Error("kind");
    const hoodie = r.rows.find((p) => p.title === "Hoodie")!;
    assert.equal(hoodie.variants.length, 1);
    assert.equal(hoodie.variants[0]!.priceCents, 3900);
    assert.deepEqual(hoodie.tags, ["clothing"]);
  });

  it("parses etsy listing images", () => {
    const r = parseStoreImport(ETSY);
    if (r.kind !== "products") throw new Error("kind");
    assert.equal(r.rows[0]!.priceCents, 3500);
    assert.deepEqual(r.rows[0]!.imageUrls, ["https://e/1.jpg"]);
  });

  it("parses shopify customers", () => {
    const r = parseStoreImport(SHOPIFY_CUSTOMERS);
    assert.equal(r.kind, "customers");
    if (r.kind !== "customers") return;
    assert.equal(r.rows.length, 2);
    assert.equal(r.rows[0]!.name, "Ann Lee");
    assert.equal(r.rows[0]!.acceptsMarketing, true);
    assert.equal(r.rows[1]!.country, "GB");
  });
});
