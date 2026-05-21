import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { storeApi } from "@/api/client";
import { storeHref } from "@/lib/store-href";

export function StoreSearch({
  locale,
  tenantSlug,
}: {
  locale: string;
  tenantSlug: string;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const [value, setValue] = useState(q);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { id: string; title: string; slug: string; tags: string[]; barcode: string | null }[]
  >([]);

  useEffect(() => {
    setValue(q);
  }, [q]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      storeApi
        .searchSuggest(tenantSlug, value.trim())
        .then((r) => setSuggestions(r.suggestions))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [value, tenantSlug]);

  const nav = { locale, tenant: tenantSlug };

  return (
    <div className="relative">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const query = value.trim();
          const next = new URLSearchParams(params.toString());
          if (query) next.set("q", query);
          else next.delete("q");
          next.set("locale", locale);
          next.set("tenant", tenantSlug);
          setOpen(false);
          navigate(`/?${next.toString()}`);
        }}
      >
        <input
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search SKU, tags…"
          className="w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm sm:w-52"
          autoComplete="off"
        />
      </form>
      {open && suggestions.length > 0 ? (
        <ul className="absolute right-0 z-40 mt-1 max-h-64 w-72 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <Link
                to={storeHref(`/products/${s.slug}`, nav)}
                className="block px-3 py-2 text-sm hover:bg-violet-50"
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="font-medium">{s.title}</span>
                {s.barcode ? (
                  <span className="ml-2 font-mono text-xs text-zinc-400">{s.barcode}</span>
                ) : null}
                {s.tags.length > 0 ? (
                  <span className="mt-0.5 block text-xs text-zinc-400">{s.tags.join(", ")}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
