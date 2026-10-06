const COLOR_HEX: Record<string, string> = {
  black: "#18181b",
  white: "#f4f4f5",
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#eab308",
  pink: "#ec4899",
  purple: "#7c3aed",
  gray: "#71717a",
  grey: "#71717a",
  brown: "#92400e",
  orange: "#ea580c",
  navy: "#1e3a8a",
  beige: "#d6c6a5",
  gold: "#ca8a04",
  silver: "#a1a1aa",
};

const SIZE_RE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|\d{1,3}|one size)$/i;

export type VariantOption = {
  id: string;
  title: string;
  priceAmount: number;
  inventory: number | null;
  parts: string[];
};

export function colorHex(value: string): string | null {
  return COLOR_HEX[value.trim().toLowerCase()] ?? null;
}

export function splitVariantTitle(title: string): string[] {
  const parts = title
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [title.trim()];
}

export function buildVariantGroups(variants: VariantOption[]) {
  if (variants.length === 0) return [];
  const width = variants[0]!.parts.length;
  if (width < 1 || variants.some((v) => v.parts.length !== width)) return [];
  return Array.from({ length: width }, (_, index) => {
    const values = [...new Set(variants.map((v) => v.parts[index]!).filter(Boolean))];
    const label = values.some((v) => colorHex(v))
      ? "Color"
      : values.every((v) => SIZE_RE.test(v))
        ? "Size"
        : width === 1
          ? "Option"
          : `Option ${index + 1}`;
    return { label, values };
  });
}

export function matchVariant(
  variants: VariantOption[],
  selected: string[]
): VariantOption | undefined {
  return variants.find((v) => v.parts.every((part, i) => part === selected[i]));
}
