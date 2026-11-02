import { sendEmail } from "./email.js";
import { MERCHANT_WEB_URL } from "../env.js";
import { getStorefrontUrl } from "./storefront.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendStoreRemovedEmail(opts: {
  to: string;
  ownerName: string | null;
  storeName: string;
  storeSlug: string;
}): Promise<boolean> {
  const hasProvider =
    Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SENDGRID_API_KEY);
  if (!hasProvider) return false;

  const greeting = opts.ownerName?.trim()
    ? `Hello ${escapeHtml(opts.ownerName.trim())},`
    : "Hello,";
  const storeName = escapeHtml(opts.storeName);
  const storeSlug = escapeHtml(opts.storeSlug);
  const loginUrl = MERCHANT_WEB_URL;
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#18181b">
<p>${greeting}</p>
<p>The Tescommerce administration has removed your store <strong>${storeName}</strong> (${storeSlug}).</p>
<p>This was an administrative decision. It was not requested from your merchant dashboard.</p>
<p>What this means:</p>
<ul>
<li>The public storefront is no longer available to buyers.</li>
<li>Products, orders, and customer records for this store have been deleted.</li>
<li>Your login still exists. You can sign in and open a new store if you want to sell again.</li>
</ul>
<p><a href="${loginUrl}">${loginUrl}</a></p>
<p>If you believe this was a mistake, reply to this email and include the store name <strong>${storeName}</strong> so we can review it.</p>
<p>Tescommerce</p>
</body></html>`;
  const text = [
    opts.ownerName?.trim() ? `Hello ${opts.ownerName.trim()},` : "Hello,",
    "",
    `The Tescommerce administration has removed your store "${opts.storeName}" (${opts.storeSlug}).`,
    "This was an administrative decision. It was not requested from your merchant dashboard.",
    "",
    "The public storefront is no longer available.",
    "Products, orders, and customer records for this store have been deleted.",
    "Your login still exists. You can sign in and open a new store.",
    loginUrl,
    "",
    "If you believe this was a mistake, reply to this email and include the store name.",
  ].join("\n");

  try {
    await sendEmail({
      to: opts.to,
      subject: `Your store “${opts.storeName}” was removed`,
      html,
      text,
      template: "store_removed_by_admin",
    });
    return true;
  } catch (e) {
    console.warn("[platform] store-removed email failed", e);
    return false;
  }
}

export async function sendStoreOpenedEmail(opts: {
  to: string;
  ownerName: string | null;
  storeName: string;
  storeSlug: string;
}): Promise<boolean> {
  const hasProvider =
    Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SENDGRID_API_KEY);
  if (!hasProvider) return false;

  const owner = opts.ownerName?.trim() || "";
  const greeting = owner ? `Hello ${escapeHtml(owner)},` : "Hello,";
  const storeName = escapeHtml(opts.storeName);
  const storeUrl = getStorefrontUrl(opts.storeSlug);
  const dashboardUrl = MERCHANT_WEB_URL;
  const safeStoreUrl = escapeHtml(storeUrl);
  const safeDashboard = escapeHtml(dashboardUrl);

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f3fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3fb;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:#5b21b6;padding:36px 36px 32px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#ddd6fe;">Tescommerce</p>
              <h1 style="margin:14px 0 0;font-family:Georgia,serif;font-size:34px;line-height:1.15;font-weight:normal;color:#ffffff;">Your store is open</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px;font-family:system-ui,sans-serif;font-size:16px;line-height:1.65;color:#18181b;">
              <p style="margin:0 0 14px;">${greeting}</p>
              <p style="margin:0 0 22px;"><strong>${storeName}</strong> is live. Buyers can open it now.</p>
              <p style="margin:0 0 22px;padding:14px 16px;background:#faf5ff;border-radius:12px;">
                <span style="display:block;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;">Store address</span>
                <a href="${safeStoreUrl}" style="color:#5b21b6;word-break:break-all;text-decoration:none;">${safeStoreUrl}</a>
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:999px;background:#5b21b6;">
                    <a href="${safeDashboard}" style="display:inline-block;padding:12px 20px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Open dashboard</a>
                  </td>
                  <td width="10"></td>
                  <td style="border-radius:999px;border:1px solid #ddd6fe;">
                    <a href="${safeStoreUrl}" style="display:inline-block;padding:11px 18px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#5b21b6;text-decoration:none;">View store</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 14px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">What to do next</p>
              <p style="margin:0 0 8px;">1. Add a product, with a photo and a price.</p>
              <p style="margin:0 0 8px;">2. Send the store link to one buyer.</p>
              <p style="margin:0 0 22px;">3. When they pay, the amount shows in your balance.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                <tr>
                  <td style="padding:18px 18px 18px 16px;background:#f8fafc;border-radius:14px;border-left:4px solid #5b21b6;">
                    <p style="margin:0 0 6px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#5b21b6;">How you get paid</p>
                    <p style="margin:0;font-size:15px;line-height:1.55;color:#18181b;">Payouts go out in one of 12 currencies, including USD, EUR, KGS, KZT and UZS, usually within 3–7 business days. The minimum is $50. Your country does not have to be on the Shopify Payments list.</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px;background:#fafafa;border-radius:14px;">
                    <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:18px;line-height:1.45;color:#18181b;">Your store is open. We just launched, so if something breaks, reply to this email. I read it.</p>
                    <p style="margin:0;font-size:14px;color:#52525b;">Mustafa<br>Tescommerce</p>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#a1a1aa;">Opened on the free Starter plan. If you did not create ${storeName}, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    owner ? `Hello ${owner},` : "Hello,",
    "",
    `${opts.storeName} is live. Buyers can open it now.`,
    `Store: ${storeUrl}`,
    `Dashboard: ${dashboardUrl}`,
    "",
    "1. Add a product, with a photo and a price.",
    "2. Send the store link to one buyer.",
    "3. When they pay, the amount shows in your balance.",
    "",
    "How you get paid: one of 12 payout currencies, including USD, EUR, KGS, KZT and UZS, usually within 3–7 business days. Minimum $50. Your country does not have to be on the Shopify Payments list.",
    "",
    "Your store is open. We just launched, so if something breaks, reply to this email. I read it.",
    "Mustafa",
    "Tescommerce",
    "",
    "Opened on the free Starter plan. If you did not create this store, you can ignore this email.",
  ].join("\n");

  try {
    await sendEmail({
      to: opts.to,
      subject: `${opts.storeName} is open`,
      html,
      text,
      template: "store_opened",
    });
    return true;
  } catch (e) {
    console.warn("[signup] store-opened email failed", e);
    return false;
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  temporaryPassword: string;
}): Promise<boolean> {
  const hasProvider =
    Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SENDGRID_API_KEY);
  if (!hasProvider) return false;

  const loginUrl = MERCHANT_WEB_URL;
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif">
<p>Your Tescommerce merchant password was reset by platform support.</p>
<p><strong>Temporary password:</strong> <code>${opts.temporaryPassword}</code></p>
<p>Sign in at <a href="${loginUrl}">${loginUrl}</a> and change your password in Settings.</p>
</body></html>`;

  try {
    await sendEmail({
      to: opts.to,
      subject: "Your Tescommerce password was reset",
      html,
      text: `Temporary password: ${opts.temporaryPassword}\nSign in: ${loginUrl}`,
    });
    return true;
  } catch (e) {
    console.warn("[user-admin] password email failed", e);
    return false;
  }
}

export async function sendForgotPasswordLinkEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<boolean> {
  const hasProvider =
    Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SENDGRID_API_KEY);
  if (!hasProvider) return false;

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#18181b">
<p>We received a request to reset your Tescommerce merchant password.</p>
<p><a href="${opts.resetUrl}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset password</a></p>
<p style="font-size:13px;color:#71717a">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
<p style="font-size:12px;color:#a1a1aa;word-break:break-all">${opts.resetUrl}</p>
</body></html>`;

  try {
    await sendEmail({
      to: opts.to,
      subject: "Reset your Tescommerce password",
      html,
      text: `Reset your password: ${opts.resetUrl}\nThis link expires in 1 hour.`,
      template: "merchant_forgot_password",
    });
    return true;
  } catch (e) {
    console.warn("[auth] forgot-password email failed", e);
    return false;
  }
}

export async function sendMagicLinkEmail(opts: {
  to: string;
  magicUrl: string;
}): Promise<boolean> {
  const hasProvider =
    Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SENDGRID_API_KEY);
  if (!hasProvider) return false;

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#18181b">
<p>Sign in to your Tescommerce merchant dashboard with this one-time link:</p>
<p><a href="${opts.magicUrl}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Sign in</a></p>
<p style="font-size:13px;color:#71717a">This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>
<p style="font-size:12px;color:#a1a1aa;word-break:break-all">${opts.magicUrl}</p>
</body></html>`;

  try {
    await sendEmail({
      to: opts.to,
      subject: "Your Tescommerce sign-in link",
      html,
      text: `Sign in: ${opts.magicUrl}\nThis link expires in 15 minutes.`,
      template: "merchant_magic_link",
    });
    return true;
  } catch (e) {
    console.warn("[auth] magic-link email failed", e);
    return false;
  }
}
