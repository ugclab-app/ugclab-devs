import { useState } from "react";
import type { StoreTheme } from "@ugclab/tenant/store-theme";

type FooterCol = { title: string; links: { label: string; href: string }[] };

export function StoreShellFields({ theme }: { theme: StoreTheme }) {
  const [cols, setCols] = useState<FooterCol[]>(
    theme.footerColumns?.length
      ? theme.footerColumns.map((c) => ({
          title: c.title,
          links: c.links.map((l) => ({ ...l })),
        }))
      : []
  );

  return (
    <section className="admin-card space-y-6 p-6">
      <div>
        <h3 className="font-semibold text-zinc-900">Header & footer</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Layout for the store chrome. Menu links are still edited in the Menu tab.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Header layout
          <select
            name="headerLayout"
            className="ugclab-select mt-1"
            defaultValue={theme.headerLayout ?? "logo-left"}
          >
            <option value="logo-left">Logo left · nav right</option>
            <option value="logo-center">Logo center</option>
            <option value="minimal">Minimal (logo + cart)</option>
          </select>
        </label>
        <label className="block text-sm">
          Footer layout
          <select
            name="footerLayout"
            className="ugclab-select mt-1"
            defaultValue={theme.footerLayout ?? "columns-3"}
          >
            <option value="columns-3">Three columns</option>
            <option value="columns-2">Two columns</option>
            <option value="stacked">Stacked</option>
            <option value="minimal">Minimal copyright only</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="headerSticky"
            defaultChecked={theme.headerSticky !== false}
          />
          Sticky header
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="headerShowSearch"
            defaultChecked={theme.headerShowSearch !== false}
          />
          Show search
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="footerShowSocial"
            defaultChecked={theme.footerShowSocial !== false}
          />
          Footer social links
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="footerShowCollections"
            defaultChecked={theme.footerShowCollections !== false}
          />
          Footer collections
        </label>
      </div>

      <label className="block text-sm">
        Footer copyright line
        <input
          name="footerCopyright"
          className="ugclab-input mt-1"
          defaultValue={theme.footerCopyright ?? ""}
          placeholder="Leave empty for default © year · store name"
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Custom footer columns</p>
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white text-xs"
            onClick={() =>
              setCols((c) => [...c, { title: "Links", links: [{ label: "", href: "/" }] }])
            }
          >
            Add column
          </button>
        </div>
        <input type="hidden" name="footerColumnsJson" value={JSON.stringify(cols)} />
        {cols.length === 0 ? (
          <p className="text-xs text-zinc-500">No custom columns — store uses built-in links.</p>
        ) : (
          cols.map((col, ci) => (
            <div key={ci} className="rounded-lg border border-zinc-100 p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  className="ugclab-input flex-1 text-sm"
                  value={col.title}
                  placeholder="Column title"
                  onChange={(e) => {
                    const v = e.target.value;
                    setCols((prev) =>
                      prev.map((c, i) => (i === ci ? { ...c, title: v } : c))
                    );
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => setCols((prev) => prev.filter((_, i) => i !== ci))}
                >
                  Remove
                </button>
              </div>
              {col.links.map((link, li) => (
                <div key={li} className="flex flex-wrap gap-2">
                  <input
                    className="ugclab-input flex-1 min-w-[8rem] text-xs"
                    placeholder="Label"
                    value={link.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCols((prev) =>
                        prev.map((c, i) =>
                          i === ci
                            ? {
                                ...c,
                                links: c.links.map((l, j) =>
                                  j === li ? { ...l, label: v } : l
                                ),
                              }
                            : c
                        )
                      );
                    }}
                  />
                  <input
                    className="ugclab-input flex-1 min-w-[8rem] text-xs"
                    placeholder="/path or https://…"
                    value={link.href}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCols((prev) =>
                        prev.map((c, i) =>
                          i === ci
                            ? {
                                ...c,
                                links: c.links.map((l, j) =>
                                  j === li ? { ...l, href: v } : l
                                ),
                              }
                            : c
                        )
                      );
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-violet-700"
                onClick={() =>
                  setCols((prev) =>
                    prev.map((c, i) =>
                      i === ci
                        ? { ...c, links: [...c.links, { label: "", href: "/" }] }
                        : c
                    )
                  )
                }
              >
                + Link
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
