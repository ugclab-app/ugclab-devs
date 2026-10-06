import type { HomeBlock } from "@ugclab/tenant/store-theme";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function shiftHexColor(hex: string, delta: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = clamp(((n >> 16) & 0xff) + delta, 0, 255);
  const g = clamp(((n >> 8) & 0xff) + delta, 0, 255);
  const b = clamp((n & 0xff) + delta, 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const TITLE_SIZES = ["sm", "md", "lg", "xl"] as const;

function bumpTitleSize(current: string | undefined, dir: 1 | -1) {
  const idx = TITLE_SIZES.indexOf((current ?? "md") as (typeof TITLE_SIZES)[number]);
  const base = idx >= 0 ? idx : 1;
  return TITLE_SIZES[clamp(base + dir, 0, TITLE_SIZES.length - 1)];
}

const PADDING = ["none", "sm", "md", "lg", "xl"] as const;

function bumpPadding(current: string | undefined, dir: 1 | -1) {
  const idx = PADDING.indexOf((current ?? "md") as (typeof PADDING)[number]);
  const base = idx >= 0 ? idx : 2;
  return PADDING[clamp(base + dir, 0, PADDING.length - 1)];
}

/** Rule-based block edits from natural-language prompts (no LLM). */
export function applyAiBlockEdit(
  block: HomeBlock,
  promptRaw: string
): Partial<HomeBlock> {
  const prompt = promptRaw.toLowerCase();
  const patch: Partial<HomeBlock> = {};

  if (/hide\s+(the\s+)?title|no\s+title|remove\s+title/.test(prompt)) {
    patch.title = "";
  }
  if (/show\s+(the\s+)?title|add\s+title/.test(prompt) && !block.title) {
    patch.title = "Section title";
  }

  if (/\blarger\b|\bbigger\b|\bincrease\s+size\b/.test(prompt)) {
    patch.titleSize = bumpTitleSize(block.titleSize, 1);
    patch.paddingY = bumpPadding(block.paddingY, 1);
  }
  if (/\bsmaller\b|\bcompact\b|\bdecrease\s+size\b/.test(prompt)) {
    patch.titleSize = bumpTitleSize(block.titleSize, -1);
    patch.paddingY = bumpPadding(block.paddingY, -1);
  }

  if (/\bdarker\b/.test(prompt) && block.bgColor) {
    patch.bgColor = shiftHexColor(String(block.bgColor), -24);
  }
  if (/\blighter\b|\bbrighter\b/.test(prompt) && block.bgColor) {
    patch.bgColor = shiftHexColor(String(block.bgColor), 24);
  }
  if (/\bdarker\b.*\bprimary\b|\bprimary.*\bdarker\b/.test(prompt)) {
    patch.bgColor = shiftHexColor(String(block.bgColor ?? "#7c3aed"), -24);
  }
  if (/\blighter\b.*\bprimary\b|\bprimary.*\blighter\b/.test(prompt)) {
    patch.bgColor = shiftHexColor(String(block.bgColor ?? "#7c3aed"), 24);
  }

  if (/\bmore\s+padding\b|\bmore\s+space\b/.test(prompt)) {
    patch.paddingY = bumpPadding(block.paddingY, 1);
  }
  if (/\bless\s+padding\b|\btighter\b/.test(prompt)) {
    patch.paddingY = bumpPadding(block.paddingY, -1);
  }

  if (/\bcenter\b/.test(prompt)) {
    patch.align = "center";
  }
  if (/\bleft\b/.test(prompt)) {
    patch.align = "left";
  }

  if (Object.keys(patch).length === 0) {
    if (/\bdark\b/.test(prompt)) {
      patch.bgColor = "#18181b";
      patch.textColor = "#fafafa";
    } else if (/\blight\b/.test(prompt)) {
      patch.bgColor = "#fafafa";
      patch.textColor = "#18181b";
    }
  }

  return patch;
}
