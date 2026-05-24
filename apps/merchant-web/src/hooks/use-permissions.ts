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
    role: data?.role ?? null,
    permissions: data?.permissions ?? [],
    totpEnabled: data?.totpEnabled ?? false,
    needs2faForOrders: data?.needs2faForOrders ?? false,
    needs2faForPayouts: data?.needs2faForPayouts ?? false,
    can,
  };
}
