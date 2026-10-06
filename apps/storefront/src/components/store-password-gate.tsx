import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";

export function StorePasswordGate({ children }: { children: ReactNode }) {
  const { passwordLocked, tenant } = useStore();
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!passwordLocked) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await storeApi.unlockStore(tenant.slug, password);
      await qc.invalidateQueries({ queryKey: ["store-context"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong password");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
        Private store
      </p>
      <h1 className="mt-3 text-2xl font-bold text-zinc-900">{tenant.name}</h1>
      <p className="mt-3 text-sm text-zinc-600">Enter the store password to continue.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3 text-left">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Password"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="store-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
