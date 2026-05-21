import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`settings-section ${className}`}>
      <div className="settings-section-head">
        <h3 className="settings-section-title">{title}</h3>
        {description ? (
          <p className="settings-section-desc">{description}</p>
        ) : null}
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

export function SettingsPanelShell({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-xl text-sm text-zinc-500">{description}</p>
          ) : null}
        </div>
        {badge}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
