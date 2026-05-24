import { UserRole } from "@ugclab/database";

export const PLATFORM_STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.PLATFORM_OPS,
  UserRole.PLATFORM_SUPPORT,
  UserRole.PLATFORM_FINANCE,
];

export function isPlatformStaff(role: string): boolean {
  return PLATFORM_STAFF_ROLES.includes(role as UserRole);
}

export type PlatformPermission =
  | "dashboard:read"
  | "inbox:read"
  | "search:read"
  | "tenants:read"
  | "tenants:write"
  | "tenants:bulk"
  | "orders:read"
  | "payouts:read"
  | "payouts:write"
  | "revenue:read"
  | "disputes:read"
  | "users:read"
  | "users:write"
  | "users:impersonate"
  | "users:gdpr"
  | "plans:write"
  | "settings:write"
  | "moderation:write"
  | "integrations:read"
  | "audit:read"
  | "blacklist:write"
  | "announcements:write"
  | "staff:invite";

const ROLE_PERMISSIONS: Record<UserRole, PlatformPermission[] | "*"> = {
  [UserRole.SUPER_ADMIN]: "*",
  [UserRole.PLATFORM_OPS]: [
    "dashboard:read",
    "inbox:read",
    "search:read",
    "tenants:read",
    "tenants:write",
    "tenants:bulk",
    "orders:read",
    "payouts:read",
    "payouts:write",
    "revenue:read",
    "disputes:read",
    "users:read",
    "moderation:write",
    "integrations:read",
    "audit:read",
    "blacklist:write",
    "announcements:write",
  ],
  [UserRole.PLATFORM_SUPPORT]: [
    "dashboard:read",
    "inbox:read",
    "search:read",
    "tenants:read",
    "orders:read",
    "users:read",
    "users:write",
    "users:impersonate",
    "moderation:write",
    "audit:read",
  ],
  [UserRole.PLATFORM_FINANCE]: [
    "dashboard:read",
    "inbox:read",
    "search:read",
    "tenants:read",
    "orders:read",
    "payouts:read",
    "revenue:read",
    "disputes:read",
    "audit:read",
  ],
  [UserRole.MERCHANT]: [],
};

export function hasPlatformPermission(
  role: string,
  permission: PlatformPermission
): boolean {
  const perms = ROLE_PERMISSIONS[role as UserRole];
  if (!perms) return false;
  if (perms === "*") return true;
  return perms.includes(permission);
}
