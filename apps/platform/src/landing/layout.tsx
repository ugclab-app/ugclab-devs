import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@ugclab/ui";
import { track } from "@/lib/analytics";
import { merchantAdminUrl } from "@/lib/urls";
import { compareSlugs, countrySlugs, landingLocales } from "./content";
import { localizedPath, unlocalizedPath, useLanding } from "./locale";

const localeNames = { en: "English", ru: "Русский", tr: "Türkçe" } as const;

function Logo() {
  const { locale } = useLanding();
  return (
    <Link to={localizedPath(locale, "/")} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-teal-500/30">
        T
      </span>
      <span className="text-lg font-bold tracking-tight text-zinc-900">Tescommerce</span>
    </Link>
  );
}

function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, content } = useLanding();
  const { pathname } = useLocation();
  const base = unlocalizedPath(pathname);
  return (
    <div className={`flex items-center gap-1 text-sm ${className}`} aria-label={content.nav.language}>
      {landingLocales.map((l) => (
        <Link
          key={l}
          to={localizedPath(l, base)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          className={`rounded-md px-2 py-1 font-medium ${
            l === locale ? "bg-brand-50 text-brand-700" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {l.toUpperCase()}
          <span className="sr-only"> — {localeNames[l]}</span>
        </Link>
      ))}
    </div>
  );
}

function LandingHeader() {
  const { locale, content } = useLanding();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const home = localizedPath(locale, "/");
  const onHome = pathname === home;
  const anchor = (id: string) => (onHome ? `#${id}` : `${home}#${id}`);
  const links = [
    { href: anchor("check"), label: content.nav.check },
    { href: anchor("features"), label: content.nav.features },
    { href: localizedPath(locale, "/tools/savings"), label: content.nav.savings },
    { href: localizedPath(locale, "/pricing"), label: content.nav.pricing },
    { href: localizedPath(locale, "/guides"), label: content.footer.guides },
    { href: anchor("faq"), label: content.nav.faq },
  ];

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 lg:flex">
          {links.map((item) =>
            item.href.startsWith("#") || item.href.includes("#") ? (
              <a key={item.href} href={item.href} className="transition hover:text-brand-600">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} to={item.href} className="transition hover:text-brand-600">
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:flex" />
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? content.nav.close : content.nav.menu}
          </button>
          <a
            href={`${merchantAdminUrl}/login`}
            className="hidden text-sm font-medium text-zinc-600 transition hover:text-zinc-900 md:inline"
          >
            {content.nav.signIn}
          </a>
          <Link
            to={localizedPath(locale, "/signup")}
            onClick={() => track("cta_header")}
            className="hidden sm:block"
          >
            <Button className="shadow-lg shadow-brand-500/25">{content.nav.getStarted}</Button>
          </Link>
        </div>
      </div>
      {menuOpen ? (
        <nav id="mobile-nav" className="border-t border-zinc-200 bg-white px-6 py-4 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 text-sm font-medium text-zinc-700">
            {links.map((item) =>
              item.href.startsWith("#") || item.href.includes("#") ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 hover:bg-zinc-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className="rounded-xl px-3 py-3 hover:bg-zinc-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
            <a href={`${merchantAdminUrl}/login`} className="rounded-xl px-3 py-3 hover:bg-zinc-50">
              {content.nav.signIn}
            </a>
            <LanguageSwitcher className="px-1 pt-2" />
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function LandingFooter() {
  const { locale, content } = useLanding();
  const f = content.footer;
  const columns = [
    {
      title: f.compare,
      links: compareSlugs.map((slug) => ({
        to: localizedPath(locale, `/vs/${slug}`),
        label: content.comparePages[slug].title,
      })),
    },
    {
      title: f.countries,
      links: countrySlugs.map((slug) => ({
        to: localizedPath(locale, `/sell-from/${slug}`),
        label: content.countryPages[slug].eyebrow,
      })),
    },
    {
      title: f.tools,
      links: [
        { to: localizedPath(locale, "/pricing"), label: f.pricing },
        { to: localizedPath(locale, "/tools/savings"), label: f.savingsTool },
        { to: localizedPath(locale, "/guides"), label: f.guides },
        { to: localizedPath(locale, "/glossary"), label: f.glossary },
      ],
    },
    {
      title: f.company,
      links: [
        { to: "/partners", label: f.partners },
        { to: "/status", label: f.status },
        { to: "/privacy", label: f.privacy },
        { to: "/terms", label: f.terms },
      ],
    },
  ];

  return (
    <footer className="border-t border-zinc-200 bg-white pb-28 pt-14 sm:pb-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-zinc-500">{content.facts.title}</p>
          <LanguageSwitcher />
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-zinc-900">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-500">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-zinc-800">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col justify-between gap-3 border-t border-zinc-100 px-6 pt-6 text-sm text-zinc-500 sm:flex-row">
        <p>
          © {new Date().getFullYear()} Tescommerce. {f.rights}
        </p>
        <a href={`${merchantAdminUrl}/login`} className="hover:text-zinc-800">
          {f.login}
        </a>
      </div>
    </footer>
  );
}

/** Mobile-only bar that appears once the hero CTA has scrolled away. */
function StickyCta() {
  const { locale, content } = useLanding();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur transition-transform sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Link
        to={localizedPath(locale, "/signup")}
        tabIndex={visible ? 0 : -1}
        onClick={() => track("cta_sticky")}
        className="flex w-full items-center justify-center rounded-xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/25"
      >
        {content.sticky}
      </Link>
    </div>
  );
}

export function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
      <StickyCta />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <Tag
        className={`mt-3 font-bold tracking-tight text-zinc-900 ${
          Tag === "h1" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
        }`}
      >
        {title}
      </Tag>
      {subtitle ? <p className="mt-5 text-lg leading-relaxed text-zinc-600">{subtitle}</p> : null}
    </div>
  );
}

