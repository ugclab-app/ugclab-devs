export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
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

type EmailPayload = SendEmailParams & { template?: string };

/** Immediate provider send — used by the job worker. Throws on provider errors. */
export async function sendEmailDirect({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  headers,
  template,
  priority = "normal",
}: EmailPayload): Promise<{ id: string | null }> {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromHeader =
    from ?? process.env.EMAIL_FROM ?? "Tescommerce <orders@tescommerce.com>";

  const priorityHeaders = resolvePriorityHeaders(priority);
  const extraHeaders = { ...(priorityHeaders ?? {}), ...(headers ?? {}) };
  const hasExtraHeaders = Object.keys(extraHeaders).length > 0;

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
        ...(hasExtraHeaders ? { headers: extraHeaders } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
    const payload = (await res.json().catch(() => ({}))) as { id?: string };
    const { logPlatformEmail } = await import("./email-log.js");
    await logPlatformEmail({ to, subject, template, status: "sent" });
    return { id: payload.id ?? null };
  }

  if (sendgridKey) {
    const sgHeaders = {
      ...extraHeaders,
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
    return { id: null };
  }

  console.warn("[email] No RESEND_API_KEY or SENDGRID_API_KEY — skipped:", subject);
  const { logPlatformEmail } = await import("./email-log.js");
  await logPlatformEmail({ to, subject, template, status: "skipped" });
  return { id: null };
}

/**
 * Queue email on the durable outbox, then try once immediately.
 * Cron retries FAILED jobs so Vercel freezes / Resend blips don't drop mail.
 * Set EMAIL_SYNC=1 to skip the queue (tests / local debugging).
 */
export async function sendEmail(params: EmailPayload): Promise<{ id: string | null }> {
  if (process.env.EMAIL_SYNC === "1") {
    return sendEmailDirect(params);
  }
  const { enqueueJob, processJobById } = await import("./job-queue.js");
  const job = await enqueueJob("email.send", params as unknown as Record<string, unknown>);
  void processJobById(job.id).catch((e) => console.error("[email] immediate send", e));
  return { id: job.id };
}
