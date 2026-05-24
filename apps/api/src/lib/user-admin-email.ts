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
