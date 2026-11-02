import { randomBytes } from "node:crypto";
import { OrderStatus, prisma } from "@ugclab/database";
import { sendEmail } from "./email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MailboxAddress = {
  email: string;
  name: string;
  fromHeader: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SENDGRID_API_KEY?.trim());
}

export function mailboxWebhookConfigured(): boolean {
  return Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
}

export function platformMailboxAddress(): MailboxAddress {
  const explicit = process.env.PLATFORM_MAILBOX_ADDRESS?.trim();
  const source = explicit || process.env.EMAIL_FROM?.trim() || "Tescommerce <info@tescommerce.com>";
  const angled = source.match(/^(.*)<([^>]+)>$/);
  const emailPart = angled?.[2]?.trim().toLowerCase();
  if (emailPart) {
    const name = angled?.[1]?.trim().replace(/^["']|["']$/g, "") || "Tescommerce";
    return { email: emailPart, name, fromHeader: `${name} <${emailPart}>` };
  }
  const email = source.trim().toLowerCase();
  return { email, name: "Tescommerce", fromHeader: `Tescommerce <${email}>` };
}

export function platformMailboxAliases(): string[] {
  const primary = platformMailboxAddress().email;
  const extra = (process.env.PLATFORM_MAILBOX_ALIASES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes("@") && item !== primary);
  return [primary, ...extra];
}

export function platformMailForwardTo(): string | null {
  const value = process.env.PLATFORM_MAIL_FORWARD_TO?.trim().toLowerCase() ?? "";
  return value.includes("@") ? value : null;
}

function oneLine(value: string, max: number) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export function isValidMailboxEmail(email: string) {
  return EMAIL_RE.test(email);
}

export function normalizeSubject(subject: string) {
  let next = subject.trim();
  let prev = "";
  while (next !== prev) {
    prev = next;
    next = next.replace(/^(re|fw|fwd|aw|ответ)\s*:\s*/i, "").trim();
  }
  return next || "(no subject)";
}

export function parseEmailAddress(raw: string): { email: string; name: string | null } {
  const trimmed = raw.trim();
  const angled = trimmed.match(/^(.*)<([^>]+)>$/);
  const emailPart = angled?.[2]?.trim().toLowerCase();
  if (emailPart) {
    const name = angled?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    return { email: emailPart, name: name || null };
  }
  return { email: trimmed.toLowerCase(), name: null };
}

function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#18141f">${escaped.replace(/\n/g, "<br/>")}</div>`;
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeMessageId(value: string) {
  return value.trim().replace(/^<|>$/g, "").toLowerCase();
}

export function messageIdsFromHeader(value: string | undefined) {
  if (!value) return [];
  const ids = value.match(/<[^>]+>/g) ?? value.split(/\s+/);
  return [...new Set(ids.map(normalizeMessageId).filter(Boolean))];
}

function newRfcMessageId(domain: string) {
  return `${Date.now().toString(36)}.${randomBytes(8).toString("hex")}@${domain}`;
}

export async function storesForMailboxEmail(email: string) {
  const owner = await prisma.user.findUnique({
    where: { email },
    select: {
      tenants: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, slug: true, status: true },
      },
    },
  });
  const tenants = owner?.tenants ?? [];
  return Promise.all(
    tenants.map(async (tenant) => {
      const [paidOrders, latestPayout] = await Promise.all([
        prisma.order.count({
          where: { tenantId: tenant.id, status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
        }),
        prisma.merchantPayout.findFirst({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          select: { amount: true, currency: true, status: true, createdAt: true },
        }),
      ]);
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        paidOrders,
        latestPayout: latestPayout
          ? {
              amountCents: latestPayout.amount,
              currency: latestPayout.currency,
              status: latestPayout.status,
              createdAt: latestPayout.createdAt.toISOString(),
            }
          : null,
      };
    })
  );
}

export async function loadMailboxAttachment(messageId: string, attachmentId: string) {
  const message = await prisma.platformMailboxMessage.findUnique({
    where: { id: messageId },
    select: { resendEmailId: true, attachmentMeta: true },
  });
  if (!message?.resendEmailId) return null;
  const known = readAttachments(message.attachmentMeta, null).find((item) => item.id === attachmentId);
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("Email provider is not configured");
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${message.resendEmailId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`Attachment lookup failed (${res.status})`);
  const data = (await res.json()) as {
    filename?: string;
    content_type?: string;
    download_url?: string;
    size?: number;
  };
  if (!data.download_url) throw new Error("Attachment has no download");
  const file = await fetch(data.download_url);
  if (!file.ok) throw new Error(`Attachment download failed (${file.status})`);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 15 * 1024 * 1024) throw new Error("Attachment is too large to download here");
  const filename = (known?.filename || data.filename || "attachment").replace(/[\r\n"]/g, "");
  return {
    bytes,
    filename,
    contentType: data.content_type || known?.contentType || "application/octet-stream",
  };
}

function domainOf(email: string) {
  return email.split("@")[1] ?? "";
}

export const MAILBOX_STATUSES = ["open", "waiting", "closed"] as const;
export type MailboxStatus = (typeof MAILBOX_STATUSES)[number];

export function isMailboxStatus(value: string): value is MailboxStatus {
  return (MAILBOX_STATUSES as readonly string[]).includes(value);
}

export type MailAttachment = {
  id: string;
  filename: string;
  contentType?: string;
  size?: number;
};

export function mapThread(row: {
  id: string;
  subject: string;
  correspondentEmail: string;
  correspondentName: string | null;
  status: string;
  unread: boolean;
  lastMessageAt: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    subject: row.subject,
    correspondentEmail: row.correspondentEmail,
    correspondentName: row.correspondentName,
    status: row.status,
    unread: row.unread,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function readAttachments(meta: unknown, fallback: string | null): MailAttachment[] {
  if (Array.isArray(meta)) {
    return meta.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: unknown; filename?: unknown; contentType?: unknown; size?: unknown };
      const filename = typeof row.filename === "string" ? row.filename : "";
      if (!filename) return [];
      return [
        {
          id: typeof row.id === "string" ? row.id : "",
          filename,
          ...(typeof row.contentType === "string" ? { contentType: row.contentType } : {}),
          ...(typeof row.size === "number" ? { size: row.size } : {}),
        },
      ];
    });
  }
  if (!fallback) return [];
  return fallback
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((filename) => ({ id: "", filename }));
}

export function mapMessage(row: {
  id: string;
  direction: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  textBody: string;
  attachments: string | null;
  attachmentMeta: unknown;
  resendEmailId: string | null;
  actorEmail: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    direction: row.direction,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    subject: row.subject,
    textBody: row.textBody,
    attachments: readAttachments(row.attachmentMeta, row.attachments),
    canDownload: Boolean(row.resendEmailId),
    actorEmail: row.actorEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

async function deliver(input: {
  to: string;
  subject: string;
  text: string;
  rfcMessageId: string;
  inReplyTo?: string;
  references?: string[];
}) {
  const mailbox = platformMailboxAddress();
  if (!emailConfigured()) {
    throw new Error("Email provider is not configured");
  }
  const domain = domainOf(mailbox.email);
  const messageId = `<${input.rfcMessageId.includes("@") ? input.rfcMessageId : `${input.rfcMessageId}@${domain}`}>`;
  const headers: Record<string, string> = { "Message-ID": messageId };
  if (input.inReplyTo) headers["In-Reply-To"] = `<${normalizeMessageId(input.inReplyTo)}>`;
  if (input.references?.length) {
    headers.References = input.references.map((id) => `<${normalizeMessageId(id)}>`).join(" ");
  }
  const sent = await sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: textToHtml(input.text),
    from: mailbox.fromHeader,
    replyTo: mailbox.email,
    headers,
    template: "platform_mailbox",
  });
  if (!sent.id && !process.env.RESEND_API_KEY?.trim() && !process.env.SENDGRID_API_KEY?.trim()) {
    throw new Error("Email provider is not configured");
  }
  return { resendEmailId: sent.id, rfcMessageId: normalizeMessageId(messageId) };
}

export async function sendMailboxMessage(input: {
  to: string;
  subject: string;
  body: string;
  actorUserId: string;
  actorEmail: string;
  threadId?: string;
}) {
  const mailbox = platformMailboxAddress();
  const body = input.body.trim();
  if (!body) throw new Error("Write a message");
  if (body.length > 20000) throw new Error("Message is too long");

  const domain = domainOf(mailbox.email) || "tescommerce.com";
  const rfcMessageId = newRfcMessageId(domain);

  if (!input.threadId) {
    const to = input.to.trim().toLowerCase();
    if (!isValidMailboxEmail(to)) throw new Error("Enter a valid email address");
    if (to === mailbox.email) throw new Error("That address is the platform mailbox");
    const subject = oneLine(input.subject, 200);
    if (!subject) throw new Error("Subject is required");
    const sent = await deliver({ to, subject, text: body, rfcMessageId });
    const thread = await prisma.platformMailboxThread.create({
      data: {
        subject: normalizeSubject(subject),
        correspondentEmail: to,
        status: "waiting",
        unread: false,
        messages: {
          create: {
            direction: "out",
            fromEmail: mailbox.email,
            toEmail: to,
            subject,
            textBody: body,
            htmlBody: textToHtml(body),
            resendEmailId: sent.resendEmailId,
            rfcMessageId: sent.rfcMessageId,
            actorUserId: input.actorUserId,
            actorEmail: input.actorEmail,
          },
        },
      },
    });
    return thread.id;
  }

  const thread = await prisma.platformMailboxThread.findUnique({
    where: { id: input.threadId },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { rfcMessageId: true } } },
  });
  if (!thread) throw new Error("Conversation not found");
  const subject = oneLine(
    thread.subject.toLowerCase().startsWith("re:") ? thread.subject : `Re: ${thread.subject}`,
    200
  );
  const prior = thread.messages.map((m) => m.rfcMessageId).filter((id): id is string => Boolean(id));
  const inReplyTo = prior[prior.length - 1];
  const sent = await deliver({
    to: thread.correspondentEmail,
    subject,
    text: body,
    rfcMessageId,
    inReplyTo,
    references: prior,
  });
  await prisma.platformMailboxMessage.create({
    data: {
      threadId: thread.id,
      direction: "out",
      fromEmail: mailbox.email,
      toEmail: thread.correspondentEmail,
      subject,
      textBody: body,
      htmlBody: textToHtml(body),
      resendEmailId: sent.resendEmailId,
      rfcMessageId: sent.rfcMessageId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
    },
  });
  await prisma.platformMailboxThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date(), unread: false, status: "waiting" },
  });
  return thread.id;
}

type InboundEmail = {
  resendEmailId: string;
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  attachmentNames: string[];
  attachmentMeta: MailAttachment[];
};

function headerValue(headers: Record<string, string> | undefined, name: string) {
  if (!headers) return "";
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return found?.[1] ?? "";
}

export async function fetchReceivedEmail(emailId: string): Promise<InboundEmail | null> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`Resend receiving ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    text?: string | null;
    html?: string | null;
    message_id?: string | null;
    headers?: Record<string, string>;
    attachments?: Array<{ id?: string; filename?: string; content_type?: string; size?: number }>;
  };
  const attachmentMeta = (data.attachments ?? []).flatMap((item) => {
    if (!item.filename) return [];
    return [
      {
        id: item.id ?? "",
        filename: item.filename,
        ...(item.content_type ? { contentType: item.content_type } : {}),
        ...(typeof item.size === "number" ? { size: item.size } : {}),
      },
    ];
  });
  return {
    resendEmailId: data.id || emailId,
    from: data.from || "",
    to: data.to ?? [],
    subject: data.subject || "",
    text: data.text ?? null,
    html: data.html ?? null,
    messageId: data.message_id || headerValue(data.headers, "message-id") || null,
    inReplyTo: headerValue(data.headers, "in-reply-to") || null,
    references: headerValue(data.headers, "references") || null,
    attachmentNames: attachmentMeta.map((item) => item.filename),
    attachmentMeta,
  };
}

export async function ingestInboundEmail(email: InboundEmail) {
  const mailbox = platformMailboxAddress();
  const from = parseEmailAddress(email.from);
  if (!isValidMailboxEmail(from.email) || from.email === mailbox.email) return { ok: true as const, skipped: true };
  const domain = from.email.split("@")[1] ?? "";
  const blocked = await prisma.platformBlacklistEntry.findFirst({
    where: {
      OR: [
        { type: "email", value: from.email },
        ...(domain ? [{ type: "domain", value: domain }] : []),
      ],
    },
    select: { id: true },
  });
  if (blocked) return { ok: true as const, skipped: true };

  const rfcMessageId = email.messageId ? normalizeMessageId(email.messageId) : null;
  if (email.resendEmailId) {
    const existing = await prisma.platformMailboxMessage.findUnique({
      where: { resendEmailId: email.resendEmailId },
      select: { id: true },
    });
    if (existing) return { ok: true as const, duplicate: true };
  }
  if (rfcMessageId) {
    const existing = await prisma.platformMailboxMessage.findUnique({
      where: { rfcMessageId },
      select: { id: true },
    });
    if (existing) return { ok: true as const, duplicate: true };
  }

  const replyIds = [
    ...messageIdsFromHeader(email.inReplyTo ?? undefined),
    ...messageIdsFromHeader(email.references ?? undefined),
  ];
  const matched = replyIds.length
    ? await prisma.platformMailboxMessage.findFirst({
        where: { rfcMessageId: { in: replyIds } },
        select: { threadId: true },
      })
    : null;

  const subject = oneLine(email.subject || "(no subject)", 200);
  const normalized = normalizeSubject(subject);
  let threadId = matched?.threadId;
  if (!threadId) {
    const candidates = await prisma.platformMailboxThread.findMany({
      where: { correspondentEmail: from.email, subject: normalized },
      orderBy: { lastMessageAt: "desc" },
      take: 1,
      select: { id: true },
    });
    threadId = candidates[0]?.id;
  }

  let text = (email.text ?? "").trim();
  if (!text && email.html) text = htmlToText(email.html).slice(0, 20000);
  if (!text) text = "(empty message)";
  const htmlBody = email.html ? email.html.slice(0, 100_000) : null;
  const attachments = email.attachmentNames.length ? email.attachmentNames.join(", ").slice(0, 500) : null;
  const attachmentMeta = email.attachmentMeta.length ? email.attachmentMeta : undefined;
  const toEmail =
    email.to.map((item) => parseEmailAddress(item).email).find((item) => item.includes("@")) ||
    mailbox.email;

  try {
    if (!threadId) {
      await prisma.platformMailboxThread.create({
        data: {
          subject: normalized,
          correspondentEmail: from.email,
        correspondentName: from.name,
        status: "open",
        unread: true,
        messages: {
          create: {
            direction: "in",
            fromEmail: from.email,
            toEmail,
            subject,
            textBody: text,
            htmlBody,
            attachments,
            attachmentMeta,
              resendEmailId: email.resendEmailId || null,
              rfcMessageId,
            },
          },
        },
      });
      await forwardInboundCopy(from.email, subject, text);
      return { ok: true as const };
    }

    await prisma.platformMailboxMessage.create({
      data: {
        threadId,
        direction: "in",
        fromEmail: from.email,
        toEmail,
        subject,
      textBody: text,
      htmlBody,
      attachments,
      attachmentMeta,
      resendEmailId: email.resendEmailId || null,
        rfcMessageId,
      },
    });
    await prisma.platformMailboxThread.update({
      where: { id: threadId },
      data: {
      unread: true,
      status: "open",
      lastMessageAt: new Date(),
        correspondentName: from.name ?? undefined,
      },
    });
    await forwardInboundCopy(from.email, subject, text);
    return { ok: true as const };
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return { ok: true as const, duplicate: true };
    }
    throw err;
  }
}

async function forwardInboundCopy(fromEmail: string, subject: string, text: string) {
  const to = platformMailForwardTo();
  if (!to || to === fromEmail) return;
  const { sendEmail } = await import("./email.js");
  const safe = text.slice(0, 8000).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  await sendEmail({
    to,
    subject: `Fwd: ${subject}`,
    text: `From ${fromEmail}\n\n${text.slice(0, 8000)}`,
    html: `<p>From ${fromEmail}</p><pre>${safe}</pre>`,
    replyTo: fromEmail,
    template: "mailbox-forward",
  }).catch((err) => console.error("[mailbox-forward]", err));
}
