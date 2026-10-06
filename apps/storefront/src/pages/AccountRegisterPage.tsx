import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { readLocalWishlist, writeLocalWishlist } from "@/components/wishlist-button";

export function AccountRegisterPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const navigate = useNavigate();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Create account</h1>
      <p className="mt-2 text-sm text-zinc-500">
        <Link to={storeHref("/account/login", nav)} className="text-[var(--store-primary)]">
          Already have an account? Sign in
        </Link>
      </p>
      <form
        className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const fd = new FormData(e.currentTarget);
          try {
            await storeApi.accountRegister(tenant, {
              email: String(fd.get("email")),
              password: String(fd.get("password")),
              name: String(fd.get("name")),
            });
            const ids = readLocalWishlist();
            if (ids.length) {
              await storeApi.wishlistAdd(tenant, ids);
              writeLocalWishlist([]);
            }
            navigate(storeHref("/account", nav));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not register");
          } finally {
            setPending(false);
          }
        }}
      >
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Name</span>
          <input name="name" className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Email</span>
          <input name="email" type="email" required className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2"
          />
        </label>
        <button type="submit" className="store-btn-primary w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
