import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { StorePreview } from "@/components/store-preview";
import { track } from "@/lib/analytics";
import { demoStoreUrl } from "@/lib/urls";
import { localizedPath, useLanding } from "./locale";

export function Hero() {
  const { locale, content } = useLanding();
  const h = content.hero;
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    track("cta_hero");
    const base = localizedPath(locale, "/signup");
    navigate(email ? `${base}?email=${encodeURIComponent(email)}` : base);
  }

  return (
    <section className="mesh-hero overflow-hidden pb-16 pt-16 md:pb-20 md:pt-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden />
          {h.badge}
        </div>
        <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-zinc-900 md:text-6xl">
          {h.titleStart} <span className="text-gradient">{h.titleAccent}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">{h.subtitle}</p>

        <form onSubmit={onSubmit} className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
          <label htmlFor="hero-email" className="sr-only">
            {h.emailLabel}
          </label>
          <input
            id="hero-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={h.emailPlaceholder}
            className="ugclab-input min-h-[3.25rem] flex-1 !text-base"
          />
          <button
            type="submit"
            className="ugclab-btn ugclab-btn-primary min-h-[3.25rem] px-7 text-base shadow-lg shadow-brand-500/20"
          >
            {h.emailCta}
          </button>
        </form>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 text-sm text-zinc-500 sm:flex-row sm:gap-4">
          <span>{h.note}</span>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <a
            href={demoStoreUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("demo_store_hero")}
            className="font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            {h.demo} →
          </a>
        </div>
        <StorePreview note={h.previewNote} />
      </div>
    </section>
  );
}
