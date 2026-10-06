import type { StoreTheme } from "@ugclab/tenant/store-theme";
import type { BuilderSelection } from "./builder-types";

export function BuilderShellChrome({
  theme,
  storeName,
  primaryColor,
  selection,
  onSelect,
}: {
  theme: StoreTheme;
  storeName: string;
  primaryColor: string;
  selection: BuilderSelection | null;
  onSelect: (sel: BuilderSelection) => void;
}) {
  const nav = (theme.navLinks ?? []).filter((l) => l.header !== false).slice(0, 5);
  const showAnnouncement = theme.announcementEnabled !== false;
  const annText =
    theme.announcementText?.trim() || "Announce something — free shipping, a sale, or news";
  const annColor = theme.announcementColor || primaryColor;
  const layout = theme.headerLayout ?? "logo-left";

  return (
    <>
      <button
        type="button"
        className={`site-builder-shell-zone${
          selection?.kind === "announcement" ? " is-selected" : ""
        }${!showAnnouncement ? " is-disabled" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: "announcement" });
        }}
      >
        <span className="site-builder-shell-label">Announcement bar</span>
        <div
          className="site-builder-announcement"
          style={{
            background: showAnnouncement ? annColor : "#a1a1aa",
            opacity: showAnnouncement ? 1 : 0.55,
          }}
        >
          {showAnnouncement ? annText : "Announcement off — click to enable"}
        </div>
      </button>

      <button
        type="button"
        className={`site-builder-shell-zone${
          selection?.kind === "header" ? " is-selected" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: "header" });
        }}
      >
        <span className="site-builder-shell-label">Header</span>
        <header
          className={`site-builder-live-header site-builder-live-header--${layout}`}
        >
          <div className="site-builder-live-logo">
            <span
              className="site-builder-live-logo-mark"
              style={{ background: primaryColor }}
            >
              {storeName.charAt(0).toUpperCase()}
            </span>
            <span className="site-builder-live-logo-text">{storeName}</span>
          </div>
          {layout !== "minimal" ? (
            <nav className="site-builder-live-nav">
              {(nav.length
                ? nav
                : [
                    { label: "Home", path: "/" },
                    { label: "Catalog", path: "/catalog" },
                    { label: "Contact", path: "/pages/contact" },
                  ]
              ).map((l) => (
                <span key={l.path + l.label}>{l.label}</span>
              ))}
            </nav>
          ) : null}
          <div className="site-builder-live-utils">
            {theme.headerShowSearch !== false ? (
              <span className="site-builder-live-icon" aria-hidden title="Search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
              </span>
            ) : null}
            <span className="site-builder-live-icon" aria-hidden title="Account">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="site-builder-live-icon" aria-hidden title="Cart">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6h15l-1.5 9h-11z" strokeLinejoin="round" />
                <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none" />
                <path d="M6 6L5 3H2" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </header>
      </button>
    </>
  );
}

export function BuilderFooterChrome({
  theme,
  storeName,
  selection,
  onSelect,
}: {
  theme: StoreTheme;
  storeName: string;
  selection: BuilderSelection | null;
  onSelect: (sel: BuilderSelection) => void;
}) {
  const layout = theme.footerLayout ?? "columns-3";
  const copyright =
    theme.footerCopyright?.trim() ||
    `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`;
  const cols =
    theme.footerColumns?.length && layout !== "minimal"
      ? theme.footerColumns
      : layout === "minimal"
        ? []
        : [
            {
              title: "Shop",
              links: [
                { label: "All products", href: "/catalog" },
                { label: "Collections", href: "/collections" },
              ],
            },
            {
              title: "Help",
              links: [
                { label: "Contact", href: "/pages/contact" },
                { label: "Shipping", href: "/pages/shipping-policy" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", href: "/pages/about" },
                { label: "Policies", href: "/pages/privacy-policy" },
              ],
            },
          ].slice(0, layout === "columns-2" ? 2 : 3);

  return (
    <button
      type="button"
      className={`site-builder-shell-zone site-builder-shell-zone--footer${
        selection?.kind === "footer" ? " is-selected" : ""
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ kind: "footer" });
      }}
    >
      <span className="site-builder-shell-label">Footer</span>
      <footer className="site-builder-live-footer">
        {cols.length > 0 ? (
          <div
            className="site-builder-live-footer-cols"
            style={{
              gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
            }}
          >
            {cols.map((c) => (
              <div key={c.title}>
                <p className="site-builder-live-footer-title">{c.title}</p>
                <ul>
                  {c.links.slice(0, 4).map((l) => (
                    <li key={l.href + l.label}>{l.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
        <p className="site-builder-live-footer-copy">{copyright}</p>
      </footer>
    </button>
  );
}
