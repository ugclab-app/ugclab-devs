import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function AccountResetPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <p className="mt-2 text-sm">
        <Link to={storeHref("/account/login", nav)} className="text-[var(--store-primary)]">
          ← Sign in
        </Link>
      </p>
      <form
        className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const password = String(new FormData(e.currentTarget).get("password"));
          try {
            await storeApi.accountReset(tenant, token, password);
            navigate(storeHref("/account", nav));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reset password");
          } finally {
            setPending(false);
          }
        }}
      >
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!token ? (
          <p className="text-sm text-amber-800">This reset link is missing a token.</p>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">New password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2"
          />
        </label>
        <button type="submit" className="store-btn-primary w-full" disabled={pending || !token}>
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
