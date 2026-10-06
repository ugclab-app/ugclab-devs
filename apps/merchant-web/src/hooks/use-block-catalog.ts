import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useBlockCatalog(enabled = true) {
  return useQuery({
    queryKey: ["block-catalog"],
    queryFn: () => api.blockCatalog() as Promise<{ blockIds: string[] }>,
    staleTime: 60_000,
    enabled,
  });
}

export function filterPublishedBlocks<T extends { type: string }>(
  items: T[],
  blockIds: string[] | undefined
): T[] {
  if (!blockIds?.length) return items;
  const allowed = new Set(blockIds);
  return items.filter((i) => allowed.has(i.type));
}
