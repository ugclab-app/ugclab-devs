import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";

function merchantAdminBase(): string {
  const fromEnv = (
    import.meta.env.VITE_MERCHANT_WEB_URL ??
    import.meta.env.VITE_MERCHANT_ADMIN_URL ??
    ""
  )
    .toString()
    .trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "http://localhost:3001";
  }
  return "";
}

function productSlugFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/products\/([^/]+)\/?$/);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * Shown on storefront when ?preview=1 — jump into merchant editors
 * (product content vs product page template).
 */
export function MerchantPreviewBar() {
  const { search, tenant, locale } = useStoreParams();
  const location = useLocation();
  const ctx = useStore();
  const preview = search.get("preview") === "1";
  const admin = useMemo(() => merchantAdminBase(), []);
  const productSlug = productSlugFromPath(location.pathname);

  const { data: productData } = useQuery({
    queryKey: ["product", tenant, productSlug, locale, "preview-bar"],
    queryFn: () => storeApi.product(tenant, productSlug!, locale),
    enabled: preview && Boolean(productSlug),
    staleTime: 60_000,
  });

  const productId = (productData?.product as { id?: string } | undefined)?.id;

  if (!preview || !admin) return null;

  const isProduct = Boolean(productSlug);
  const editProductHref = productId
    ? `${admin}/products/${productId}/edit`
    : `${admin}/products`;
  const customizeHref = isProduct
    ? `${admin}/storefront?tab=product${
        productSlug ? `&previewProduct=${encodeURIComponent(productSlug)}` : ""
      }`
    : `${admin}/storefront`;

  return (
    <div className="sticky top-0 z-[100] border-b border-violet-800 bg-violet-700 text-white shadow-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="font-medium">
          Preview · {ctx.tenant.name}
          {isProduct ? " · Product page" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {isProduct ? (
            <>
              <a
                href={editProductHref}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50"
              >
                Edit product content
              </a>
              <a
                href={customizeHref}
                className="rounded-md border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                Customize page in editor
              </a>
            </>
          ) : (
            <a
              href={customizeHref}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50"
            >
              Open site editor
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
