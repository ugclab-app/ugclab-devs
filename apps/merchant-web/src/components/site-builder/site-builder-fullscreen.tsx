import { useEffect, type ReactNode } from "react";

export function SiteBuilderFullscreenShell({
  open,
  onClose,
  storeName,
  alert,
  pending,
  onSave,
  onPublish,
  previewUrl,
  children,
}: {
  open: boolean;
  onClose: () => void;
  storeName: string;
  alert?: { ok?: boolean; message?: string };
  pending?: boolean;
  onSave: () => void;
  onPublish: () => void;
  previewUrl: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return <>{children}</>;
  }

  return (
    <div className="site-builder-fullscreen-root" role="dialog" aria-modal="true">
      <header className="site-builder-fullscreen-header">
        <div className="flex min-w-0 items-center gap-3">
          <p className="truncate text-sm font-bold text-zinc-900">{storeName}</p>
          <span className="hidden shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 sm:inline">
            Full screen
          </span>
        </div>
        {alert?.message ? (
          <p
            className={`hidden max-w-md truncate text-sm lg:block ${
              alert.ok ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {alert.message}
          </p>
        ) : null}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="ugclab-btn hidden border border-zinc-200 bg-white text-xs sm:inline-flex"
          >
            Preview store ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="ugclab-btn border border-zinc-200 bg-white text-xs"
            title="Exit full screen (Esc)"
          >
            Exit full screen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onSave}
            className="ugclab-btn ugclab-btn-primary text-xs"
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onPublish}
            className="ugclab-btn border border-violet-200 bg-violet-50 text-violet-800 text-xs"
          >
            Publish live
          </button>
        </div>
      </header>
      <div className="site-builder-fullscreen-body">{children}</div>
    </div>
  );
}
