import type { Hono } from "hono";
import { OrderStatus, prisma } from "@ugclab/database";
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

function parseProspectLine(line: string): { email: string; name?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const angled = trimmed.match(/^(.*)<([^>]+)>$/);
  if (angled?.[1] != null && angled[2]) {
    const email = angled[2].trim().toLowerCase();
    const name = angled[1].trim().replace(/^["']|["']$/g, "");
    return isValidEmail(email) ? { email, name: name || undefined } : null;
  }
  const comma = trimmed.split(",");
  if (comma.length >= 2) {
    const email = (comma[comma.length - 1] ?? "").trim().toLowerCase();
    const name = comma.slice(0, -1).join(",").trim();
    return isValidEmail(email) ? { email, name: name || undefined } : null;
  }
  const email = trimmed.toLowerCase();
  return isValidEmail(email) ? { email } : null;
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
    const prospects = await prisma.outreachProspect.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

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
      prospects: prospects.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        templateKey: row.templateKey,
        status: row.status,
        sentAt: row.sentAt?.toISOString() ?? null,
        registeredAt: row.registeredAt?.toISOString() ?? null,
      })),
    });
  });

  platform.post("/outreach/prospects", requirePlatformPerm("outreach:send"), async (c) => {
    const body = await c.req.json<{ text?: string; templateKey?: string }>();
    const resolved = await resolveOutreachTemplateKey(body.templateKey);
    if ("error" in resolved) {
      return c.json({ error: resolved.error }, resolved.status);
    }
    const lines = String(body.text ?? "").split(/\r?\n/);
    let added = 0;
    let registered = 0;
    let skipped = 0;
    for (const line of lines) {
      const parsed = parseProspectLine(line);
      if (!parsed) {
        if (line.trim()) skipped += 1;
        continue;
      }
      const user = await prisma.user.findUnique({
        where: { email: parsed.email },
        select: { id: true },
      });
      const existing = await prisma.outreachProspect.findUnique({
        where: { email: parsed.email },
        select: { status: true },
      });
      if (user || existing?.status === "REGISTERED") {
        await prisma.outreachProspect.upsert({
          where: { email: parsed.email },
          create: {
            email: parsed.email,
            name: parsed.name,
            templateKey: resolved.key,
            status: "REGISTERED",
            registeredAt: new Date(),
          },
          update: { status: "REGISTERED", registeredAt: new Date(), name: parsed.name },
        });
        registered += 1;
        continue;
      }
      if (existing?.status === "SENT") {
        skipped += 1;
        continue;
      }
      await prisma.outreachProspect.upsert({
        where: { email: parsed.email },
        create: {
          email: parsed.email,
          name: parsed.name,
          templateKey: resolved.key,
          status: "PENDING",
        },
        update: { name: parsed.name, templateKey: resolved.key },
      });
      added += 1;
    }
    return c.json({ added, registered, skipped });
  });

  platform.post("/outreach/prospects/send", requirePlatformPerm("outreach:send"), async (c) => {
    if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
      return c.json({ error: "Email provider not configured. Set RESEND_API_KEY or SENDGRID_API_KEY." }, 503);
    }
    const session = c.get("session");
    let sentToday = await countOutreachToday(session.sub);
    const pending = await prisma.outreachProspect.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: Math.max(0, DAILY_LIMIT - sentToday),
    });
    let sent = 0;
    let registered = 0;
    for (const row of pending) {
      if (sentToday >= DAILY_LIMIT) break;
      const user = await prisma.user.findUnique({
        where: { email: row.email },
        select: { id: true },
      });
      if (user) {
        await prisma.outreachProspect.update({
          where: { id: row.id },
          data: { status: "REGISTERED", registeredAt: new Date() },
        });
        registered += 1;
        continue;
      }
      const resolved = await resolveOutreachTemplateKey(row.templateKey);
      if ("error" in resolved) continue;
      const vars = outreachVars(row.name ?? undefined);
      await sendTemplatedEmail({ key: resolved.key, to: row.email, vars });
      await prisma.outreachProspect.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), templateKey: resolved.key },
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "outreach.email_sent",
        summary: `Outreach (${resolved.template.label}) → ${row.email}`,
        meta: {
          email: row.email,
          name: vars.name,
          templateKey: resolved.key,
          templateLabel: resolved.template.label,
        },
      });
      sent += 1;
      sentToday += 1;
    }
    return c.json({
      sent,
      registered,
      remaining: Math.max(0, DAILY_LIMIT - sentToday),
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

    await prisma.outreachProspect.upsert({
      where: { email },
      create: {
        email,
        name: name || null,
        templateKey: resolved.key,
        status: "SENT",
        sentAt: new Date(),
      },
      update: {
        name: name || undefined,
        templateKey: resolved.key,
        status: "SENT",
        sentAt: new Date(),
      },
    });

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

  platform.get("/growth", requirePlatformPerm("dashboard:read"), async (c) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tenants = await prisma.tenant.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        owner: { select: { email: true } },
        _count: { select: { products: true } },
      },
    });
    const paid =
      tenants.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ["tenantId"],
            where: {
              tenantId: { in: tenants.map((t) => t.id) },
              status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
            },
            _count: true,
          });
    const paidIds = new Set(paid.map((row) => row.tenantId));
    const bySource = { outreach: 0, partner: 0, direct: 0, earlier: 0 };
    let withProduct = 0;
    let withPaidOrder = 0;
    const rows = tenants.map((tenant) => {
      const source = tenant.acquisitionSource || "earlier";
      if (source === "outreach" || source === "partner" || source === "direct") bySource[source] += 1;
      else bySource.earlier += 1;
      const hasProduct = tenant._count.products > 0;
      const hasPaidOrder = paidIds.has(tenant.id);
      if (hasProduct) withProduct += 1;
      if (hasPaidOrder) withPaidOrder += 1;
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        ownerEmail: tenant.owner.email,
        source,
        hasProduct,
        hasPaidOrder,
        createdAt: tenant.createdAt.toISOString(),
      };
    });
    return c.json({
      since: since.toISOString(),
      signups: tenants.length,
      bySource,
      withProduct,
      withPaidOrder,
      stores: rows,
    });
  });
}
