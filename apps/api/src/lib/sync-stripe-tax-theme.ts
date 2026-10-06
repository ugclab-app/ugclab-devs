import { parseStoreTheme, type StoreTheme } from "@ugclab/tenant/store-theme";

/** Merge stripeTaxEnabled into theme / themeDraft JSON blobs. */
export function withStripeTaxOnTheme(
  themeJson: unknown,
  stripeTaxEnabled: boolean
): StoreTheme {
  const t = parseStoreTheme(themeJson);
  return { ...t, stripeTaxEnabled };
}
