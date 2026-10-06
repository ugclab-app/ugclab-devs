import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type StoreListItem } from "@/api/client";
import { useAuth } from "@/context/auth";

export function StoreSwitcher() {
  const { tenant, setSession } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["auth-stores"],
    queryFn: () => api.stores(),
    staleTime: 30_000,
  });

  const stores = data?.stores ?? [];
  const activeId = data?.activeTenantId ?? tenant?.id ?? null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setError(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setCreating(false);
        setError(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function switchTo(store: StoreListItem) {
    if (store.id === activeId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.switchStore(store.id);
      setSession(res.user, res.tenant);
      await queryClient.invalidateQueries();
      setOpen(false);
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch store");
    } finally {
      setBusy(false);
    }
  }

  async function createStore(e: React.FormEvent) {
    e.preventDefault();
    const name = storeName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createStore(name);
      setSession(res.user, res.tenant);
      await queryClient.invalidateQueries();
      setOpen(false);
      setCreating(false);
      setStoreName("");
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create store");
    } finally {
      setBusy(false);
    }
  }

  if (!tenant) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl p-1 text-left transition hover:bg-zinc-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
          {tenant.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-900">{tenant.name}</p>
          <p className="truncate text-xs text-zinc-500">
            {tenant.displayHost}
          </p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-900/10">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {stores.map((s) => {
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void switchTo(s)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                    active ? "bg-violet-50" : "hover:bg-zinc-50"
                  } disabled:opacity-60`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      active
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {s.name}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {s.displayHost}
                    </span>
                  </span>
                  {active ? (
                    <svg
                      className="h-4 w-4 shrink-0 text-violet-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="border-t border-zinc-100 p-1.5">
            {creating ? (
              <form onSubmit={(e) => void createStore(e)} className="space-y-2 p-1.5">
                <label className="block text-xs font-medium text-zinc-600">
                  Store name
                  <input
                    autoFocus
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={busy}
                    placeholder="My new store"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                {error ? (
                  <p className="text-xs text-red-600">{error}</p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy || !storeName.trim()}
                    className="flex-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {busy ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setCreating(false);
                      setError(null);
                      setStoreName("");
                    }}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {error ? (
                  <p className="px-2.5 pb-1 text-xs text-red-600">{error}</p>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setCreating(true);
                    setError(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-lg leading-none text-zinc-500">
                    +
                  </span>
                  Create store
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
