import { useAuth } from "@/context/auth";
import {
  hasPlatformPermission,
  type PlatformPermission,
} from "@/lib/platform-permissions";

export function usePlatformPermissions() {
  const { user } = useAuth();
  const role = user?.role ?? "";

  function can(permission: PlatformPermission): boolean {
    if (!role) return false;
    return hasPlatformPermission(role, permission);
  }

  return { role, can, user };
}
