import { useState } from "react";
import type { NavLink } from "@ugclab/tenant/store-theme";

export function StoreNavMenuEditor({
  initialLinks,
  hideDefaultNav,
}: {
  initialLinks: NavLink[];
  hideDefaultNav?: boolean;
}) {
  const [links, setLinks] = useState<NavLink[]>(
    initialLinks.length > 0
      ? initialLinks
      : [{ label: "", path: "", header: true, footer: false }]
  );

  function update(idx: number, patch: Partial<NavLink>) {
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function add() {
    setLinks((prev) => [...prev, { label: "", path: "", header: true, footer: false }]);
  }

  function remove(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <section className="admin-card space-y-4 p-6">
      <div>
        <h3 className="font-semibold">Navigation menu</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Add links to header and/or footer. Paths like <code>/collections</code> or{" "}
          <code>/pages/about</code>.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="hideDefaultNav"
          defaultChecked={hideDefaultNav}
        />
        Hide default links (Collections, Blog, Wishlist)
      </label>
      <input type="hidden" name="navLinksJson" value={JSON.stringify(links)} readOnly />
      <ul className="space-y-3">
        {links.map((link, i) => (
          <li
            key={i}
            className="grid gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 sm:grid-cols-2"
          >
            <input
              placeholder="Label"
              value={link.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="ugclab-input"
            />
            <input
              placeholder="/pages/shipping"
              value={link.path}
              onChange={(e) => update(i, { path: e.target.value })}
              className="ugclab-input font-mono text-sm"
            />
            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input
                type="checkbox"
                checked={link.header !== false}
                onChange={(e) => update(i, { header: e.target.checked })}
              />
              Header
              <input
                type="checkbox"
                checked={link.footer === true}
                onChange={(e) => update(i, { footer: e.target.checked })}
                className="ml-3"
              />
              Footer
            </label>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-left text-xs text-red-600 sm:col-span-2"
            >
              Remove link
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={add} className="ugclab-btn border border-zinc-200 bg-white text-sm">
        + Add link
      </button>
    </section>
  );
}
