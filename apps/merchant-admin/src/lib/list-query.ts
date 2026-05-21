import type { Prisma } from "@ugclab/database";

export type ProductSort =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "price-asc"
  | "price-desc";

export type OrderSort =
  | "newest"
  | "oldest"
  | "total-asc"
  | "total-desc"
  | "number-asc"
  | "number-desc";

export function productOrderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "title-asc":
      return { title: "asc" };
    case "title-desc":
      return { title: "desc" };
    case "price-asc":
      return { priceAmount: "asc" };
    case "price-desc":
      return { priceAmount: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export function orderOrderBy(sort: OrderSort): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "total-asc":
      return { totalAmount: "asc" };
    case "total-desc":
      return { totalAmount: "desc" };
    case "number-asc":
      return { orderNumber: "asc" };
    case "number-desc":
      return { orderNumber: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export function parseProductSort(raw?: string): ProductSort {
  const allowed: ProductSort[] = [
    "newest",
    "oldest",
    "title-asc",
    "title-desc",
    "price-asc",
    "price-desc",
  ];
  return allowed.includes(raw as ProductSort) ? (raw as ProductSort) : "newest";
}

export function parseOrderSort(raw?: string): OrderSort {
  const allowed: OrderSort[] = [
    "newest",
    "oldest",
    "total-asc",
    "total-desc",
    "number-asc",
    "number-desc",
  ];
  return allowed.includes(raw as OrderSort) ? (raw as OrderSort) : "newest";
}
