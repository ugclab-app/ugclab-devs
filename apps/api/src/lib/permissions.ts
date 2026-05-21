import { TenantMemberRole, prisma } from "@ugclab/database";
import type { SessionPayload } from "./auth-token.js";

export const MERCHANT_PERMISSIONS = [
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
] as const;

export type MerchantPermission = (typeof MERCHANT_PERMISSIONS)[number];

const DEFAULT_STAFF: MerchantPermission[] = [
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
  "/abandoned-carts": "abandoned-carts",
  "/activity-log": "activity-log",
  "/marketing": "marketing",
};

export async function getMerchantAccess(session: SessionPayload, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { ownerId: true },
  });
  if (!tenant) return { isOwner: false, permissions: [] as MerchantPermission[] };

  if (tenant.ownerId === session.sub) {
    return { isOwner: true, permissions: [...MERCHANT_PERMISSIONS] };
  }

  const member = await prisma.tenantMember.findFirst({
    where: { tenantId, userId: session.sub, acceptedAt: { not: null } },
  });
  if (!member) return { isOwner: false, permissions: [] as MerchantPermission[] };

  if (member.role === TenantMemberRole.ADMIN) {
    return { isOwner: false, permissions: [...MERCHANT_PERMISSIONS] };
  }

  const custom = member.permissions.filter((p): p is MerchantPermission =>
    (MERCHANT_PERMISSIONS as readonly string[]).includes(p)
  );
  return {
    isOwner: false,
    permissions: custom.length > 0 ? custom : DEFAULT_STAFF,
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
