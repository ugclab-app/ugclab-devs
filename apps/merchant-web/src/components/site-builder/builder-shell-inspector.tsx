import type { StoreTheme } from "@ugclab/tenant/store-theme";
import { PageStylePanel, type PageStyleState } from "./page-style-panel";

export function BuilderShellInspector({
  kind,
  theme,
  onShellChange,
}: {
  kind: "announcement" | "header" | "footer";
  theme: StoreTheme;
  onShellChange?: (patch: Partial<StoreTheme>) => void;
}) {
  const patch = onShellChange ?? (() => undefined);

  if (kind === "announcement") {
    return (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Announcement bar</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Shown above the header on every page.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={theme.announcementEnabled === true}
            onChange={(e) =>
              patch({
                announcementEnabled: e.target.checked,
                ...(e.target.checked && !theme.announcementText
                  ? { announcementText: "Free shipping this weekend!" }
                  : {}),
              })
            }
          />
          Show announcement
        </label>
        <label className="block text-sm">
          Message
          <input
            className="ugclab-input mt-1"
            value={theme.announcementText ?? ""}
            onChange={(e) =>
              patch({
                announcementText: e.target.value,
                announcementEnabled: true,
              })
            }
            placeholder="Free shipping this weekend!"
          />
        </label>
        <label className="block text-sm">
          Background
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded border border-zinc-200"
            value={theme.announcementColor ?? "#7c3aed"}
            onChange={(e) => patch({ announcementColor: e.target.value })}
          />
        </label>
      </div>
    );
  }

  if (kind === "header") {
    return (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Header</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Menu links are edited in the Menu tab. Layout applies on the live store.
          </p>
        </div>
        <label className="block text-sm">
          Layout
          <select
            className="ugclab-select mt-1"
            value={theme.headerLayout ?? "logo-left"}
            onChange={(e) =>
              patch({
                headerLayout: e.target.value as StoreTheme["headerLayout"],
              })
            }
          >
            <option value="logo-left">Logo left · nav right</option>
            <option value="logo-center">Logo center</option>
            <option value="minimal">Minimal (logo + cart)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={theme.headerSticky !== false}
            onChange={(e) => patch({ headerSticky: e.target.checked })}
          />
          Sticky header
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={theme.headerShowSearch !== false}
            onChange={(e) => patch({ headerShowSearch: e.target.checked })}
          />
          Show search
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Footer</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Store chrome under the page template.</p>
      </div>
      <label className="block text-sm">
        Layout
        <select
          className="ugclab-select mt-1"
          value={theme.footerLayout ?? "columns-3"}
          onChange={(e) =>
            patch({
              footerLayout: e.target.value as StoreTheme["footerLayout"],
            })
          }
        >
          <option value="columns-3">Three columns</option>
          <option value="columns-2">Two columns</option>
          <option value="stacked">Stacked</option>
          <option value="minimal">Minimal copyright only</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={theme.footerShowSocial !== false}
          onChange={(e) => patch({ footerShowSocial: e.target.checked })}
        />
        Social links
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={theme.footerShowCollections !== false}
          onChange={(e) => patch({ footerShowCollections: e.target.checked })}
        />
        Collections
      </label>
      <label className="block text-sm">
        Copyright
        <input
          className="ugclab-input mt-1"
          value={theme.footerCopyright ?? ""}
          onChange={(e) => patch({ footerCopyright: e.target.value })}
          placeholder="Leave empty for default"
        />
      </label>
    </div>
  );
}

export function BuilderThemeInspector({
  pageStyle,
  onPageStyleChange,
}: {
  pageStyle: PageStyleState;
  onPageStyleChange: (patch: Partial<PageStyleState>) => void;
}) {
  return (
    <div>
      <div className="border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">Theme settings</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Page background, spacing, and custom CSS.</p>
      </div>
      <PageStylePanel style={pageStyle} onChange={onPageStyleChange} />
    </div>
  );
}

export function BuilderAppsInspector() {
  return (
    <div className="space-y-3 p-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">App embeds</h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          App embeds let third-party apps inject scripts and UI (chat, pixels, reviews). An app
          store isn’t available yet — this panel is a placeholder for Shopify-style embeds.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-400">
        No app embeds
      </div>
    </div>
  );
}
