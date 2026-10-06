import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useSectionCatalog(enabled = true) {
  return useQuery({
    queryKey: ["section-catalog"],
    queryFn: () => api.sectionCatalog(),
    enabled,
    staleTime: 60_000,
  });
}

export function filterPublishedSections<T extends { id: string }>(
  items: T[],
  allowedIds: string[] | undefined,
): T[] {
  if (!allowedIds?.length) return items;
  const set = new Set(allowedIds);
  return items.filter((item) => set.has(item.id));
}
