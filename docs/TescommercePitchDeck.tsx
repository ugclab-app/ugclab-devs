/**
 * Tescommerce seed pitch deck — viewer + PDF export.
 * Run: npm run dev -w @ugclab/platform → http://localhost:3000/deck
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const SLIDE_WIDTH_PX = 1123;
export const SLIDE_HEIGHT_PX = 794;

const FONT =
  '"Inter", "Segoe UI", ui-sans-serif, system-ui, -apple-system, sans-serif';

const CONTACT_EMAIL = "mustafa@tescommerce.com";
const CONTACT_WEB = "tescommerce.com";

const C = {
  ink: "#0a0f1e",
  inkSoft: "#1e293b",
  slate: "#64748b",
  mist: "#94a3b8",
  paper: "#ffffff",
  paperAlt: "#f8fafc",
  line: "#e2e8f0",
  accent: "#10b981",
  accentDark: "#059669",
  accentGlow: "rgba(16, 185, 129, 0.15)",
  accentMuted: "rgba(16, 185, 129, 0.12)",
  violet: "#7c3aed",
} as const;

type SlideMeta = { title: string; subtitle: string };

export type PitchSlide =
  | {
      kind: "title";
      title: string;
      tagline: string;
      description: string;
      website: string;
      contact?: string;
    }
  | ({ kind: "content" } & SlideMeta & { bullets: string[]; callout?: string })
  | ({ kind: "pillars" } & SlideMeta & { pillars: { title: string; desc: string }[] })
  | ({ kind: "flow" } & SlideMeta)
  | ({
      kind: "funnel";
    } & SlideMeta & { levels: { label: string; value: string; note: string }[] })
  | ({ kind: "pricing" } & SlideMeta)
  | ({
      kind: "metrics";
    } & SlideMeta & { metrics: { label: string; value: string; note: string }[]; badges?: string[] })
  | ({ kind: "matrix" } & SlideMeta)
  | ({
      kind: "unit-economics";
    } & SlideMeta & { rows: { label: string; value: string; hint?: string }[]; blended?: string })
  | ({
      kind: "fundraise";
    } & SlideMeta & {
      amount: string;
      instrument: string;
      runway: string;
      allocation: { pct: number; label: string }[];
      milestone: string;
    })
  | ({ kind: "vision" } & SlideMeta & { headline: string; bullets: string[]; contact: string })
  | ({ kind: "team" } & SlideMeta & { members: { name: string; role: string; bio: string }[] });

export const PITCH_SLIDES: PitchSlide[] = [
  {
    kind: "title",
    title: "Tescommerce",
    tagline: "Sell globally from one store.",
    description:
      "Global-first commerce for creators and SMB brands — physical + digital, one checkout, one admin.",
    website: "https://tescommerce.com/",
    contact: CONTACT_EMAIL,
  },
  {
    kind: "content",
    title: "Problem",
    subtitle: "Selling globally still means stitching tools together.",
    callout: "Creators often run 4+ tools (store, payments, digital delivery, tax) before first sale.",
    bullets: [
      "Shopify + Gumroad + Wise + spreadsheets = high ops overhead and broken attribution.",
      "Cross-border tax, MoR, and payout rules slow launches by weeks for non-technical teams.",
      "Point solutions (Sellfy/Gumroad) lack full-store flexibility; Shopify is heavy for micro-brands.",
    ],
  },
  {
    kind: "pillars",
    title: "Solution",
    subtitle: "One platform — storefront, checkout, catalog, and merchant ops.",
    pillars: [
      {
        title: "Storefront",
        desc: "Drag-and-drop builder, themes, sections, custom domain, SEO-ready pages.",
      },
      {
        title: "Commerce",
        desc: "Physical + digital in one catalog, variants, global shipping zones, Stripe checkout.",
      },
      {
        title: "Growth & payouts",
        desc: "Creator affiliates, MoR-ready balance, analytics — built in, not bolted on.",
      },
    ],
  },
  {
    kind: "flow",
    title: "How it works",
    subtitle: "Merchant of Record model simplifies global selling for lean teams.",
  },
  {
    kind: "content",
    title: "Why Now",
    subtitle: "Category timing: creators globalize, payments API-first, low-code is default.",
    bullets: [
      "Creator economy & micro-brands sell beyond local marketplaces — cross-border by default.",
      "Stripe & modern PSPs make robust checkout achievable for small engineering teams.",
      "Sellers expect <15 min to first product; incumbents optimize for scale, not speed.",
    ],
  },
  {
    kind: "funnel",
    title: "Market",
    subtitle: "Creator + SMB commerce software at the intersection of Shopify and Gumroad.",
    levels: [
      {
        label: "TAM",
        value: "$180B+",
        note: "Global SMB & creator commerce software + payments attach (illustrative)",
      },
      {
        label: "SAM",
        value: "$48B",
        note: "Digital-first & hybrid merchants selling internationally (illustrative)",
      },
      {
        label: "SOM",
        value: "$120M",
        note: "36-mo target: 25k paid merchants × ~$400 blended ARPU (model)",
      },
    ],
  },
  { kind: "pricing", title: "Business Model", subtitle: "Subscription + take rate — upgrade path from free to Pro." },
  {
    kind: "unit-economics",
    title: "Unit Economics",
    subtitle: "Revenue stacks: SaaS subscription + platform fee on GMV.",
    blended: "~3.8% blended take rate at 60% Starter / 30% Growth / 10% Pro mix",
    rows: [
      { label: "Starter ARPU", value: "~$45/mo", hint: "5% fee on ~$900 GMV" },
      { label: "Growth ARPU", value: "~$58/mo", hint: "$29 sub + 4% on ~$725 GMV" },
      { label: "Pro ARPU", value: "~$115/mo", hint: "$79 sub + 3% on ~$1.2k GMV" },
      { label: "Target LTV:CAC", value: "3:1+", hint: "Validate in first 2 GTM cohorts" },
    ],
  },
  {
    kind: "metrics",
    title: "Traction",
    subtitle: "Live product — early merchant signal (update with your latest numbers).",
    badges: ["Stripe", "50+ countries", "MoR-ready"],
    metrics: [
      { label: "Store setup", value: "<2 min", note: "Median time to first publish" },
      { label: "Countries", value: "50+", note: "Shipping & checkout coverage" },
      { label: "GMV (30d)", value: "TBD", note: "Replace with live dashboard figure" },
      { label: "Paying merchants", value: "TBD", note: "Replace when ready for investors" },
    ],
  },
  {
    kind: "content",
    title: "Go-To-Market",
    subtitle: "Wedge: fastest path from signup to global first sale.",
    bullets: [
      "ICP: creators & D2C brands ($10k–$500k GMV/yr) selling physical + digital globally.",
      "PLG: free Starter → in-product prompts to Growth (domain, affiliates) → Pro (team, API).",
      "Channels: SEO/content, creator communities, partnerships, paid after CAC baseline.",
    ],
  },
  { kind: "matrix", title: "Competition", subtitle: "We win on speed, unified stack, and global-first defaults." },
  {
    kind: "team",
    title: "Team",
    subtitle: "Founders with commerce, product, and payments execution.",
    members: [
      { name: "Founder 1", role: "CEO", bio: "Background in product & GTM — TBD" },
      { name: "Founder 2", role: "CTO", bio: "Background in payments & platform eng — TBD" },
      { name: "Hire #1", role: "Growth", bio: "Creator-led distribution — planned M6" },
    ],
  },
  {
    kind: "content",
    title: "Financial Plan",
    subtitle: "18-month path to Series A metrics.",
    bullets: [
      "M12: 500+ paying merchants, $25k+ MRR, NDR >100% on Growth/Pro cohort.",
      "M18: $75k MRR run-rate, churn <4% monthly on paid plans.",
      "Burn & runway tied to fundraise — detail in data room.",
    ],
  },
  {
    kind: "fundraise",
    title: "Fundraise",
    subtitle: "Seed to accelerate product depth and repeatable GTM.",
    amount: "$750K",
    instrument: "SAFE · $8M cap",
    runway: "18 months",
    allocation: [
      { pct: 45, label: "Engineering" },
      { pct: 35, label: "GTM & growth" },
      { pct: 12, label: "Ops & compliance" },
      { pct: 8, label: "Buffer" },
    ],
    milestone: "Series A: $75k MRR, 500+ paid merchants, proven unit economics",
  },
  {
    kind: "vision",
    title: "Vision",
    subtitle: "The default global store OS for the next generation of merchants.",
    headline: "In 3 years, Tescommerce powers 50k+ global micro-brands.",
    bullets: [
      "Full-stack commerce without Shopify complexity or Gumroad limitations.",
      "Embedded finance: payouts, tax, affiliates native to every store.",
      "API ecosystem for agencies and vertical SaaS partners.",
    ],
    contact: `${CONTACT_EMAIL} · ${CONTACT_WEB}`,
  },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    fee: "5% platform fee",
    highlight: false,
    features: [
      "Up to 50 products",
      "Subdomain storefront",
      "Site builder & themes",
      "Physical + digital catalog",
      "Stripe checkout",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$29",
    fee: "4% platform fee",
    highlight: true,
    features: [
      "Unlimited products",
      "Custom domain",
      "Creator affiliate program",
      "Global shipping zones",
      "Stripe Tax ready",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    price: "$79",
    fee: "3% platform fee",
    highlight: false,
    features: [
      "Everything in Growth",
      "Staff accounts",
      "REST API access",
      "Advanced analytics",
      "Platform MoR payouts",
      "Dedicated onboarding",
    ],
  },
] as const;

const COMPETITORS = ["Shopify", "Sellfy", "Gumroad", "Tescommerce"] as const;
const MATRIX_ROWS: { feature: string; values: ("yes" | "partial" | "no")[] }[] = [
  { feature: "Physical + digital native", values: ["partial", "partial", "partial", "yes"] },
  { feature: "Time to first sale <15 min", values: ["partial", "yes", "yes", "yes"] },
  { feature: "Full storefront builder", values: ["yes", "partial", "no", "yes"] },
  { feature: "Global / MoR positioning", values: ["partial", "partial", "no", "yes"] },
  { feature: "Built-in creator affiliates", values: ["no", "no", "no", "yes"] },
  { feature: "Transparent SMB pricing", values: ["partial", "yes", "yes", "yes"] },
];

const slideBase: CSSProperties = {
  width: SLIDE_WIDTH_PX,
  height: SLIDE_HEIGHT_PX,
  position: "relative",
  overflow: "hidden",
  boxSizing: "border-box",
  fontFamily: FONT,
  color: C.ink,
  background: C.paper,
  WebkitFontSmoothing: "antialiased",
};

function SlideDecor({ variant, uid }: { variant: "dark" | "light"; uid: string }) {
  const stroke = variant === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
  const glow = variant === "dark" ? C.accentGlow : "rgba(16, 185, 129, 0.08)";
  const gridId = `grid-${uid}`;
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <defs>
        <pattern id={gridId} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      {variant === "dark" ? (
        <>
          <circle cx="980" cy="120" r="200" fill={glow} />
          <circle cx="80" cy="680" r="160" fill={glow} />
        </>
      ) : null}
    </svg>
  );
}

function SlideFooter({ page, dark, total }: { page: number; dark?: boolean; total: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        borderTop: `1px solid ${dark ? "rgba(255,255,255,0.08)" : C.line}`,
        fontSize: 10,
        color: dark ? "rgba(255,255,255,0.4)" : C.slate,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
        Tescommerce
      </span>
      <span>
        Confidential · {page} / {total}
      </span>
    </div>
  );
}

function SlideRail({
  page,
  title,
  subtitle,
  children,
  total,
}: {
  page: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  total: number;
}) {
  return (
    <div style={slideBase} data-pitch-slide>
      <SlideDecor variant="light" uid={`p${page}`} />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          height: "100%",
          paddingBottom: 48,
        }}
      >
        <div
          style={{
            background: C.ink,
            color: "#fff",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: C.accent,
              }}
            >
              {String(page).padStart(2, "0")}
            </span>
            <h2
              style={{
                margin: "12px 0 0",
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {title}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.45)" }}>
            {subtitle}
          </p>
        </div>
        <div style={{ padding: "32px 40px 16px", overflow: "hidden" }}>{children}</div>
      </div>
      <SlideFooter page={page} total={total} />
    </div>
  );
}

/** HTML-only icons — html2canvas renders SVG paths unreliably in PDF. */
const matrixIconBox: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  fontFamily: FONT,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: "26px",
  textAlign: "center",
  boxSizing: "border-box",
};

function MatrixCellIcon({ level }: { level: "yes" | "partial" | "no" }) {
  if (level === "yes") {
    return <span style={{ ...matrixIconBox, background: C.accent, color: "#ffffff" }}>✓</span>;
  }
  if (level === "partial") {
    return (
      <span style={{ ...matrixIconBox, background: "#e2e8f0", color: "#475569", fontSize: 18 }}>
        −
      </span>
    );
  }
  return (
    <span style={{ ...matrixIconBox, background: "#f1f5f9", color: "#94a3b8", border: `1px solid ${C.line}` }}>
      ×
    </span>
  );
}

function FeatureCheck() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: C.accent,
        color: "#ffffff",
        fontSize: 10,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
        lineHeight: 1,
      }}
    >
      ✓
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((line, i) => (
        <div
          key={line}
          style={{
            display: "flex",
            gap: 14,
            padding: "14px 16px",
            borderRadius: 10,
            background: C.paperAlt,
            border: `1px solid ${C.line}`,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: C.ink,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: 15, lineHeight: 1.45, color: C.inkSoft, paddingTop: 2 }}>{line}</span>
        </div>
      ))}
    </div>
  );
}

function PricingCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, height: "100%" }}>
      {PRICING_TIERS.map((tier) => (
        <div
          key={tier.name}
          style={{
            padding: "16px 14px",
            borderRadius: 12,
            border: tier.highlight ? `2px solid ${C.accent}` : `1px solid ${C.line}`,
            background: tier.highlight ? C.accentMuted : C.paperAlt,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: C.slate, letterSpacing: "0.08em" }}>
            {tier.name.toUpperCase()}
          </span>
          <span style={{ fontSize: 28, fontWeight: 800, marginTop: 4, letterSpacing: "-0.02em" }}>
            {tier.price}
            {tier.price !== "Free" ? (
              <span style={{ fontSize: 12, fontWeight: 500, color: C.slate }}>/mo</span>
            ) : null}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: tier.highlight ? C.accentDark : C.slate, margin: "4px 0 8px" }}>
            {tier.fee}
          </span>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            {tier.features.map((f) => (
              <li key={f} style={{ fontSize: 11, color: C.inkSoft, display: "flex", gap: 6 }}>
                <FeatureCheck /> {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PitchSlideView({
  slide,
  page,
  logoSrc = "/tescommerce-logo.png",
  total = PITCH_SLIDES.length,
}: {
  slide: PitchSlide;
  page: number;
  logoSrc?: string;
  total?: number;
}) {
  if (slide.kind === "title") {
    return (
      <div style={{ ...slideBase, background: C.ink, color: "#fff" }} data-pitch-slide data-pitch-dark="true">
        <SlideDecor variant="dark" uid={`t${page}`} />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            padding: "52px 60px 56px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <img src={logoSrc} alt="" width={48} height={48} style={{ borderRadius: 12 }} crossOrigin="anonymous" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: C.accent }}>
              SEED · 2026
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 58, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            {slide.title}
          </h1>
          <p style={{ margin: "16px 0 0", fontSize: 26, color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>
            {slide.tagline}
          </p>
          <div style={{ marginTop: 32, width: 56, height: 3, background: C.accent, borderRadius: 2 }} />
          <p style={{ margin: "28px 0 0", fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.5)", maxWidth: 580 }}>
            {slide.description}
          </p>
          <div
            style={{
              marginTop: "auto",
              paddingTop: 28,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: C.accent }}>{CONTACT_EMAIL}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>https://{CONTACT_WEB}/</span>
          </div>
        </div>
        <SlideFooter page={page} dark total={total} />
      </div>
    );
  }

  if (slide.kind === "vision") {
    return (
      <div style={{ ...slideBase, background: C.ink, color: "#fff" }} data-pitch-slide data-pitch-dark="true">
        <SlideDecor variant="dark" uid={`v${page}`} />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            padding: "44px 60px 56px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.accent }}>
            {String(page).padStart(2, "0")} · VISION
          </span>
          <h2 style={{ margin: "10px 0 0", fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", maxWidth: 820, lineHeight: 1.15 }}>
            {slide.headline}
          </h2>
          <p style={{ margin: "10px 0 20px", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{slide.subtitle}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720, flex: "0 0 auto" }}>
            {slide.bullets.map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                <span style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>›</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "auto",
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: C.accent }}>{CONTACT_EMAIL}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{CONTACT_WEB}</span>
          </div>
        </div>
        <SlideFooter page={page} dark total={total} />
      </div>
    );
  }

  if (slide.kind === "flow") {
    const steps = [
      { label: "Merchant", sub: "Creates store & catalog", color: C.violet },
      { label: "Tescommerce", sub: "MoR · checkout · ops", color: C.accent },
      { label: "Stripe", sub: "Payments & tax rails", color: "#635bff" },
      { label: "Buyer", sub: "Global checkout", color: C.inkSoft },
    ];
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: "100%", paddingTop: 20 }}>
          {steps.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 200,
                  padding: "20px 16px",
                  borderRadius: 12,
                  background: C.paperAlt,
                  border: `1px solid ${C.line}`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: s.color,
                    margin: "0 auto 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {s.label[0]}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>{s.sub}</div>
              </div>
              {i < steps.length - 1 ? (
                <span style={{ fontSize: 22, color: C.accent, fontWeight: 700 }}>→</span>
              ) : null}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            borderRadius: 10,
            background: C.accentMuted,
            border: `1px solid ${C.accent}`,
            fontSize: 12,
            color: C.accentDark,
            textAlign: "center",
          }}
        >
          Affiliate flow: Creator link → attributed order → commission from merchant net (off-platform payout v1)
        </div>
      </SlideRail>
    );
  }

  if (slide.kind === "pillars") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, height: "100%", alignContent: "center" }}>
          {slide.pillars.map((p, i) => (
            <div
              key={p.title}
              style={{
                padding: "28px 22px",
                borderRadius: 14,
                background: i === 1 ? C.ink : C.paperAlt,
                border: `1px solid ${i === 1 ? C.ink : C.line}`,
                color: i === 1 ? "#fff" : C.ink,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  background: i === 1 ? C.accent : C.ink,
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: i === 1 ? "rgba(255,255,255,0.65)" : C.slate }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </SlideRail>
    );
  }

  if (slide.kind === "funnel") {
    const widths = ["100%", "72%", "44%"];
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "center", height: "100%" }}>
          {slide.levels.map((lv, i) => (
            <div key={lv.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: "0.06em" }}>
                {lv.label}
              </div>
              <div style={{ flex: 1, maxWidth: widths[i] }}>
                <div
                  style={{
                    padding: "18px 22px",
                    borderRadius: 10,
                    background: i === 0 ? C.ink : i === 1 ? C.inkSoft : C.accentMuted,
                    border: `1px solid ${i === 2 ? C.accent : "transparent"}`,
                    color: i < 2 ? "#fff" : C.ink,
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{lv.value}</div>
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>{lv.note}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SlideRail>
    );
  }

  if (slide.kind === "metrics") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
          {slide.badges ? (
            <div style={{ display: "flex", gap: 8 }}>
              {slide.badges.map((b) => (
                <span
                  key={b}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: C.ink,
                    color: "#fff",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
            {slide.metrics.map((m) => (
              <div
                key={m.label}
                style={{
                  padding: "24px 22px",
                  borderRadius: 12,
                  background: C.paperAlt,
                  border: `1px solid ${C.line}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 44, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", marginTop: 6 }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </SlideRail>
    );
  }

  if (slide.kind === "matrix") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            position: "relative",
            zIndex: 2,
            background: C.paper,
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", color: C.slate, fontWeight: 600 }} />
              {COMPETITORS.map((c) => (
                <th
                  key={c}
                  style={{
                    padding: "8px 6px",
                    fontWeight: 700,
                    color: c === "Tescommerce" ? C.accentDark : C.ink,
                    background: c === "Tescommerce" ? C.accentMuted : "transparent",
                    borderRadius: 6,
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map((row) => (
              <tr key={row.feature} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "10px", color: C.inkSoft, fontWeight: 500 }}>{row.feature}</td>
                {row.values.map((v, i) => (
                  <td key={i} style={{ textAlign: "center", padding: "10px 8px", width: 88, verticalAlign: "middle" }}>
                    <MatrixCellIcon level={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </SlideRail>
    );
  }

  if (slide.kind === "unit-economics") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {slide.rows.map((r) => (
            <div
              key={r.label}
              style={{
                padding: "16px 18px",
                borderRadius: 10,
                background: C.paperAlt,
                border: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontSize: 11, color: C.slate, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{r.value}</div>
              {r.hint ? <div style={{ fontSize: 11, color: C.mist, marginTop: 4 }}>{r.hint}</div> : null}
            </div>
          ))}
        </div>
        {slide.blended ? (
          <div
            style={{
              marginTop: 16,
              padding: "14px 18px",
              borderRadius: 10,
              background: C.ink,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {slide.blended}
          </div>
        ) : null}
      </SlideRail>
    );
  }

  if (slide.kind === "fundraise") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, height: "100%" }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em", color: C.ink }}>{slide.amount}</div>
            <div style={{ fontSize: 16, color: C.accentDark, fontWeight: 600, marginTop: 4 }}>{slide.instrument}</div>
            <div style={{ fontSize: 14, color: C.slate, marginTop: 8 }}>{slide.runway} runway</div>
            <div
              style={{
                marginTop: 20,
                padding: "14px 16px",
                borderRadius: 10,
                background: C.accentMuted,
                border: `1px solid ${C.accent}`,
                fontSize: 12,
                lineHeight: 1.5,
                color: C.inkSoft,
              }}
            >
              <strong style={{ color: C.accentDark }}>Milestone:</strong> {slide.milestone}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, marginBottom: 10, letterSpacing: "0.06em" }}>
              USE OF FUNDS
            </div>
            {slide.allocation.map((a) => (
              <div key={a.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{a.label}</span>
                  <span style={{ fontWeight: 700 }}>{a.pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: C.line, overflow: "hidden" }}>
                  <div style={{ width: `${a.pct}%`, height: "100%", background: C.accent, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideRail>
    );
  }

  if (slide.kind === "team") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {slide.members.map((m) => (
            <div
              key={m.name}
              style={{
                padding: "22px 18px",
                borderRadius: 12,
                background: C.paperAlt,
                border: `1px solid ${C.line}`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: C.ink,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                {m.name[0]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: C.accentDark, fontWeight: 600, marginTop: 2 }}>{m.role}</div>
              <div style={{ fontSize: 12, color: C.slate, marginTop: 8, lineHeight: 1.45 }}>{m.bio}</div>
            </div>
          ))}
        </div>
      </SlideRail>
    );
  }

  if (slide.kind === "pricing") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        <PricingCards />
      </SlideRail>
    );
  }

  if (slide.kind === "content") {
    return (
      <SlideRail page={page} title={slide.title} subtitle={slide.subtitle} total={total}>
        {slide.callout ? (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: C.ink,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 14,
              lineHeight: 1.45,
            }}
          >
            {slide.callout}
          </div>
        ) : null}
        <BulletList items={slide.bullets} />
      </SlideRail>
    );
  }

  return null;
}

function sanitizeCloneForCanvas(root: HTMLElement) {
  const win = root.ownerDocument.defaultView;
  if (!win) return;
  const props: [string, string][] = [
    ["color", C.ink],
    ["background-color", "transparent"],
    ["border-color", C.line],
  ];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (!(el instanceof HTMLElement)) continue;
    const cs = win.getComputedStyle(el);
    for (const [prop, fallback] of props) {
      if (/oklch|oklab|color\(/i.test(cs.getPropertyValue(prop))) {
        el.style.setProperty(prop, fallback, "important");
      }
    }
  }
}

async function exportSlidesToPdf(container: HTMLElement) {
  const nodes = container.querySelectorAll<HTMLElement>("[data-pitch-slide]");
  if (!nodes.length) throw new Error("No slides found");

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((r) => setTimeout(r, 150));

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [SLIDE_WIDTH_PX, SLIDE_HEIGHT_PX],
    compress: true,
  });

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const isDark = node.getAttribute("data-pitch-dark") === "true";
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      foreignObjectRendering: false,
      backgroundColor: isDark ? C.ink : C.paper,
      logging: false,
      width: SLIDE_WIDTH_PX,
      height: SLIDE_HEIGHT_PX,
      windowWidth: SLIDE_WIDTH_PX,
      windowHeight: SLIDE_HEIGHT_PX,
      onclone: (_d, cloned) => sanitizeCloneForCanvas(cloned),
    });
    if (i > 0) pdf.addPage([SLIDE_WIDTH_PX, SLIDE_HEIGHT_PX], "landscape");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, SLIDE_WIDTH_PX, SLIDE_HEIGHT_PX);
  }
  pdf.save("Tescommerce-Seed-Deck.pdf");
}

export default function TescommercePitchDeck() {
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const total = PITCH_SLIDES.length;
  const slide = PITCH_SLIDES[index]!;

  const go = useCallback((d: number) => setIndex((i) => Math.min(total - 1, Math.max(0, i + d))), [total]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  const shell: CSSProperties = {
    minHeight: "100vh",
    background: "#070b14",
    color: "#e2e8f0",
    fontFamily: FONT,
  };

  return (
    <div style={shell}>
      <header
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "18px 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: C.accent }}>TESCOMMERCE</div>
          <div style={{ fontSize: 12, color: C.mist, marginTop: 2 }}>
            {slide.kind !== "title" && "title" in slide ? slide.title : "Intro"} · {index + 1}/{total}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, maxWidth: 360, flexWrap: "wrap", justifyContent: "center" }}>
          {PITCH_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 20 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                padding: 0,
                background: i === index ? C.accent : "rgba(255,255,255,0.15)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => go(-1)} disabled={index === 0}>
            Prev
          </Btn>
          <Btn onClick={() => go(1)} disabled={index === total - 1}>
            Next
          </Btn>
          <Btn
            primary
            disabled={exporting}
            onClick={async () => {
              if (!exportRef.current) return;
              setExporting(true);
              setError(null);
              try {
                if (document.fonts?.ready) await document.fonts.ready;
                await exportSlidesToPdf(exportRef.current);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Export failed");
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "…" : "PDF"}
          </Btn>
        </div>
      </header>

      {error ? (
        <div style={{ maxWidth: 1280, margin: "12px auto", padding: 12, background: "#7f1d1d", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <main style={{ display: "flex", justifyContent: "center", padding: "20px 16px 40px" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.55)" }}>
          <div style={{ transform: "scale(min(1, calc((100vw - 40px) / 1123)))", transformOrigin: "top center" }}>
            <PitchSlideView slide={slide} page={index + 1} total={total} />
          </div>
        </div>
      </main>

      <div
        ref={exportRef}
        aria-hidden
        style={{ position: "fixed", left: -12000, top: 0, fontFamily: FONT, color: C.ink, background: C.paper }}
      >
        {PITCH_SLIDES.map((s, i) => (
          <PitchSlideView key={i} slide={s} page={i + 1} total={total} />
        ))}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 8,
        border: primary ? "none" : "1px solid rgba(255,255,255,0.1)",
        background: primary ? C.accent : "rgba(255,255,255,0.06)",
        color: disabled ? "#64748b" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: FONT,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
