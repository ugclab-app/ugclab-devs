import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ROUTES: { path: string; label: string; keys: string }[] = [
  { path: "/dashboard", label: "Dashboard", keys: "home" },
  { path: "/products", label: "Products", keys: "catalog items" },
  { path: "/products/new", label: "Add product", keys: "new create" },
  { path: "/orders", label: "Orders", keys: "sales" },
  { path: "/customers", label: "Customers", keys: "buyers" },
  { path: "/payments", label: "Payments", keys: "stripe billing payouts" },
  { path: "/marketing", label: "Email marketing", keys: "campaigns" },
  { path: "/storefront", label: "Storefront", keys: "theme site builder" },
  { path: "/analytics", label: "Analytics", keys: "stats reports" },
  { path: "/collections", label: "Collections", keys: "" },
  { path: "/shipping", label: "Shipping", keys: "zones" },
  { path: "/discounts", label: "Discounts", keys: "codes" },
  { path: "/abandoned-carts", label: "Abandoned carts", keys: "recovery" },
  { path: "/settings", label: "Settings", keys: "config" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const needle = q.toLowerCase();
  const filtered = ROUTES.filter(
    (r) =>
      r.label.toLowerCase().includes(needle) ||
      r.path.includes(needle) ||
      r.keys.includes(needle)
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="border-b border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-500">
          Go to… · ⌘P
        </p>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type to filter…"
          className="w-full border-b border-zinc-100 px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.map((r) => (
            <li key={r.path}>
              <button
                type="button"
                className="flex w-full px-4 py-2.5 text-left text-sm hover:bg-violet-50"
                onClick={() => {
                  navigate(r.path);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-zinc-900">{r.label}</span>
                <span className="ml-auto text-xs text-zinc-400">{r.path}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">No matches</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
