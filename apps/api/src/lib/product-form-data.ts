import { prisma } from "@ugclab/database";

export function parseCollectionIds(
  body: Record<string, unknown>
): string[] | undefined {
  if (body.collectionIds === undefined) return undefined;
  const raw = body.collectionIds;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  const s = String(raw ?? "").trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

export async function syncProductCollections(
  productId: string,
  collectionIds: string[]
) {
  await prisma.collectionProduct.deleteMany({ where: { productId } });
  if (collectionIds.length) {
    await prisma.collectionProduct.createMany({
      data: collectionIds.map((collectionId) => ({ collectionId, productId })),
      skipDuplicates: true,
    });
  }
}

export function mergeTranslationsWithSeo(
  body: Record<string, unknown>,
  existing?: unknown
): Record<string, unknown> | null | undefined {
  const seoTitle = String(body.seoTitle ?? "").trim();
  const seoDescription = String(body.seoDescription ?? "").trim();
  let translations: Record<string, unknown> = {};

  if (existing && typeof existing === "object") {
    translations = { ...(existing as Record<string, unknown>) };
  }

  if (body.translations !== undefined && body.translations !== "") {
    const incoming =
      typeof body.translations === "string"
        ? (JSON.parse(String(body.translations) || "{}") as Record<string, unknown>)
        : (body.translations as Record<string, unknown>);
    const incomingSeo = incoming._seo;
    delete incoming._seo;
    translations = { ...translations, ...incoming };
    if (incomingSeo) translations._seo = incomingSeo;
  }

  if (body.seoTitle !== undefined || body.seoDescription !== undefined) {
    const prev = (translations._seo as Record<string, string> | undefined) ?? {};
    translations._seo = {
      ...prev,
      ...(body.seoTitle !== undefined
        ? { title: seoTitle || undefined }
        : {}),
      ...(body.seoDescription !== undefined
        ? { description: seoDescription || undefined }
        : {}),
    };
    if (
      translations._seo &&
      !translations._seo.title &&
      !translations._seo.description
    ) {
      delete translations._seo;
    }
  }

  if (
    body.translations === undefined &&
    body.seoTitle === undefined &&
    body.seoDescription === undefined
  ) {
    return undefined;
  }

  return Object.keys(translations).length ? translations : null;
}

export function extractSeoFromTranslations(
  translations: unknown
): { seoTitle: string; seoDescription: string } {
  if (!translations || typeof translations !== "object") {
    return { seoTitle: "", seoDescription: "" };
  }
  const seo = (translations as Record<string, unknown>)._seo as
    | { title?: string; description?: string }
    | undefined;
  return {
    seoTitle: String(seo?.title ?? ""),
    seoDescription: String(seo?.description ?? ""),
  };
}

export function stripSeoFromTranslations(
  translations: unknown
): Record<string, unknown> {
  if (!translations || typeof translations !== "object") return {};
  const copy = { ...(translations as Record<string, unknown>) };
  delete copy._seo;
  return copy;
}
