import type { ReactNode } from "react";
import { usePlatformPermissions } from "@/hooks/use-platform-permissions";
import type { PlatformPermission } from "@/lib/platform-permissions";

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PlatformPermission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePlatformPermissions();
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
