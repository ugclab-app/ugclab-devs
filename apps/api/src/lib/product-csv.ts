export const PRODUCT_CSV_FIELDS = [
  "title",
  "slug",
  "type",
  "status",
  "price",
  "inventory",
  "tags",
  "weight",
  "barcode",
  "description",
] as const;

export type ProductCsvField = (typeof PRODUCT_CSV_FIELDS)[number] | "ignore";

export type CsvMapping = Partial<Record<(typeof PRODUCT_CSV_FIELDS)[number], number>>;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

const HEADER_HINTS: Record<(typeof PRODUCT_CSV_FIELDS)[number], string[]> = {
  title: ["title", "name", "product"],
  slug: ["slug", "handle"],
  type: ["type"],
  status: ["status"],
  price: ["price", "priceamount", "amount"],
  inventory: ["inventory", "stock", "qty", "quantity"],
  tags: ["tags", "tag"],
  weight: ["weight", "weightgrams"],
  barcode: ["barcode", "sku", "ean"],
  description: ["description", "body"],
};

export function suggestMapping(headers: string[]): CsvMapping {
  const mapping: CsvMapping = {};
  headers.forEach((header, index) => {
    const key = header.toLowerCase().replace(/[^a-z]/g, "");
    for (const field of PRODUCT_CSV_FIELDS) {
      if (mapping[field] != null) continue;
      if (HEADER_HINTS[field].some((hint) => key === hint || key.includes(hint))) {
        mapping[field] = index;
      }
    }
  });
  if (mapping.title == null && headers.length) mapping.title = 0;
  return mapping;
}

export type CsvPreviewRow = {
  row: number;
  title: string;
  price: string;
  errors: string[];
};

export function previewProductCsv(text: string, mapping: CsvMapping) {
  const table = parseCsv(text);
  const headers = table[0] ?? [];
  const body = table.slice(1);
  const rows: CsvPreviewRow[] = body.slice(0, 50).map((cols, i) => {
    const title = cell(cols, mapping.title);
    const price = cell(cols, mapping.price);
    const errors: string[] = [];
    if (!title) errors.push("Title is required");
    if (price && !Number.isFinite(parsePrice(price, headers[mapping.price ?? -1] ?? ""))) {
      errors.push("Price is not a number");
    }
    const type = cell(cols, mapping.type).toUpperCase();
    if (type && !["PHYSICAL", "DIGITAL", "SERVICE"].includes(type)) {
      errors.push("Type must be PHYSICAL, DIGITAL, or SERVICE");
    }
    return { row: i + 2, title: title || "(empty)", price: price || "—", errors };
  });
  const errorCount = rows.filter((r) => r.errors.length).length;
  return {
    headers,
    mapping,
    rowCount: body.length,
    preview: rows,
    errorCount,
  };
}

export function cell(cols: string[], index: number | undefined) {
  if (index == null || index < 0) return "";
  return String(cols[index] ?? "").trim();
}

export function parsePrice(raw: string, header: string): number {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  const cents = /cent|priceamount/i.test(header);
  return cents ? Math.round(n) : Math.round(n * 100);
}
