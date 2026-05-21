import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "@/context/store";

export function LocaleSwitcher() {
  const { enabledLocales, locale, tenant } = useStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (enabledLocales.length <= 1) return null;

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
      {enabledLocales.map((loc) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("locale", loc);
        params.set("tenant", searchParams.get("tenant") ?? tenant.slug);
        const href = `${location.pathname}?${params.toString()}`;
        return (
          <Link
            key={loc}
            to={href}
            className={`rounded-md px-2.5 py-1 font-medium uppercase ${
              locale === loc
                ? "bg-white text-violet-700 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {loc}
          </Link>
        );
      })}
    </div>
  );
}
