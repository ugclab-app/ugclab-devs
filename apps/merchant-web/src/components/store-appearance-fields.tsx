import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { HomeSection, StoreTheme } from "@ugclab/tenant/store-theme";
import { ImageUrlField } from "@/components/image-url-field";

const FONT_OPTIONS = [
  { value: '"Plus Jakarta Sans", system-ui, sans-serif', label: "Plus Jakarta Sans" },
  { value: "system-ui, sans-serif", label: "System UI" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: '"DM Sans", system-ui, sans-serif', label: "DM Sans" },
];

export function StoreAppearanceFields({ theme }: { theme: StoreTheme }) {
  const { data } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.collections(),
  });
  const collections = (data?.collections ?? []) as { slug: string; title: string }[];
  const sections = theme.homeSections ?? ["hero", "products"];

  return (
    <section className="admin-card space-y-5 p-6">
      <div>
        <h3 className="font-semibold text-zinc-900">Appearance</h3>
        <p className="mt-1 text-xs text-zinc-500">Fonts, colors, favicon, and brand assets.</p>
      </div>

      <ImageUrlField
        name="faviconUrl"
        label="Favicon (browser tab icon)"
        defaultValue={theme.faviconUrl ?? ""}
        placeholder="https://…/favicon.png"
      />
      <ImageUrlField
        name="heroBannerUrl"
        label="Default hero banner image"
        defaultValue={theme.heroBannerUrl ?? ""}
      />

      <Field label="Hero title (optional)">
        <input
          name="heroTitle"
          defaultValue={theme.heroTitle ?? ""}
          placeholder="Uses store name if empty"
          className="ugclab-input"
        />
      </Field>
      <Field label="Hero subtitle">
        <textarea
          name="heroSubtitle"
          defaultValue={theme.heroSubtitle ?? ""}
          rows={2}
          className="ugclab-input"
        />
      </Field>
      <Field label="Featured collection (hero links)">
        <select
          name="heroCollectionSlug"
          defaultValue={theme.heroCollectionSlug ?? ""}
          className="ugclab-select"
        >
          <option value="">All collections (default)</option>
          {collections.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Homepage section order (legacy checkboxes)">
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="section_hero" defaultChecked={sections.includes("hero")} />
            Hero banner
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="section_products"
              defaultChecked={sections.includes("products")}
            />
            Product catalog
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="section_new_arrivals"
              defaultChecked={sections.includes("new_arrivals")}
            />
            New arrivals
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="section_sale" defaultChecked={sections.includes("sale")} />
            On sale
          </label>
        </div>
      </Field>

      <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
        <Field label="Secondary / hover color">
          <input
            name="secondaryColor"
            type="color"
            defaultValue={theme.secondaryColor ?? "#6d28d9"}
            className="h-10 w-14"
          />
        </Field>
        <Field label="Max content width (px)">
          <input
            name="containerMaxPx"
            type="number"
            min={960}
            max={1920}
            step={40}
            defaultValue={theme.containerMaxPx ?? 1440}
            className="ugclab-input"
          />
        </Field>
        <Field label="Font family">
          <select name="fontFamily" defaultValue={theme.fontFamily} className="ugclab-select">
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Button style">
          <select
            name="buttonStyle"
            defaultValue={theme.buttonStyle ?? "rounded"}
            className="ugclab-select"
          >
            <option value="rounded">Rounded</option>
            <option value="pill">Pill</option>
            <option value="square">Square</option>
          </select>
        </Field>
      </div>
    </section>
  );
}

export function StoreAnnouncementFields({ theme }: { theme: StoreTheme }) {
  return (
    <section className="admin-card space-y-4 p-6">
      <div>
        <h3 className="font-semibold">Announcement bar</h3>
        <p className="mt-1 text-xs text-zinc-500">Top banner on your storefront (above promo banners).</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="announcementEnabled"
          defaultChecked={theme.announcementEnabled}
        />
        Show custom announcement
      </label>
      <Field label="Message">
        <input
          name="announcementText"
          defaultValue={theme.announcementText ?? ""}
          placeholder="Free shipping this weekend!"
          className="ugclab-input"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bar color">
          <input
            name="announcementColor"
            type="color"
            defaultValue={theme.announcementColor ?? "#7c3aed"}
            className="h-10 w-full"
          />
        </Field>
        <Field label="Start (optional)">
          <input
            name="announcementStartsAt"
            type="datetime-local"
            defaultValue={toLocalDatetime(theme.announcementStartsAt)}
            className="ugclab-input"
          />
        </Field>
        <Field label="End (optional)">
          <input
            name="announcementEndsAt"
            type="datetime-local"
            defaultValue={toLocalDatetime(theme.announcementEndsAt)}
            className="ugclab-input"
          />
        </Field>
      </div>
    </section>
  );
}

export function StoreSocialFields({ theme }: { theme: StoreTheme }) {
  const s = theme.socialLinks ?? {};
  return (
    <section className="admin-card space-y-4 p-6">
      <h3 className="font-semibold">Social links (footer)</h3>
      <Field label="Instagram URL">
        <input
          name="socialInstagram"
          type="url"
          defaultValue={s.instagram ?? ""}
          placeholder="https://instagram.com/…"
          className="ugclab-input"
        />
      </Field>
      <Field label="Telegram URL">
        <input
          name="socialTelegram"
          type="url"
          defaultValue={s.telegram ?? ""}
          placeholder="https://t.me/…"
          className="ugclab-input"
        />
      </Field>
      <Field label="TikTok URL">
        <input
          name="socialTiktok"
          type="url"
          defaultValue={s.tiktok ?? ""}
          placeholder="https://tiktok.com/@…"
          className="ugclab-input"
        />
      </Field>
    </section>
  );
}

export function StoreAdvancedFields({ theme }: { theme: StoreTheme }) {
  return (
    <section className="admin-card space-y-4 p-6">
      <h3 className="font-semibold">Advanced</h3>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="storeClosed" defaultChecked={theme.storeClosed} />
        Store closed (landing only — hide shop & checkout)
      </label>
      <Field label="Closed message">
        <textarea
          name="storeClosedMessage"
          rows={2}
          defaultValue={theme.storeClosedMessage ?? ""}
          placeholder="We're opening soon. Follow us for updates!"
          className="ugclab-input"
        />
      </Field>
      <Field label="Cookie consent banner">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="cookieConsentEnabled"
            defaultChecked={theme.cookieConsentEnabled !== false}
            value="on"
          />
          Show EU-style cookie banner on storefront
        </label>
        <input
          name="cookieConsentMessage"
          defaultValue={theme.cookieConsentMessage ?? ""}
          placeholder="We use cookies for checkout and analytics…"
          className="ugclab-input mt-2 text-sm"
        />
      </Field>

      <Field label="Custom CSS (optional)">
        <textarea
          name="customCss"
          rows={8}
          defaultValue={theme.customCss ?? ""}
          placeholder=".store-btn-primary { letter-spacing: 0.05em; }"
          className="ugclab-input font-mono text-xs"
        />
      </Field>
    </section>
  );
}

export function StoreCheckoutThemeFields({ theme }: { theme: StoreTheme }) {
  return (
    <section className="admin-card space-y-4 p-6">
      <h3 className="font-semibold">Checkout display</h3>
      <Field label="Pay button text">
        <input
          name="checkoutButtonText"
          defaultValue={theme.checkoutButtonText ?? ""}
          placeholder="Pay with card"
          className="ugclab-input"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="checkoutRequireName"
          defaultChecked={theme.checkoutRequireName}
        />
        Require full name
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="checkoutRequirePhone"
          defaultChecked={theme.checkoutRequirePhone}
        />
        Require phone number
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="trustBadgesEnabled"
          defaultChecked={theme.trustBadgesEnabled !== false}
        />
        Show secure payment badges (cart, checkout, product)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="stripeTaxEnabled" defaultChecked={theme.stripeTaxEnabled} />
        Stripe Tax on Checkout (enable Stripe Tax in Dashboard)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="stripeLinkEnabled"
          defaultChecked={theme.stripeLinkEnabled !== false}
          value="on"
        />
        Stripe Link — fast checkout for buyers with a{" "}
        <a
          href="https://link.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-violet-600 underline"
        >
          Link
        </a>{" "}
        account (enable in Stripe Dashboard → Payment methods)
      </label>
      <Field label="Shipping label at checkout">
        <input
          name="shippingCarrierLabel"
          defaultValue={theme.shippingCarrierLabel ?? ""}
          placeholder="Standard shipping (3–5 business days)"
          className="ugclab-input"
        />
      </Field>
    </section>
  );
}

function toLocalDatetime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// Re-export for backwards compatibility
export { buildThemeFromForm } from "@/lib/store-theme-form";
