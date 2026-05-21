import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

export function AdminPageShell({
  crumbs,
  title,
  description,
  actions,
  children,
  wide = true,
}: {
  crumbs?: Crumb[];
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "mx-auto max-w-6xl" : "mx-auto max-w-2xl"}>
      {crumbs?.length ? <Breadcrumbs items={crumbs} /> : null}
      {title ? (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
