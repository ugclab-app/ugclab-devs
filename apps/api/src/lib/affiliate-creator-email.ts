import { AffiliateCommissionStatus, prisma } from "@ugclab/database";
import { getAffiliateProgramSettings } from "./affiliate.js";
import { getStorefrontUrl } from "./storefront.js";
import { sendStoreEmail } from "./tenant-email.js";

export type AffiliateCreatorEmailTemplateId =
  | "welcome"
  | "referral_link"
  | "commission_owed"
  | "thank_you";

type TemplateDef = {
  id: AffiliateCreatorEmailTemplateId;
  label: string;
  description: string;
  subject: string;
  html: string;
};

export const AFFILIATE_CREATOR_EMAIL_TEMPLATES: TemplateDef[] = [
  {
    id: "welcome",
    label: "Welcome to the program",
    description: "Introduce the creator and share their referral link.",
    subject: "You're part of {{store_name}}'s creator program",
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#18181b;max-width:560px">
<p>Hi {{creator_name}},</p>
<p>Thanks for partnering with <strong>{{store_name}}</strong>. You earn <strong>{{commission_percent}}</strong> on sales from your link.</p>
<p><a href="{{referral_link}}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open your store link</a></p>
<p style="color:#71717a;font-size:13px">Your link: {{referral_link}}</p>
<p>Questions? Reply to this email.</p>
<p>— {{store_name}}</p>
</body></html>`,
  },
  {
    id: "referral_link",
    label: "Referral link reminder",
    description: "Send the tracking link again.",
    subject: "Your {{store_name}} referral link",
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#18181b;max-width:560px">
<p>Hi {{creator_name}},</p>
<p>Here is your referral link for <strong>{{store_name}}</strong> (commission: {{commission_percent}}):</p>
<p><a href="{{referral_link}}" style="word-break:break-all">{{referral_link}}</a></p>
<p>Share it on social, in your bio, or with your audience.</p>
<p>— {{store_name}}</p>
</body></html>`,
  },
  {
    id: "commission_owed",
    label: "Commission balance",
    description: "Notify about unpaid commission (you pay them directly).",
    subject: "Commission update from {{store_name}}",
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#18181b;max-width:560px">
<p>Hi {{creator_name}},</p>
<p>Your current approved commission balance at <strong>{{store_name}}</strong> is <strong>{{owed_amount}}</strong> ({{orders_count}} attributed order(s)).</p>
<p>We will pay you directly outside the platform. If you have questions about payout timing or method, reply to this email.</p>
<p>— {{store_name}}</p>
</body></html>`,
  },
  {
    id: "thank_you",
    label: "Thank you",
    description: "Short thank-you note.",
    subject: "Thank you from {{store_name}}",
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#18181b;max-width:560px">
<p>Hi {{creator_name}},</p>
<p>Thank you for promoting <strong>{{store_name}}</strong>. We appreciate your work.</p>
<p>Your referral link: <a href="{{referral_link}}">{{referral_link}}</a></p>
<p>— {{store_name}}</p>
</body></html>`,
  },
];

function formatMoneyEmail(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export function renderAffiliateEmailTemplate(
  template: string,
  vars: Record<string, string>
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function plainTextFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function listAffiliateCreatorEmailTemplates() {
  return AFFILIATE_CREATOR_EMAIL_TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    subject: t.subject,
    html: t.html,
  }));
}

export function isEmailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
}

export async function buildAffiliateCreatorEmailVars(
  tenantId: string,
  partnerId: string
) {
  const [tenant, partner, settings, owedAgg, orderCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, settings: { select: { currency: true } } },
    }),
    prisma.affiliatePartner.findFirst({
      where: { id: partnerId, tenantId },
    }),
    getAffiliateProgramSettings(tenantId),
    prisma.affiliateCommission.aggregate({
      where: {
        tenantId,
        partnerId,
        status: AffiliateCommissionStatus.APPROVED,
      },
      _sum: { commissionCents: true },
    }),
    prisma.affiliateCommission.count({
      where: {
        tenantId,
        partnerId,
        status: { not: AffiliateCommissionStatus.VOID },
      },
    }),
  ]);

  if (!tenant || !partner) throw new Error("Creator not found");

  const currency = tenant.settings?.currency ?? "USD";
  const bps = partner.commissionBps ?? settings.defaultCommissionBps;
  const referralUrl = new URL(getStorefrontUrl(tenant.slug));
  referralUrl.searchParams.set("ref", partner.code);

  return {
    partner,
    vars: {
      creator_name: partner.displayName,
      store_name: tenant.name,
      referral_link: referralUrl.toString(),
      commission_percent: `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`,
      owed_amount: formatMoneyEmail(owedAgg._sum.commissionCents ?? 0, currency),
      orders_count: String(orderCount),
    },
  };
}

export async function sendAffiliateCreatorEmail(opts: {
  tenantId: string;
  partnerId: string;
  templateId?: AffiliateCreatorEmailTemplateId | null;
  subject?: string;
  html?: string;
  text?: string;
}) {
  if (!isEmailProviderConfigured()) {
    throw new Error("Email provider not configured on server (Resend or SendGrid)");
  }

  const { partner, vars } = await buildAffiliateCreatorEmailVars(
    opts.tenantId,
    opts.partnerId
  );

  const to = partner.email?.trim().toLowerCase();
  if (!to) {
    throw new Error("Add an email address for this creator first (Edit)");
  }

  let subject: string;
  let html: string;

  if (opts.templateId) {
    const tpl = AFFILIATE_CREATOR_EMAIL_TEMPLATES.find((t) => t.id === opts.templateId);
    if (!tpl) throw new Error("Unknown template");
    subject = renderAffiliateEmailTemplate(tpl.subject, vars);
    html = renderAffiliateEmailTemplate(tpl.html, vars);
  } else {
    subject = String(opts.subject ?? "").trim();
    html = String(opts.html ?? "").trim();
    if (!subject || !html) {
      throw new Error("Subject and message are required for a custom email");
    }
    if (!html.includes("<")) {
      html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55">${html
        .split(/\n\n+/)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("")}</body></html>`;
    }
  }

  const text = opts.text?.trim() || plainTextFromHtml(html);

  await sendStoreEmail(opts.tenantId, {
    to,
    subject,
    html,
    text,
    template: opts.templateId ? `affiliate.${opts.templateId}` : "affiliate.custom",
  });

  return { sentTo: to, subject };
}

export function previewAffiliateCreatorEmail(
  templateId: AffiliateCreatorEmailTemplateId,
  vars: Record<string, string>
) {
  const tpl = AFFILIATE_CREATOR_EMAIL_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) throw new Error("Unknown template");
  return {
    subject: renderAffiliateEmailTemplate(tpl.subject, vars),
    html: renderAffiliateEmailTemplate(tpl.html, vars),
  };
}
