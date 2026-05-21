export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PAID"
  | "FULFILLED"
  | "CANCELLED"
  | "REFUNDED";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ProductType = "PHYSICAL" | "DIGITAL" | "SERVICE";

export const ProductType = {
  PHYSICAL: "PHYSICAL",
  DIGITAL: "DIGITAL",
  SERVICE: "SERVICE",
} as const satisfies Record<string, ProductType>;

export const ProductStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<string, ProductStatus>;
