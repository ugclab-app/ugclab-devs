export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  template,
}: SendEmailParams & { template?: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromHeader =
    from ?? process.env.EMAIL_FROM ?? "Tescommerce <orders@tescommerce.com>";

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
    const { logPlatformEmail } = await import("./email-log.js");
    await logPlatformEmail({ to, subject, template, status: "sent" });
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
        personalizations: [
          {
            to: [{ email: to }],
            ...(replyTo ? { headers: { "Reply-To": replyTo } } : {}),
          },
        ],
        from: {
          email: fromHeader.match(/<([^>]+)>/)?.[1] ?? fromHeader,
          name: fromHeader.match(/^([^<]+)</)?.[1]?.trim(),
        },
        subject,
        content: [
          ...(text ? [{ type: "text/plain", value: text }] : []),
          { type: "text/html", value: html },
        ],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid error: ${await res.text()}`);
    const { logPlatformEmail } = await import("./email-log.js");
    await logPlatformEmail({ to, subject, template, status: "sent" });
    return;
  }

  console.warn("[email] No RESEND_API_KEY or SENDGRID_API_KEY — skipped:", subject);
  const { logPlatformEmail } = await import("./email-log.js");
  await logPlatformEmail({ to, subject, template, status: "skipped" });
}
