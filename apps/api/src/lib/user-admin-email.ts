import { sendEmail } from "./email.js";
import { MERCHANT_WEB_URL } from "../env.js";

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
