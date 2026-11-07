/** sRGB channel 0–1 → linear for relative luminance (WCAG). */
function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function parseRgb(input: string): [number, number, number] | null {
  const c = input.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }
  const rgb = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) {
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  }
  return null;
}

/** Relative luminance 0–1 (WCAG). Higher = lighter. */
export function colorLuminance(input: string | undefined | null): number | null {
  if (!input?.trim()) return null;
  const rgb = parseRgb(input);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(linearize) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightColor(input: string | undefined | null): boolean {
  const L = colorLuminance(input);
  if (L == null) return false;
  return L > 0.65;
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(
  foreground: string,
  background: string
): number | null {
  const L1 = colorLuminance(foreground);
  const L2 = colorLuminance(background);
  if (L1 == null || L2 == null) return null;
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True if contrast meets WCAG AA (4.5 normal / 3 large). */
export function meetsWcagAa(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (ratio == null) return false;
  return ratio >= (largeText ? 3 : 4.5);
}

/**
 * Text color on a brand primary fill that passes AA for normal text.
 * Prefer white; fall back to near-black when primary is too light.
 */
export function onPrimaryTextColor(primary: string | undefined | null): string {
  const bg = primary?.trim() || "#7c3aed";
  if (meetsWcagAa("#ffffff", bg)) return "#ffffff";
  if (meetsWcagAa("#18181b", bg)) return "#18181b";
  return isLightColor(bg) ? "#18181b" : "#ffffff";
}
