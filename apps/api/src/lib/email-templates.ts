import { randomBytes } from "node:crypto";
import { prisma } from "@ugclab/database";
import { EMAIL_TEMPLATE_SEED } from "../data/email-template-seed.js";
import { sendEmail } from "./email.js";

function isOutreachTemplateKey(key: string) {
  return key.startsWith("outreach_") || key === "merchant_outreach";
}

export type EmailTemplateRow = {
  key: string;
  label: string;
  subject: string;
  html: string;
  text: string | null;
};

function newId() {
  return `et_${randomBytes(8).toString("hex")}`;
}

export async function ensureEmailTemplates() {
  for (const t of EMAIL_TEMPLATE_SEED) {
    if (isOutreachTemplateKey(t.key)) {
      await prisma.$executeRaw`
        INSERT INTO "PlatformEmailTemplate" (id, key, label, subject, html, text, "createdAt", "updatedAt")
        VALUES (${newId()}, ${t.key}, ${t.label}, ${t.subject}, ${t.html}, ${t.text ?? null}, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          label = EXCLUDED.label,
          subject = EXCLUDED.subject,
          html = EXCLUDED.html,
          text = EXCLUDED.text,
          "updatedAt" = NOW()
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "PlatformEmailTemplate" (id, key, label, subject, html, text, "createdAt", "updatedAt")
        VALUES (${newId()}, ${t.key}, ${t.label}, ${t.subject}, ${t.html}, ${t.text ?? null}, NOW(), NOW())
        ON CONFLICT (key) DO NOTHING
      `;
    }
  }
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  return prisma.$queryRaw<EmailTemplateRow[]>`
    SELECT key, label, subject, html, text
    FROM "PlatformEmailTemplate"
    ORDER BY key ASC
  `;
}

export async function getEmailTemplateByKey(key: string): Promise<EmailTemplateRow | null> {
  const rows = await prisma.$queryRaw<EmailTemplateRow[]>`
    SELECT key, label, subject, html, text
    FROM "PlatformEmailTemplate"
    WHERE key = ${key}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateEmailTemplateByKey(
  key: string,
  data: { label?: string; subject?: string; html?: string; text?: string | null }
) {
  const current = await getEmailTemplateByKey(key);
  if (!current) throw new Error(`Template not found: ${key}`);
  await prisma.$executeRaw`
    UPDATE "PlatformEmailTemplate"
    SET
      label = ${data.label ?? current.label},
      subject = ${data.subject ?? current.subject},
      html = ${data.html ?? current.html},
      text = ${data.text !== undefined ? data.text : current.text},
      "updatedAt" = NOW()
    WHERE key = ${key}
  `;
  return getEmailTemplateByKey(key);
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

export async function sendTemplatedEmail(opts: {
  key: string;
  to: string;
  vars?: Record<string, string>;
}) {
  const row = await getEmailTemplateByKey(opts.key);
  if (!row) throw new Error(`Template not found: ${opts.key}`);
  const vars = opts.vars ?? {};
  const outreachHighPriority =
    process.env.OUTREACH_HIGH_PRIORITY !== "false" && isOutreachTemplateKey(opts.key);

  await sendEmail({
    to: opts.to,
    subject: renderTemplate(row.subject, vars),
    html: renderTemplate(row.html, vars),
    text: row.text ? renderTemplate(row.text, vars) : undefined,
    template: row.key,
    priority: outreachHighPriority ? "high" : "normal",
  });
}
