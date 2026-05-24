import type { HomeBlock } from "./store-theme.js";

export type TitleSize = "sm" | "md" | "lg" | "xl";

export type BlockStyleProps = Record<string, string | number>;

export function blockVisibilityClass(block: HomeBlock): string {
  const parts: string[] = [];
  if (block.hiddenOnMobile) parts.push("store-block-hide-mobile");
  if (block.hiddenOnDesktop) parts.push("store-block-hide-desktop");
  return parts.join(" ");
}

export function blockSectionStyle(block: HomeBlock): BlockStyleProps {
  const style: BlockStyleProps = {};
  if (block.bgGradient?.trim()) {
    style.background = block.bgGradient.trim();
  } else if (block.bgColor) {
    style.backgroundColor = block.bgColor;
  }
  if (block.textColor) style.color = block.textColor;
  if (block.borderRadius != null && block.borderRadius >= 0) {
    style.borderRadius = `${block.borderRadius}px`;
    style.overflow = "hidden";
  }
  if (block.marginX != null && block.marginX > 0) {
    style.marginLeft = `${block.marginX}px`;
    style.marginRight = `${block.marginX}px`;
  }
  return style;
}

export function titleSizeClass(size?: TitleSize): string {
  switch (size) {
    case "sm":
      return "text-xl font-bold tracking-tight";
    case "lg":
      return "text-4xl font-bold tracking-tight";
    case "xl":
      return "text-5xl font-bold tracking-tight";
    case "md":
    default:
      return "text-2xl font-bold tracking-tight";
  }
}

export function blockOuterClass(block: HomeBlock): string {
  const width = block.contentWidth === "full" ? "w-full" : "";
  return [blockVisibilityClass(block), width].filter(Boolean).join(" ");
}
