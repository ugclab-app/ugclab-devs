import { Link } from "react-router-dom";

export type ActionItem = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  count?: number;
};

const tone: Record<string, string> = {
  high: "border-red-200 bg-red-50/80",
  medium: "border-amber-200 bg-amber-50/80",
  low: "border-slate-200 bg-slate-50/80",
};

export function PlatformActionItems({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <section className="platform-card p-6">
        <h2 className="font-semibold text-slate-900">What to do today</h2>
        <p className="mt-2 text-sm text-slate-500">No urgent platform tasks right now.</p>
      </section>
    );
  }

  return (
    <section className="platform-card overflow-hidden">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold text-slate-900">What to do today</h2>
        <p className="mt-1 text-sm text-slate-500">
          {items.length} actionable item{items.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href}
              className={`flex items-start justify-between gap-4 px-6 py-4 transition hover:bg-white/60 ${tone[item.priority]}`}
            >
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
              </div>
              {item.count != null ? (
                <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 shadow-sm">
                  {item.count}
                </span>
              ) : (
                <span className="shrink-0 text-slate-400" aria-hidden>
                  →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
