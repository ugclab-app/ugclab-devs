import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { catalogByCategory } from "./block-catalog";

export type BuilderTemplateId =
  | "home"
  | "global"
  | "product"
  | "cart"
  | "notFound"
  | "collection";

export type BuilderSelection =
  | { kind: "block"; id: string }
  | { kind: "product"; id: string; blockId?: string }
  | { kind: "announcement" }
  | { kind: "header" }
  | { kind: "footer" }
  | { kind: "theme" }
  | { kind: "apps" };

export const BUILDER_TEMPLATE_OPTIONS: {
  id: BuilderTemplateId;
  label: string;
}[] = [
  { id: "home", label: "Home page" },
  { id: "global", label: "Global sections" },
  { id: "product", label: "Product page" },
  { id: "cart", label: "Cart page" },
  { id: "notFound", label: "404 page" },
  { id: "collection", label: "Collection default" },
];

export function blockTypeLabel(type: string): string {
  return (
    catalogByCategory()
      .flatMap((g) => g.items)
      .find((i) => i.type === type)?.label ?? type
  );
}

export function selectionEquals(a: BuilderSelection | null, b: BuilderSelection | null) {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === "block" && b.kind === "block") return a.id === b.id;
  if (a.kind === "product" && b.kind === "product") {
    return a.id === b.id;
  }
  return true;
}

export function findBlockLabel(blocks: HomeBlock[], id: string) {
  const block = blocks.find((b) => b.id === id);
  return block ? blockTypeLabel(block.type) : "Block";
}
