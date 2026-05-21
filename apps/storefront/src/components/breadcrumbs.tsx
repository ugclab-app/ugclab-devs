import { Link } from "react-router-dom";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <span className="text-zinc-300">/</span> : null}
            {item.href ? (
              <Link to={item.href} className="text-violet-600 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-zinc-800">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
