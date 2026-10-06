import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { parseStoreTheme } from "@ugclab/tenant/store-theme";
import { readThemeDraftMeta } from "./theme-meta.js";

const AB_COOKIE = "theme_ab";

type SettingsTheme = {
  theme?: unknown;
  themeDraft?: unknown;
};

/** Live storefront theme JSON (A/B test aware). Skips experiment when preview=1. */
export function resolveStorefrontThemeRaw(
  c: Context,
  settings: SettingsTheme | null | undefined,
  preview: boolean
): unknown {
  if (preview && settings?.themeDraft) {
    return settings.themeDraft;
  }
  const published = settings?.theme;
  const draft = settings?.themeDraft;
  const { experiment } = readThemeDraftMeta(draft);
  if (!experiment.enabled || !published) {
    return published ?? draft;
  }

  let variant = getCookie(c, AB_COOKIE);
  if (variant !== "A" && variant !== "B") {
    const pct = experiment.trafficBPercent ?? 50;
    variant = Math.random() * 100 < pct ? "B" : "A";
    setCookie(c, AB_COOKIE, variant, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "Lax",
      httpOnly: true,
    });
  }

  if (variant === "B") {
    if (experiment.variantBTheme) {
      return experiment.variantBTheme;
    }
    if (draft) return draft;
  }
  return published;
}

export function themesDiffer(published: unknown, draft: unknown): boolean {
  if (!draft) return false;
  try {
    const a = JSON.stringify(parseStoreTheme(published ?? {}));
    const b = JSON.stringify(parseStoreTheme(draft));
    return a !== b;
  } catch {
    return String(published) !== String(draft);
  }
}
