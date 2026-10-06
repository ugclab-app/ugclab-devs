/** Shared rich HTML for outreach emails (table layout, email-client safe). */

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

function shell(opts: {
  preheader: string;
  heroUrl: string;
  heroAlt: string;
  inner: string;
  ctaLabel: string;
  accent?: string;
}) {
  const accent = opts.accent ?? "#0ea5e9";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>{{platformName}}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">

<tr><td style="padding:20px 28px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);">
<table role="presentation" width="100%"><tr>
<td><img src="{{logoUrl}}" alt="{{platformName}}" width="140" height="36" style="display:block;height:36px;width:auto;max-width:140px;border:0;"/></td>
<td align="right" style="font-size:12px;color:#94a3b8;">Sell smarter</td>
</tr></table>
</td></tr>

<tr><td style="padding:0;line-height:0;">
<img src="${opts.heroUrl}" alt="${opts.heroAlt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
</td></tr>

<tr><td style="padding:32px 28px 8px;color:#0f172a;font-size:16px;line-height:1.65;">
${opts.inner}
</td></tr>

<tr><td style="padding:8px 28px 32px;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="border-radius:10px;background:${accent};">
<a href="{{signupUrl}}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${opts.ctaLabel}</a>
</td></tr></table>
<p style="margin:16px 0 0;font-size:13px;color:#64748b;text-align:center;">
<a href="{{signupUrl}}" style="color:${accent};text-decoration:underline;">{{signupUrl}}</a>
</p>
</td></tr>

<tr><td style="padding:24px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
<p style="margin:0 0 8px;">© {{year}} {{platformName}}. All rights reserved.</p>
<p style="margin:0;">You received this because we thought our platform could help your business. Reply with &quot;unsubscribe&quot; and we will not email again.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function featureRow(img1: string, img2: string, img3: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
<tr>
<td width="33%" valign="top" style="padding:0 6px 0 0;">
<img src="${img1}" alt="" width="168" style="display:block;width:100%;max-width:168px;border-radius:10px;height:auto;border:0;"/>
<p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#0f172a;">Storefront</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.45;">Themes, blocks, mobile-ready pages</p>
</td>
<td width="33%" valign="top" style="padding:0 3px;">
<img src="${img2}" alt="" width="168" style="display:block;width:100%;max-width:168px;border-radius:10px;height:auto;border:0;"/>
<p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#0f172a;">Payments</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.45;">Stripe checkout &amp; order tracking</p>
</td>
<td width="33%" valign="top" style="padding:0 0 0 6px;">
<img src="${img3}" alt="" width="168" style="display:block;width:100%;max-width:168px;border-radius:10px;height:auto;border:0;"/>
<p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#0f172a;">Growth</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.45;">Domains, marketing, analytics</p>
</td>
</tr>
</table>`;
}

const IMG = {
  heroShop:
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=500&fit=crop&q=80",
  heroCreator:
    "https://images.unsplash.com/photo-1611162617474-5b21e939e966?w=1200&h=500&fit=crop&q=80",
  heroBrand:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop&q=80",
  heroShort:
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=400&fit=crop&q=80",
  featStore:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=280&fit=crop&q=80",
  featPay:
    "https://images.unsplash.com/photo-1556740758-90de374c12d0?w=400&h=280&fit=crop&q=80",
  featGrow:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=280&fit=crop&q=80",
  featCreator1:
    "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=280&fit=crop&q=80",
  featCreator2:
    "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=400&h=280&fit=crop&q=80",
  featCreator3:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=280&fit=crop&q=80",
  featBrand1:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=280&fit=crop&q=80",
  featBrand2:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=280&fit=crop&q=80",
  featBrand3:
    "https://images.unsplash.com/photo-1558176282-aa884f997948?w=400&h=280&fit=crop&q=80",
};

export const OUTREACH_WELCOME_HTML = shell({
  preheader: "Launch your online store in minutes — payments, themes, and orders included.",
  heroUrl: IMG.heroShop,
  heroAlt: "Modern online store dashboard",
  ctaLabel: "Create your free store →",
  inner: `<p style="margin:0 0 16px;font-size:22px;font-weight:700;line-height:1.3;">Hi {{name}}, ready to sell online?</p>
<p style="margin:0 0 16px;">We built <strong>{{platformName}}</strong> for creators and brands who are tired of duct-taping Shopify plugins, payment links, and spreadsheets. Everything you need to launch, sell, and grow — in one platform.</p>
<table role="presentation" width="100%" style="margin:20px 0;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
<tr><td style="padding:16px 20px;">
<p style="margin:0;font-size:14px;color:#0369a1;font-weight:600;">Why merchants switch to us</p>
<ul style="margin:10px 0 0;padding-left:20px;color:#0f172a;font-size:14px;line-height:1.7;">
<li>Go live in under an hour — no developers required</li>
<li>Beautiful storefront themes with drag-and-drop blocks</li>
<li>Stripe-powered checkout &amp; automated order emails</li>
<li>Custom domain + SSL when you are ready to scale</li>
</ul>
</td></tr></table>
${featureRow(IMG.featStore, IMG.featPay, IMG.featGrow)}
<table role="presentation" width="100%" style="margin:16px 0 0;background:#f8fafc;border-radius:12px;">
<tr><td style="padding:18px 20px;text-align:center;">
<p style="margin:0;font-size:28px;font-weight:800;color:#0ea5e9;">10 min</p>
<p style="margin:4px 0 0;font-size:13px;color:#64748b;">average time to publish your first product</p>
</td></tr></table>
<p style="margin:20px 0 0;">Start free today — no credit card required for your trial store. We are happy to help you pick a theme if you reply to this email.</p>
<p style="margin:16px 0 0;color:#64748b;font-size:14px;">— The {{platformName}} team</p>`,
});

export const OUTREACH_SHORT_HTML = shell({
  preheader: "Your storefront + Stripe checkout — live today on {{platformName}}.",
  heroUrl: IMG.heroShort,
  heroAlt: "Checkout and payments",
  ctaLabel: "Start free →",
  accent: "#6366f1",
  inner: `<p style="margin:0 0 12px;font-size:20px;font-weight:700;">Hi {{name}},</p>
<p style="margin:0 0 16px;">Short version: <strong>{{platformName}}</strong> lets you launch a professional store, accept payments, and manage orders — without hiring an agency.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:4px solid #6366f1;font-size:14px;">✓ Free to start &nbsp;·&nbsp; ✓ Stripe built-in &nbsp;·&nbsp; ✓ Custom domain ready</td></tr>
</table>
<p style="margin:0;">Tap below — setup takes about ten minutes.</p>`,
});

export const OUTREACH_CREATOR_HTML = shell({
  preheader: "Turn your audience into customers — merch, digital products, bundles.",
  heroUrl: IMG.heroCreator,
  heroAlt: "Creator selling online",
  ctaLabel: "Open your creator store →",
  accent: "#ec4899",
  inner: `<p style="margin:0 0 16px;font-size:22px;font-weight:700;">Hi {{name}}, monetize your audience</p>
<p style="margin:0 0 16px;">Your followers are ready to buy — you just need a store that matches your brand. <strong>{{platformName}}</strong> is built for creators selling merch, digital downloads, courses, and bundles.</p>
<p style="margin:0 0 8px;font-weight:600;font-size:15px;">What creators love:</p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.75;color:#334155;">
<li>Link-in-bio ready storefront on your own domain</li>
<li>Drop-style product launches &amp; limited inventory</li>
<li>Automatic order confirmations &amp; shipping emails</li>
<li>Theme gallery — look premium without a designer</li>
</ul>
${featureRow(IMG.featCreator1, IMG.featCreator2, IMG.featCreator3)}
<table role="presentation" width="100%" style="margin:8px 0 0;">
<tr>
<td width="50%" style="padding-right:8px;"><img src="https://images.unsplash.com/photo-1614850523459-0aabb0e8eaff?w=280&h=180&fit=crop&q=80" alt="" width="260" style="width:100%;border-radius:10px;display:block;border:0;"/></td>
<td width="50%" style="padding-left:8px;vertical-align:middle;font-size:14px;color:#334155;">
<p style="margin:0;font-style:italic;">&quot;I launched my merch drop in one evening — sales went live before midnight.&quot;</p>
<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">— Creator on {{platformName}}</p>
</td>
</tr>
</table>`,
});

export const OUTREACH_BRAND_HTML = shell({
  preheader: "DTC-ready stack: storefront, MoR payouts, custom domains.",
  heroUrl: IMG.heroBrand,
  heroAlt: "Retail brand storefront",
  ctaLabel: "Launch your brand store →",
  accent: "#0f172a",
  inner: `<p style="margin:0 0 16px;font-size:22px;font-weight:700;">Hi {{name}}, scale your DTC brand</p>
<p style="margin:0 0 16px;">Running a brand means owning the full customer experience. <strong>{{platformName}}</strong> gives you enterprise-grade tooling without enterprise complexity — from first sale to international growth.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr>
<td width="50%" valign="top" style="padding:0 10px 0 0;font-size:14px;line-height:1.6;">
<p style="margin:0 0 8px;font-weight:700;color:#0f172a;">Commerce</p>
<p style="margin:0;color:#64748b;">Catalog, collections, discounts, multi-currency checkout</p>
</td>
<td width="50%" valign="top" style="padding:0 0 0 10px;font-size:14px;line-height:1.6;">
<p style="margin:0 0 8px;font-weight:700;color:#0f172a;">Operations</p>
<p style="margin:0;color:#64748b;">Orders, payouts, disputes, platform-grade admin</p>
</td>
</tr>
</table>
${featureRow(IMG.featBrand1, IMG.featBrand2, IMG.featBrand3)}
<p style="margin:16px 0 0;font-size:14px;color:#64748b;">Trusted by growing brands who want control of their stack and margins.</p>`,
});

export const OUTREACH_LEGACY_HTML = OUTREACH_WELCOME_HTML;
