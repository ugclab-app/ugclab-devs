import { Link } from "react-router-dom";
import { useState } from "react";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function AccountForgotPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-zinc-500">
        <Link to={storeHref("/account/login", nav)} className="text-[var(--store-primary)]">
          ← Back to sign in
        </Link>
      </p>
      {sent ? (
        <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          If an account exists for that email, a reset link is on its way.
        </p>
      ) : (
        <form
          className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const email = String(new FormData(e.currentTarget).get("email"));
            try {
              await storeApi.accountForgot(tenant, email);
              setSent(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not send reset link");
            }
          }}
        >
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">Email</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <button type="submit" className="store-btn-primary w-full">
            Send reset link
          </button>
        </form>
      )}
    </div>
  );
}
