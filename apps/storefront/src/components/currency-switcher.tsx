import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "@/context/store";

export function CurrencySwitcher() {
  const ctx = useStore();
  const [params] = useSearchParams();
  const currencies = ctx.displayCurrencies ?? [];
  if (currencies.length <= 1) return null;
  const location = useLocation();
  const current = (params.get("currency") ?? ctx.currency).toUpperCase();

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
      {currencies.map((code) => {
        const next = new URLSearchParams(params.toString());
        next.set("currency", code);
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
