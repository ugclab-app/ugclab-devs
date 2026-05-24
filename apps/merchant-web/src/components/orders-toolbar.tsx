import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useTransition } from "react";

const STATUS_CHIPS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const VIEW_CHIPS = [{ value: "paid-unfulfilled", label: "Paid · not shipped" }] as const;

type SortOption = { value: string; label: string };

export function OrdersToolbar({
  sortOptions,
  placeholder = "Search order # or email…",
}: {
  sortOptions: SortOption[];
  placeholder?: string;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? sortOptions[0]?.value ?? "";
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const country = searchParams.get("country") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const view = searchParams.get("view") ?? "";

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") params.delete(key);
        else params.set(key, val);
      }
      startTransition(() => {
        navigate(`/orders?${params.toString()}`);
      });
    },
    [navigate, searchParams]
  );

  function hrefForStatus(nextStatus: string) {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    next.delete("view");
    const qs = next.toString();
    return qs ? `/orders?${qs}` : "/orders";
  }

  function hrefForView(nextView: string) {
    const next = new URLSearchParams(searchParams);
    if (nextView) next.set("view", nextView);
    else next.delete("view");
    next.delete("status");
    const qs = next.toString();
    return qs ? `/orders?${qs}` : "/orders";
  }

  function applyDate(field: "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(field, value);
    else next.delete(field);
    setSearchParams(next);
  }

  return (
    <div
      className={`admin-card space-y-4 p-4 sm:p-5 ${pending ? "opacity-80" : ""}`}
      aria-busy={pending}
    >
      <div className="orders-toolbar-search-row">
        <input
          type="text"
          defaultValue={q}
          placeholder={placeholder}
          aria-label="Search orders"
          className="ugclab-input orders-toolbar-search"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update({ q: (e.target as HTMLInputElement).value.trim() || null });
            }
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== q) update({ q: v || null });
          }}
        />
        <select
          value={sort}
          onChange={(e) => update({ sort: e.target.value })}
          className="ugclab-select orders-toolbar-sort"
          aria-label="Sort orders"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 border-t border-zinc-100 pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => {
            const active = status === chip.value && !view;
            return (
              <Link
                key={chip.label}
                to={hrefForStatus(chip.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-violet-200 hover:text-violet-700"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
          {VIEW_CHIPS.map((chip) => {
            const active = view === chip.value;
            return (
              <Link
                key={chip.label}
                to={hrefForView(chip.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-amber-600 text-white shadow-sm"
                    : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:justify-end">
          <label className="block shrink-0">
            <span className="mb-1 block text-xs font-medium text-zinc-500">Country</span>
            <select
              value={country}
              onChange={(e) => update({ country: e.target.value || null })}
              className="ugclab-select orders-toolbar-sort"
              aria-label="Filter by shipping country"
            >
              <option value="">All</option>
              <option value="US">US</option>
              <option value="CA">CA</option>
              <option value="GB">GB</option>
              <option value="DE">DE</option>
              <option value="FR">FR</option>
              <option value="NL">NL</option>
              <option value="PL">PL</option>
            </select>
          </label>
          <label className="block shrink-0">
            <span className="mb-1 block text-xs font-medium text-zinc-500">Tag</span>
            <input
              value={tag}
              onChange={(e) => update({ tag: e.target.value || null })}
              placeholder="vip…"
              className="ugclab-input orders-toolbar-sort w-28"
            />
          </label>
          <label className="block shrink-0">
            <span className="mb-1 block text-xs font-medium text-zinc-500">From</span>
            <input
              type="date"
              lang="en"
              value={from}
              onChange={(e) => applyDate("from", e.target.value)}
              className="ugclab-input orders-toolbar-date"
            />
          </label>
          <label className="block shrink-0">
            <span className="mb-1 block text-xs font-medium text-zinc-500">To</span>
            <input
              type="date"
              lang="en"
              value={to}
              onChange={(e) => applyDate("to", e.target.value)}
              className="ugclab-input orders-toolbar-date"
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("from");
                next.delete("to");
                setSearchParams(next);
              }}
              className="mb-2 shrink-0 text-sm text-zinc-500 hover:text-violet-600"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
