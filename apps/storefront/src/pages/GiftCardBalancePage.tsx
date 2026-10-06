import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function GiftCardBalancePage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    code: string;
    balanceCents: number;
    currency: string;
    expiresAt: string | null;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function check(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const data = await storeApi.giftCardBalance(tenant, code.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Gift card balance</h1>
      <p className="mt-2 text-sm text-zinc-500">
        <Link to={storeHref("/account", nav)} className="text-[var(--store-primary)]">
          ← Back to account
        </Link>
      </p>
      <form
        onSubmit={(e) => void check(e)}
        className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-medium">
          Gift card code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono uppercase"
            placeholder="XXXX-XXXX-XXXX"
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
            <p className="font-mono font-semibold">{result.code}</p>
            <p className="mt-1 text-lg font-bold">
              {formatMoney(result.balanceCents, result.currency)}
            </p>
            {result.expiresAt ? (
              <p className="mt-1 text-xs text-zinc-500">
                Expires {new Date(result.expiresAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="store-btn-primary w-full"
        >
          {pending ? "Checking…" : "Check balance"}
        </button>
      </form>
    </div>
  );
}
