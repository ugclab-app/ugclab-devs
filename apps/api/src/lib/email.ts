type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "UGCLab Store <orders@ugclab.store>";

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
    return;
  }

  if (sendgridKey) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from.match(/<([^>]+)>/)?.[1] ?? from },
        subject,
        content: [
          ...(text ? [{ type: "text/plain", value: text }] : []),
          { type: "text/html", value: html },
        ],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid error: ${await res.text()}`);
    return;
  }

  console.warn("[email] No RESEND_API_KEY or SENDGRID_API_KEY — skipped:", subject);
}
