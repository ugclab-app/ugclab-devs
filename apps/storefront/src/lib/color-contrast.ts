/** Relative luminance 0–1; higher = lighter. */
export function colorLuminance(input: string | undefined | null): number | null {
  if (!input?.trim()) return null;
  const c = input.trim();

  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const rgb = c.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i
  );
  if (rgb) {
    const r = Number(rgb[1]) / 255;
    const g = Number(rgb[2]) / 255;
    const b = Number(rgb[3]) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  return null;
}

export function isLightColor(input: string | undefined | null): boolean {
  const L = colorLuminance(input);
  if (L == null) return false;
  return L > 0.65;
}
