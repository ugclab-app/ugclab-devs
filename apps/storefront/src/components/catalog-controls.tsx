import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function CatalogControls({
  showQuery = false,
  featuredSort = false,
}: {
  showQuery?: boolean;
  featuredSort?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    navigate(`${location.pathname}?${next.toString()}`);
  }

  return (
    <form
      className="mt-6 flex w-full flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        update({
          q: String(fd.get("q") ?? "").trim(),
          min: String(fd.get("min") ?? "").trim(),
          max: String(fd.get("max") ?? "").trim(),
        });
      }}
    >
      {showQuery ? (
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600">Search</span>
          <input
            name="q"
            defaultValue={params.get("q") ?? ""}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Sort</span>
        <select
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={params.get("sort") || (featuredSort ? "featured" : "newest")}
          onChange={(e) => {
            const value = e.target.value;
            const clear = featuredSort ? value === "featured" : value === "newest";
            update({ sort: clear ? "" : value });
          }}
        >
          {featuredSort ? <option value="featured">Featured</option> : null}
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          {featuredSort ? <option value="title">Name</option> : null}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Min price</span>
        <input
          name="min"
          inputMode="decimal"
          defaultValue={params.get("min") ?? ""}
          className="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Max price</span>
        <input
          name="max"
          inputMode="decimal"
          defaultValue={params.get("max") ?? ""}
          className="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={params.get("inStock") === "1"}
          onChange={(e) => update({ inStock: e.target.checked ? "1" : "" })}
        />
        In stock
      </label>
      <button type="submit" className="store-btn-secondary text-sm">
        Apply
      </button>
    </form>
  );
}

export function CatalogPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (pages <= 1) return null;

  function go(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    navigate(`${location.pathname}?${next.toString()}`);
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        className="store-btn-secondary disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        Previous
      </button>
      <span className="text-zinc-500">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="store-btn-secondary disabled:opacity-40"
        disabled={page >= pages}
        onClick={() => go(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
