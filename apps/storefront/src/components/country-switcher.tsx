import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "@/context/store";

export function CountrySwitcher() {
  const ctx = useStore();
  const [params] = useSearchParams();
  const countries = ctx.marketCountries ?? [];
  if (countries.length <= 1) return null;
  const location = useLocation();
  const current = (params.get("country") ?? countries[0] ?? "").toUpperCase();

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
      {countries.map((code) => {
        const next = new URLSearchParams(params.toString());
        next.set("country", code);
        next.set("tenant", params.get("tenant") ?? ctx.tenant.slug);
        next.set("locale", ctx.locale);
        return (
          <Link
            key={code}
            to={`${location.pathname}?${next.toString()}`}
            className={`rounded-md px-2.5 py-1 font-medium ${
              current === code
                ? "bg-white text-violet-700 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {code}
          </Link>
        );
      })}
    </div>
  );
}
