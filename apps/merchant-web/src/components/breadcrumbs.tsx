import { Link } from "react-router-dom";

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-zinc-300">/</span> : null}
            {item.to ? (
              <Link to={item.to} className="hover:text-violet-600">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-zinc-800">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
