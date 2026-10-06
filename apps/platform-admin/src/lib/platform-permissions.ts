export const PLATFORM_STAFF_ROLES = [
  "SUPER_ADMIN",
  "PLATFORM_OPS",
  "PLATFORM_SUPPORT",
  "PLATFORM_FINANCE",
] as const;

export type PlatformStaffRole = (typeof PLATFORM_STAFF_ROLES)[number];

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
  | "staff:invite"
  | "outreach:send";

const ROLE_PERMISSIONS: Record<string, PlatformPermission[] | "*"> = {
  SUPER_ADMIN: "*",
  PLATFORM_OPS: [
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
    "staff:invite",
  ],
  PLATFORM_SUPPORT: [
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
  PLATFORM_FINANCE: [
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
};

export function isPlatformStaff(role: string): boolean {
  return PLATFORM_STAFF_ROLES.includes(role as PlatformStaffRole);
}

export function hasPlatformPermission(
  role: string,
  permission: PlatformPermission
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms === "*") return true;
  return perms.includes(permission);
}

export function roleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super admin";
    case "PLATFORM_OPS":
      return "Operations";
    case "PLATFORM_SUPPORT":
      return "Support";
    case "PLATFORM_FINANCE":
      return "Finance";
    case "MERCHANT":
      return "Merchant";
    default:
      return role;
  }
}
