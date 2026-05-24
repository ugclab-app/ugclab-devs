import { sendEmail } from "./email.js";

export const INVITE_TTL_DAYS = 7;

export function inviteExpiresAt(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d;
}

export function isInviteExpired(member: {
  acceptedAt: Date | null;
  inviteExpiresAt: Date | null;
  createdAt: Date;
}): boolean {
  if (member.acceptedAt) return false;
  const exp =
    member.inviteExpiresAt ?? inviteExpiresAt(member.createdAt);
  return exp < new Date();
}

export function buildInviteLink(token: string): string {
  const adminUrl = process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001";
  return `${adminUrl}/login?invite=${token}`;
}

export async function sendStaffInviteEmail(opts: {
  to: string;
  storeName: string;
  role: string;
  inviteLink: string;
  inviterEmail: string;
}): Promise<boolean> {
  const hasProvider =
    Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SENDGRID_API_KEY);
  if (!hasProvider) return false;

  const subject = `You're invited to ${opts.storeName} on Tescommerce`;
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<p>You've been invited as <strong>${opts.role}</strong> to <strong>${opts.storeName}</strong>.</p>
<p>Invited by ${opts.inviterEmail}. This link expires in ${INVITE_TTL_DAYS} days.</p>
<p><a href="${opts.inviteLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Accept invitation</a></p>
<p style="color:#71717a;font-size:12px">Or copy: ${opts.inviteLink}</p>
</body></html>`;

  try {
    await sendEmail({
      to: opts.to,
      subject,
      html,
      text: `Join ${opts.storeName} as ${opts.role}: ${opts.inviteLink}`,
    });
    return true;
  } catch (e) {
    console.warn("[staff-invite] email failed", e);
    return false;
  }
}
