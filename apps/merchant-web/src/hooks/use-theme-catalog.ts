import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { StoreThemePreset } from "@/components/site-builder/store-themes";

export type ThemeCatalogEntry = {
  id: string;
  label: string;
  featured: boolean;
  sortOrder: number;
  category: string;
  description: string;
  priceCents?: number;
  owned?: boolean;
  preview: { primary: string; secondary: string; background: string };
};

export function useThemeCatalog(enabled = true) {
  return useQuery({
    queryKey: ["theme-catalog"],
    queryFn: () =>
      api.themeCatalog() as Promise<{ themes: ThemeCatalogEntry[] }>,
    staleTime: 60_000,
    enabled,
  });
}

/** Filter presets to platform-published catalog and apply sort/featured/labels. */
export function applyThemeCatalog(
  presets: StoreThemePreset[],
  catalog: ThemeCatalogEntry[] | undefined
): StoreThemePreset[] {
  if (!catalog?.length) return presets;
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return presets
    .filter((p) => byId.has(p.id))
    .map((p) => {
      const c = byId.get(p.id)!;
      return {
        ...p,
        label: c.label || p.label,
        description: c.description || p.description,
        featured: c.featured,
        category: (c.category as StoreThemePreset["category"]) || p.category,
      };
    })
    .sort((a, b) => (byId.get(a.id)?.sortOrder ?? 0) - (byId.get(b.id)?.sortOrder ?? 0));
}

export function featuredFromCatalog(
  presets: StoreThemePreset[],
  catalog: ThemeCatalogEntry[] | undefined
): StoreThemePreset[] {
  const applied = applyThemeCatalog(presets, catalog);
  return applied.filter((t) => t.featured);
}
