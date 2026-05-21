import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";

export function PermissionGate({
  perm,
  children,
}: {
  perm: string;
  children: React.ReactNode;
}) {
  const { loading, can } = usePermissions();
  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (!can(perm)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
