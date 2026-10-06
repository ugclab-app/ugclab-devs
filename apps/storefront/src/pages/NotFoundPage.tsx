import { Link } from "react-router-dom";
import { useOptionalStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { StoreBlockRenderer } from "@/components/store-block-renderer";

export function NotFoundPage() {
  const ctx = useOptionalStore();
  const { tenant, locale } = useStoreParams();
  const nav = { tenant, locale };
  const home = storeHref("/", nav);
  const blocks = ctx?.theme.notFoundBlocks ?? [];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-[var(--store-primary,#7c3aed)]">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        to={home}
        className="mt-8 rounded-xl bg-[var(--store-primary,#7c3aed)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Back to store
      </Link>
      {ctx && blocks.length > 0 ? (
        <div className="mt-12 w-full text-left">
          <StoreBlockRenderer blocks={blocks} theme={ctx.theme} pageContext="page" />
        </div>
      ) : null}
    </div>
  );
}
