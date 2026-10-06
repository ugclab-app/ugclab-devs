import type { HomeBlock } from "./store-theme.js";

export type BlockPageContext = "home" | "product" | "page" | "collection" | "global";

/** Whether a CMS block should render on the current page. */
export function isBlockVisibleOnPage(
  block: HomeBlock,
  page: BlockPageContext,
): boolean {
  if (page === "global") return true;
  const scope = block.visibilityScope ?? "all";
  if (scope === "all") return true;
  if (scope === "home") return page === "home";
  if (scope === "product") return page === "product";
  if (scope === "pages") return page === "page";
  return true;
}

export function filterBlocksForPage(
  blocks: HomeBlock[],
  page: BlockPageContext,
): HomeBlock[] {
  return blocks.filter((b) => isBlockVisibleOnPage(b, page));
}
