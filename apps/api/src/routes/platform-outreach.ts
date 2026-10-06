import type { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requirePlatformPerm } from "../middleware/platform-perm.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  ensureEmailTemplates,
  getEmailTemplateByKey,
  listEmailTemplates,
  sendTemplatedEmail,
} from "../lib/email-templates.js";
import {
  buildOutreachTemplateVars,
  DEFAULT_OUTREACH_TEMPLATE_KEY,
  filterOutreachTemplates,
  isOutreachTemplateKey,
  renderOutreachPreview,
  sortOutreachTemplates,
} from "../lib/outreach-templates.js";

const DAILY_LIMIT = 30;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function outreachVars(name?: string) {
  return buildOutreachTemplateVars(name);
}

async function countOutreachToday(actorUserId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return prisma.platformAuditLog.count({
    where: {
      actorUserId,
      action: "outreach.email_sent",
      createdAt: { gte: start },
    },
  });
}

async function resolveOutreachTemplateKey(requested?: string) {
  await ensureEmailTemplates();
  const key = requested?.trim() || DEFAULT_OUTREACH_TEMPLATE_KEY;
  if (!isOutreachTemplateKey(key)) {
    return { error: "Invalid outreach template" as const, status: 400 as const };
  }
  const template = await getEmailTemplateByKey(key);
  if (!template) {
    return { error: "Template not found — open Email templates once" as const, status: 404 as const };
  }
  return { key, template };
}

export function registerPlatformOutreachRoutes(platform: Hono<AuthEnv>) {
  platform.get("/outreach", requirePlatformPerm("outreach:send"), async (c) => {
    await ensureEmailTemplates();
    const outreachRows = sortOutreachTemplates(
      filterOutreachTemplates(await listEmailTemplates())
    );
    const session = c.get("session");
    const sentToday = await countOutreachToday(session.sub);
    const recent = await prisma.platformAuditLog.findMany({
      where: { action: "outreach.email_sent" },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        actorEmail: true,
        summary: true,
        meta: true,
        createdAt: true,
      },
    });

    const vars = outreachVars();
    const templates = outreachRows.map((t) => renderOutreachPreview(t, vars));

    return c.json({
      templates,
      defaultTemplateKey: templates.some((t) => t.key === DEFAULT_OUTREACH_TEMPLATE_KEY)
        ? DEFAULT_OUTREACH_TEMPLATE_KEY
        : (templates[0]?.key ?? DEFAULT_OUTREACH_TEMPLATE_KEY),
      signupUrl: vars.signupUrl,
      platformName: vars.platformName,
      limits: { daily: DAILY_LIMIT, sentToday, remaining: Math.max(0, DAILY_LIMIT - sentToday) },
      recent: recent.map((r) => {
        const meta = r.meta as { email?: string; templateKey?: string; templateLabel?: string } | null;
        return {
          id: r.id,
          actorEmail: r.actorEmail,
          summary: r.summary,
          email: meta?.email ?? null,
          templateKey: meta?.templateKey ?? null,
          templateLabel: meta?.templateLabel ?? null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
      emailConfigured: Boolean(
        process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
      ),
    });
  });

  platform.post("/outreach/send", requirePlatformPerm("outreach:send"), async (c) => {
    if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
      return c.json(
        {
          error:
            "Email provider not configured. Set RESEND_API_KEY or SENDGRID_API_KEY.",
        },
        503
      );
    }

    const body = await c.req.json<{ email?: string; name?: string; templateKey?: string }>();
    const email = String(body.email ?? "")
      .toLowerCase()
      .trim();
    const name = body.name?.trim();

    if (!email || !isValidEmail(email)) {
      return c.json({ error: "Valid email required" }, 400);
    }

    const session = c.get("session");
    const sentToday = await countOutreachToday(session.sub);
    if (sentToday >= DAILY_LIMIT) {
      return c.json(
        { error: `Daily limit reached (${DAILY_LIMIT} emails per admin)` },
        429
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return c.json(
        { error: "This email is already registered on the platform", userId: existing.id },
        409
      );
    }

    const resolved = await resolveOutreachTemplateKey(body.templateKey);
    if ("error" in resolved) {
      return c.json({ error: resolved.error }, resolved.status);
    }

    const vars = outreachVars(name);
    await sendTemplatedEmail({ key: resolved.key, to: email, vars });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "outreach.email_sent",
      summary: `Outreach (${resolved.template.label}) → ${email}`,
      meta: {
        email,
        name: vars.name,
        templateKey: resolved.key,
        templateLabel: resolved.template.label,
      },
    });

    return c.json({
      ok: true,
      sentTo: email,
      templateKey: resolved.key,
      remaining: Math.max(0, DAILY_LIMIT - sentToday - 1),
    });
  });
}
