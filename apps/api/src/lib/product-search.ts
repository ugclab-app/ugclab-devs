import type { Prisma } from "@ugclab/database";

export function buildProductSearchWhere(q: string): Prisma.ProductWhereInput {
  const trimmed = q.trim();
  if (!trimmed) return {};

  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  const termClause = (term: string): Prisma.ProductWhereInput => ({
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
      { tags: { has: term } },
      { tags: { hasSome: term.split("-") } },
      { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
      { variants: { some: { title: { contains: term, mode: "insensitive" } } } },
    ],
  });

  if (terms.length === 1) return termClause(terms[0]!);

  return { AND: terms.map(termClause) };
}
