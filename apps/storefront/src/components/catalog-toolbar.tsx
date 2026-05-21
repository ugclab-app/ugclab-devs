import { useNavigate, useSearchParams } from "react-router-dom";

export function CatalogToolbar({
  locale,
  tenantSlug,
  tags,
}: {
  locale: string;
  tenantSlug: string;
  tags: string[];
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("locale", locale);
    next.set("tenant", tenantSlug);
    navigate(`/?${next.toString()}`);
  }

  return (
    <form className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Sort</span>
        <select
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={params.get("sort") ?? "newest"}
          onChange={(e) => update("sort", e.target.value === "newest" ? "" : e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Type</span>
        <select
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={params.get("type") ?? ""}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">All types</option>
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
          <option value="SERVICE">Service</option>
        </select>
      </label>
      {tags.length > 0 ? (
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600">Tag</span>
          <select
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={params.get("tag") ?? ""}
            onChange={(e) => update("tag", e.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </form>
  );
}
