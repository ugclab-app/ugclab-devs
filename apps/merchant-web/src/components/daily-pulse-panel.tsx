import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

type PulseCard = {
  id: string;
  kind: string;
  title: string;
  description: string;
  href: string;
  count?: number;
};

export function DailyPulsePanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["pulse"],
    queryFn: () => api.pulse(),
  });

  const cards = (data?.cards ?? []) as PulseCard[];
  if (isLoading) return null;
  if (!cards.length) return null;

  return (
    <section className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5">
      <h2 className="text-sm font-semibold text-violet-900">Daily pulse</h2>
      <p className="mt-0.5 text-xs text-violet-800/80">Actions worth your attention today.</p>
      <ul className="mt-4 space-y-3">
        {cards.map((card) => (
          <li key={card.id}>
            <Link
              to={card.href}
              className="block rounded-lg border border-white/80 bg-white/90 px-4 py-3 shadow-sm transition hover:border-violet-200 hover:shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-zinc-900">{card.title}</p>
                {card.count != null ? (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                    {card.count}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-zinc-600">{card.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
