import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function usePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ["access"],
    queryFn: () => api.access(),
    staleTime: 60_000,
  });

  function can(perm: string) {
    if (!data) return true;
    return data.permissions.includes(perm);
  }

  return {
    loading: isLoading,
    isOwner: data?.isOwner ?? false,
    permissions: data?.permissions ?? [],
    can,
  };
}
