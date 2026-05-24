import { TenantMemberRole, prisma } from "@ugclab/database";
import type { SessionPayload } from "./auth-token.js";

/** Sections staff/admins may be granted (never payments, payouts, domain, billing). */
export const STAFF_ASSIGNABLE_PERMISSIONS = [
  "dashboard",
  "analytics",
  "products",
  "collections",
  "orders",
  "customers",
  "shipping",
  "discounts",
  "promotions",
  "pages",
  "reviews",
  "draft-orders",
  "reports",
  "storefront",
  "settings",
  "staff",
  "abandoned-carts",
  "activity-log",
  "marketing",
  "growth",
] as const;

/** Owner-only: finances and infrastructure. */
export const OWNER_ONLY_PERMISSIONS = [
  "payments",
  "payouts",
  "domain",
  "billing",
] as const;

export const MERCHANT_PERMISSIONS = [
  ...STAFF_ASSIGNABLE_PERMISSIONS,
  ...OWNER_ONLY_PERMISSIONS,
] as const;

export type MerchantPermission = (typeof MERCHANT_PERMISSIONS)[number];
export type StaffAssignablePermission =
  (typeof STAFF_ASSIGNABLE_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<MerchantPermission, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  products: "Products",
  collections: "Collections",
  orders: "Orders",
  customers: "Customers",
  shipping: "Shipping",
  discounts: "Discounts",
  promotions: "Promotions",
  pages: "Pages & blog",
  reviews: "Reviews",
  "draft-orders": "Draft orders",
  reports: "Reports",
  storefront: "Storefront",
  settings: "Settings (general)",
  staff: "Team",
  "abandoned-carts": "Abandoned carts",
  "activity-log": "Activity log",
  marketing: "Email marketing",
  growth: "Growth & integrations",
  payments: "Payments",
  payouts: "Payouts",
  domain: "Domain & DNS",
  billing: "Subscription",
};

export const ROLE_PRESETS: Record<
  string,
  { label: string; permissions: StaffAssignablePermission[] }
> = {
  support: {
    label: "Support",
    permissions: ["dashboard", "orders", "customers", "draft-orders"],
  },
  marketing: {
    label: "Marketing",
    permissions: [
      "dashboard",
      "marketing",
      "abandoned-carts",
      "pages",
      "analytics",
      "growth",
    ],
  },
  fulfillment: {
    label: "Fulfillment",
    permissions: [
      "dashboard",
      "orders",
      "shipping",
      "products",
      "draft-orders",
    ],
  },
};

const DEFAULT_STAFF: StaffAssignablePermission[] = [
  "dashboard",
  "analytics",
  "products",
  "collections",
  "orders",
  "customers",
  "shipping",
  "pages",
  "reviews",
  "draft-orders",
  "reports",
];

const ROUTE_PERMISSION: Record<string, MerchantPermission> = {
  "/dashboard": "dashboard",
  "/analytics": "analytics",
  "/products": "products",
  "/collections": "collections",
  "/orders": "orders",
  "/customers": "customers",
  "/shipping": "shipping",
  "/discounts": "discounts",
  "/promotions": "promotions",
  "/pages": "pages",
  "/reviews": "reviews",
  "/draft-orders": "draft-orders",
  "/reports": "reports",
  "/storefront": "storefront",
  "/settings": "settings",
  "/payments": "payments",
  "/abandoned-carts": "abandoned-carts",
  "/activity-log": "activity-log",
  "/marketing": "marketing",
  "/growth": "growth",
  "/inventory": "products",
};

export function sanitizeStaffPermissions(raw: string[]): StaffAssignablePermission[] {
  return raw.filter((p): p is StaffAssignablePermission =>
    (STAFF_ASSIGNABLE_PERMISSIONS as readonly string[]).includes(p)
  );
}

export async function getMerchantAccess(session: SessionPayload, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ownerId: true },
  });
  if (!tenant) {
    return {
      isOwner: false,
      permissions: [] as MerchantPermission[],
      role: null as string | null,
    };
  }

  if (tenant.ownerId === session.sub) {
    return {
      isOwner: true,
      permissions: [...MERCHANT_PERMISSIONS],
      role: "OWNER" as const,
    };
  }

  const member = await prisma.tenantMember.findFirst({
    where: { tenantId, userId: session.sub, acceptedAt: { not: null } },
  });
  if (!member) {
    return {
      isOwner: false,
      permissions: [] as MerchantPermission[],
      role: null,
    };
  }

  if (member.role === TenantMemberRole.ADMIN) {
    return {
      isOwner: false,
      permissions: [...STAFF_ASSIGNABLE_PERMISSIONS],
      role: "ADMIN" as const,
    };
  }

  const custom = sanitizeStaffPermissions(member.permissions);
  return {
    isOwner: false,
    permissions: (custom.length > 0 ? custom : DEFAULT_STAFF) as MerchantPermission[],
    role: "STAFF" as const,
  };
}

export function hasPermission(
  permissions: MerchantPermission[],
  required: MerchantPermission
) {
  return permissions.includes(required);
}

export function permissionForPath(path: string): MerchantPermission | null {
  const base = "/" + path.split("/").filter(Boolean)[0];
  return ROUTE_PERMISSION[base] ?? null;
}

export async function requireOwnerAccess(
  session: SessionPayload,
  tenantId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const access = await getMerchantAccess(session, tenantId);
  if (!access.isOwner) {
    return { ok: false, error: "Store owner only", status: 403 };
  }
  return { ok: true };
}

/** Orders and payouts require TOTP for all users (including owner). */
export async function requireSensitive2fa(
  session: SessionPayload,
  area: "orders" | "payouts"
): Promise<{ ok: true } | { ok: false; error: string; status: number; code?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { totpEnabled: true },
  });
  if (!user?.totpEnabled) {
    return {
      ok: false,
      error:
        area === "payouts"
          ? "Enable two-factor authentication in Settings → Team & security before accessing payouts."
          : "Enable two-factor authentication in Settings → Team & security before accessing orders.",
      status: 403,
      code: "2FA_REQUIRED",
    };
  }
  return { ok: true };
}

export async function guardOrdersAccess(
  session: SessionPayload,
  tenantId: string
): Promise<{ ok: true; access: Awaited<ReturnType<typeof getMerchantAccess>> } | { ok: false; error: string; status: number; code?: string }> {
  const access = await getMerchantAccess(session, tenantId);
  if (!hasPermission(access.permissions, "orders")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const tfa = await requireSensitive2fa(session, "orders");
  if (!tfa.ok) return tfa;
  return { ok: true, access };
}

export async function guardPayoutsAccess(
  session: SessionPayload,
  tenantId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number; code?: string }> {
  const owner = await requireOwnerAccess(session, tenantId);
  if (!owner.ok) return owner;
  return requireSensitive2fa(session, "payouts");
}
