import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useAdminT } from "@/hooks/use-admin-t";

const platformAdminUrl =
  import.meta.env.VITE_PLATFORM_ADMIN_URL ?? "http://localhost:3003";

export default function NoStorePage() {
  const { ta, t } = useAdminT();
  const { user, clear, setSession } = useAuth();
  const navigate = useNavigate();
  const isFounder = user?.role === "SUPER_ADMIN";
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = storeName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createStore(name);
      setSession(res.user, res.tenant);
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create store");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold text-zinc-900">{ta("noStore.title")}</h1>
      <p className="mt-3 text-sm text-zinc-600">{ta("noStore.description")}</p>
      <Link to="/partner" className="mt-3 text-sm font-medium text-violet-700">
        Partner program
      </Link>
      {isFounder ? (
        <p className="mt-3 text-sm text-zinc-600">
          You are signed in as a <strong>platform admin</strong> ({user?.email}).
          Founder accounts manage tenants in Platform Admin, not the merchant dashboard.
        </p>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          This login ({user?.email}) is not linked to a store yet. Create one below.
        </p>
      )}

      {!isFounder ? (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="mt-8 w-full max-w-sm space-y-3 text-left"
        >
          <label className="block text-sm font-medium text-zinc-700">
            Store name
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              disabled={busy}
              placeholder="My store"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !storeName.trim()}
            className="ugclab-btn ugclab-btn-primary w-full px-5 py-2.5 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create store"}
          </button>
        </form>
      ) : (
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={platformAdminUrl}
            className="ugclab-btn ugclab-btn-primary px-5 py-2.5 text-center"
          >
            Open Platform Admin
          </a>
        </div>
      )}

      <div className="mt-4">
        <Link
          to="/login"
          onClick={async () => {
            await api.logout();
            clear();
          }}
          className="ugclab-btn border border-zinc-200 bg-white px-5 py-2.5 text-center text-sm"
        >
          {t.signOut}
        </Link>
      </div>
    </div>
  );
}
