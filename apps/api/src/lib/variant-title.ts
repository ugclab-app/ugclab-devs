const SIZES =
  "5XL|4XL|3XL|2XL|XXXL|XXL|XL|XXS|XS|S|M|L|ONE SIZE|ONESIZE|\\d{2}";
const SIZE_AT_END = new RegExp(`(?:^|[\\s\\-/])(${SIZES})$`, "i");

const COLORS = [
  "army green",
  "light blue",
  "navy blue",
  "dark blue",
  "sky blue",
  "hot pink",
  "off white",
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "pink",
  "purple",
  "gray",
  "grey",
  "brown",
  "orange",
  "navy",
  "beige",
  "gold",
  "silver",
  "khaki",
  "ivory",
  "cream",
  "wine",
  "burgundy",
  "apricot",
].sort((a, b) => b.length - a.length);

function tidy(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

/** Turn a supplier variant name into "Black / 2XL" when a color and size are present. */
export function shortVariantTitle(raw: string, productTitle?: string) {
  let text = raw.trim().replace(/\s+/g, " ");
  const product = productTitle?.trim();
  if (product && text.toLowerCase().startsWith(product.toLowerCase())) {
    text = text.slice(product.length).replace(/^[\s,–—\-:]+/, "").trim();
  }

  const pieces = text.split(/\s*[/|]\s*/).map((part) => part.trim()).filter(Boolean);
  if (pieces.length >= 2 && pieces.every((part) => part.length <= 28)) {
    return pieces.map((part) => (/^(xs|s|m|l|xl|\dxl|one size)$/i.test(part) ? part.toUpperCase() : tidy(part))).join(" / ").slice(0, 120);
  }

  const dashed = text.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (dashed.length === 2 && dashed.every((part) => part.length <= 28)) {
    const size = dashed[1]!;
    const color = dashed[0]!;
    return `${tidy(color)} / ${/^(xs|s|m|l|xl|\dxl)$/i.test(size) ? size.toUpperCase() : tidy(size)}`.slice(0, 120);
  }

  const sizeMatch = text.match(SIZE_AT_END);
  if (!sizeMatch || sizeMatch.index == null) {
    return text.slice(0, 120);
  }
  const size = sizeMatch[1]!.toUpperCase().replace("ONESIZE", "ONE SIZE");
  const before = text.slice(0, sizeMatch.index).trim();
  const lower = before.toLowerCase();
  let color = "";
  let colorAt = -1;
  for (const name of COLORS) {
    const at = lower.lastIndexOf(name);
    if (at > colorAt) {
      colorAt = at;
      color = name;
    }
  }
  if (!color) color = before.split(/\s+/).slice(-2).join(" ");
  if (!color) return size.slice(0, 120);
  return `${tidy(color)} / ${size}`.slice(0, 120);
}
