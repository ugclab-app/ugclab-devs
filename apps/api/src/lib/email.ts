export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Outlook / some clients; Gmail Important is still algorithmic. */
  priority?: "high" | "normal";
};

/** RFC 4021 + legacy headers for high-priority display in mail clients. */
export function highPriorityEmailHeaders(): Record<string, string> {
  return {
    Importance: "high",
    Priority: "urgent",
    "X-Priority": "1",
    "X-MSMail-Priority": "High",
  };
}

function resolvePriorityHeaders(priority?: "high" | "normal") {
  if (priority !== "high") return undefined;
  return highPriorityEmailHeaders();
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  template,
  priority = "normal",
}: SendEmailParams & { template?: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromHeader =
    from ?? process.env.EMAIL_FROM ?? "Tescommerce <orders@tescommerce.com>";

  const priorityHeaders = resolvePriorityHeaders(priority);

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
        ...(priorityHeaders ? { headers: priorityHeaders } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
    const { logPlatformEmail } = await import("./email-log.js");
    await logPlatformEmail({ to, subject, template, status: "sent" });
    return;
  }

  if (sendgridKey) {
    const sgHeaders = {
      ...(priorityHeaders ?? {}),
      ...(replyTo ? { "Reply-To": replyTo } : {}),
    };
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
            ...(Object.keys(sgHeaders).length > 0 ? { headers: sgHeaders } : {}),
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
