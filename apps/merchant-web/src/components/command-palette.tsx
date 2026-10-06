import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";

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
  { path: "/analytics/live", label: "Live View", keys: "live realtime visitors" },
  { path: "/collections", label: "Collections", keys: "" },
  { path: "/shipping", label: "Shipping", keys: "zones" },
  { path: "/discounts", label: "Discounts", keys: "codes" },
  { path: "/abandoned-carts", label: "Abandoned carts", keys: "recovery" },
  { path: "/settings", label: "Settings", keys: "config" },
];

type QuickAction = {
  id: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
};

function parseDiscountPercent(q: string): number | null {
  const m = q.match(/^(?:discount|promo|sale)\s+(\d+(?:\.\d+)?)\s*%?$/i);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1]!));
  return n > 0 && n <= 100 ? n : null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setNote(null);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const needle = q.trim().toLowerCase();
  const discountPct = parseDiscountPercent(q.trim());

  const quickActions: QuickAction[] = [];
  if (discountPct != null) {
    quickActions.push({
      id: "discount",
      label: `Create ${discountPct}% off cart discount`,
      hint: "Creates an active promotion",
      run: async () => {
        setBusy(true);
        try {
          await api.createPromotion({
            type: "CART_PERCENT",
            value: discountPct,
            active: true,
          });
          navigate("/discounts");
          setOpen(false);
        } catch (e) {
          setNote(e instanceof Error ? e.message : "Could not create discount");
        } finally {
          setBusy(false);
        }
      },
    });
  }
  if (/^new product$/i.test(q.trim()) || needle === "new product") {
    quickActions.push({
      id: "new-product",
      label: "New product",
      hint: "Open product editor",
      run: () => {
        navigate("/products/new");
        setOpen(false);
      },
    });
  }
  if (/^abandoned/.test(needle) || needle.includes("abandoned cart")) {
    quickActions.push({
      id: "abandoned",
      label: "Abandoned carts",
      hint: "Recovery queue",
      run: () => {
        navigate("/abandoned-carts");
        setOpen(false);
      },
    });
  }

  const filtered = ROUTES.filter(
    (r) =>
      r.label.toLowerCase().includes(needle) ||
      r.path.includes(needle) ||
      r.keys.includes(needle)
  );

  async function onSubmit() {
    if (quickActions[0]) {
      await quickActions[0].run();
    }
  }

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
          Go to… · Try “discount 10”, “new product”, “abandoned” · ⌘P
        </p>
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setNote(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && quickActions.length) {
              e.preventDefault();
              void onSubmit();
            }
          }}
          placeholder="Type to filter or run a command…"
          className="w-full border-b border-zinc-100 px-4 py-3 text-sm outline-none"
        />
        {note ? (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
            {note}
          </p>
        ) : null}
        <ul className="max-h-72 overflow-y-auto py-1">
          {quickActions.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                disabled={busy}
                className="flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-violet-50"
                onClick={() => void a.run()}
              >
                <span className="font-medium text-violet-900">{a.label}</span>
                <span className="text-xs text-zinc-500">{a.hint}</span>
              </button>
            </li>
          ))}
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
          {filtered.length === 0 && quickActions.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">No matches</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
