import { PLATFORM_URL } from "../env.js";
import type { EmailTemplateRow } from "./email-templates.js";
import { renderTemplate } from "./email-templates.js";

/** Template variables for outreach HTML (images + links). */
export function buildOutreachTemplateVars(name?: string) {
  const brand = process.env.PLATFORM_BRAND_NAME?.trim() || "Tescommerce";
  const base = PLATFORM_URL.replace(/\/$/, "");
  const signup = `${base}/signup`;
  const logo =
    process.env.OUTREACH_LOGO_URL?.trim() ||
    "https://placehold.co/200x48/0f172a/ffffff/png?text=Tescommerce";

  return {
    name: name?.trim() || "there",
    platformName: brand,
    signupUrl: signup,
    logoUrl: logo,
    year: String(new Date().getFullYear()),
  };
}

/** Keys available on the Outreach page (prefix + legacy). */
export const OUTREACH_TEMPLATE_PREFIX = "outreach_";

export const DEFAULT_OUTREACH_TEMPLATE_KEY = "outreach_welcome";

const LEGACY_OUTREACH_KEYS = ["merchant_outreach"] as const;

export function isOutreachTemplateKey(key: string): boolean {
  return key.startsWith(OUTREACH_TEMPLATE_PREFIX) || LEGACY_OUTREACH_KEYS.includes(key as (typeof LEGACY_OUTREACH_KEYS)[number]);
}

export function filterOutreachTemplates(templates: EmailTemplateRow[]): EmailTemplateRow[] {
  return templates.filter((t) => isOutreachTemplateKey(t.key));
}

export function sortOutreachTemplates(templates: EmailTemplateRow[]): EmailTemplateRow[] {
  const order = [
    "outreach_welcome",
    "outreach_short",
    "outreach_creator",
    "outreach_brand",
    "merchant_outreach",
  ];
  return [...templates].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    if (ia === -1 && ib === -1) return a.label.localeCompare(b.label);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function renderOutreachPreview(
  template: EmailTemplateRow,
  vars: Record<string, string>
) {
  return {
    key: template.key,
    label: template.label,
    subject: renderTemplate(template.subject, vars),
    html: renderTemplate(template.html, vars),
  };
}
