import type { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  clearPrimaryForTenant,
  isDomainBlacklisted,
  mapPlatformDomainRow,
  newVerificationToken,
  normalizeDomainInput,
} from "../lib/custom-domain.js";
import { checkTxtVerification, dnsInstructions } from "../lib/custom-domain-dns.js";
import { addDomainToVercelProject } from "../lib/vercel-domains.js";
import { sendTemplatedEmail } from "../lib/email-templates.js";
import { ensureEmailTemplates } from "../lib/email-templates.js";
import {
  getPlatformDomainConfig,
  setMaxCustomDomainsDefault,
  assertTenantCanAddDomain,
  listTenantsDomainUsage,
} from "../lib/platform-domain-policy.js";

const domainInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
      featureFlags: true,
      owner: { select: { email: true } },
    },
  },
} as const;

function escapeCsv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function registerPlatformDomainsRoutes(platform: Hono<AuthEnv>) {
  platform.get("/domains/config", async (c) => {
    const [config, usage] = await Promise.all([
      getPlatformDomainConfig(),
      listTenantsDomainUsage(),
    ]);
    return c.json({ config, usage });
  });

  platform.patch("/domains/config", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ maxCustomDomainsDefault?: number }>();
    if (body.maxCustomDomainsDefault == null) {
      return c.json({ error: "maxCustomDomainsDefault required" }, 400);
    }
    const limit = await setMaxCustomDomainsDefault(body.maxCustomDomainsDefault);
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domains.config.update",
      summary: `Default domain limit set to ${limit}`,
    });
    return c.json({ config: await getPlatformDomainConfig() });
  });

  platform.get("/domains", async (c) => {
    const status = c.req.query("status") ?? "all";
    const q = (c.req.query("q") ?? "").trim().toLowerCase();

    const where: {
      verified?: boolean;
      AND?: Array<Record<string, unknown>>;
    } = {};

    if (status === "pending") {
      where.verified = false;
    } else if (status === "verified") {
      where.verified = true;
    } else if (status === "dns_ok") {
      where.verified = false;
      where.AND = [{ lastDnsOk: true }];
    }

    if (q) {
      const searchOr = [
        { domain: { contains: q, mode: "insensitive" as const } },
        { tenant: { slug: { contains: q, mode: "insensitive" as const } } },
        { tenant: { name: { contains: q, mode: "insensitive" as const } } },
        { tenant: { owner: { email: { contains: q, mode: "insensitive" as const } } } },
      ];
      where.AND = [...(where.AND ?? []), { OR: searchOr }];
    }

    const [domains, total, pending, verified, tenantsWithDomain] = await Promise.all([
      prisma.customDomain.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: domainInclude,
      }),
      prisma.customDomain.count(),
      prisma.customDomain.count({ where: { verified: false } }),
      prisma.customDomain.count({ where: { verified: true } }),
      prisma.customDomain.groupBy({
        by: ["tenantId"],
        _count: { tenantId: true },
      }),
    ]);

    return c.json({
      summary: {
        total,
        pending,
        verified,
        tenantsWithCustomDomain: tenantsWithDomain.length,
      },
      domains: domains.map(mapPlatformDomainRow),
    });
  });

  platform.get("/domains/export.csv", async (c) => {
    const domains = await prisma.customDomain.findMany({
      orderBy: { createdAt: "desc" },
      include: domainInclude,
    });
    const header = "domain,store_slug,verified,created_at";
    const rows = domains.map((d) =>
      [
        escapeCsv(d.domain),
        escapeCsv(d.tenant.slug),
        d.verified ? "yes" : "no",
        d.createdAt.toISOString(),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="domains.csv"',
      },
    });
  });

  platform.post("/domains", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ tenantId?: string; domain?: string }>();
    const tenantId = String(body.tenantId ?? "").trim();
    const domain = normalizeDomainInput(body.domain ?? "");
    if (!tenantId || !domain) {
      return c.json({ error: "tenantId and domain required" }, 400);
    }
    if (await isDomainBlacklisted(domain)) {
      return c.json({ error: "Domain is not allowed on this platform" }, 403);
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return c.json({ error: "Store not found" }, 404);

    const existing = await prisma.customDomain.findUnique({ where: { domain } });
    if (existing) return c.json({ error: "Domain already registered" }, 409);

    try {
      await assertTenantCanAddDomain(tenantId);
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : "Domain limit reached" },
        400
      );
    }

    const created = await prisma.customDomain.create({
      data: {
        tenantId,
        domain,
        verificationToken: newVerificationToken(),
      },
      include: domainInclude,
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domain.create",
      summary: `Attached domain ${domain} to ${tenant.slug}`,
      meta: { domainId: created.id, tenantId, domain },
    });

    return c.json({ domain: mapPlatformDomainRow(created) }, 201);
  });

  platform.post("/domains/pair", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ tenantId?: string; apex?: string }>();
    const tenantId = String(body.tenantId ?? "").trim();
    const apex = normalizeDomainInput(body.apex ?? "");
    if (!tenantId || !apex) {
      return c.json({ error: "tenantId and apex required" }, 400);
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return c.json({ error: "Store not found" }, 404);

    const hosts = apex.startsWith("www.") ? [apex] : [apex, `www.${apex}`];
    const created: ReturnType<typeof mapPlatformDomainRow>[] = [];

    for (const domain of hosts) {
      if (await isDomainBlacklisted(domain)) {
        return c.json({ error: `Domain not allowed: ${domain}` }, 403);
      }
      const row = await prisma.customDomain.upsert({
        where: { domain },
        create: {
          tenantId,
          domain,
          verificationToken: newVerificationToken(),
        },
        update: {},
        include: domainInclude,
      });
      created.push(mapPlatformDomainRow(row));
    }

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domain.pair",
      summary: `Attached apex/www pair for ${apex} to ${tenant.slug}`,
      meta: { tenantId, apex, domains: hosts },
    });

    return c.json({ domains: created }, 201);
  });

  platform.get("/domains/:id/dns", async (c) => {
    const record = await prisma.customDomain.findUnique({
      where: { id: c.req.param("id") },
    });
    if (!record) return c.json({ error: "Not found" }, 404);
    return c.json({
      instructions: dnsInstructions(record.domain, record.verificationToken),
      verificationToken: record.verificationToken,
    });
  });

  platform.get("/domains/:id/history", async (c) => {
    const id = c.req.param("id");
    const record = await prisma.customDomain.findUnique({ where: { id } });
    if (!record) return c.json({ error: "Not found" }, 404);

    const logs = await prisma.platformAuditLog.findMany({
      where: {
        OR: [
          { meta: { path: ["domainId"], equals: id } },
          { summary: { contains: record.domain } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return c.json({
      events: logs.map((e) => ({
        id: e.id,
        action: e.action,
        actorEmail: e.actorEmail,
        summary: e.summary,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  });

  platform.post("/domains/:id/check-dns", async (c) => {
    const session = c.get("session");
    const record = await prisma.customDomain.findUnique({
      where: { id: c.req.param("id") },
      include: domainInclude,
    });
    if (!record) return c.json({ error: "Not found" }, 404);

    const check = await checkTxtVerification(record.domain, record.verificationToken);
    const now = new Date();

    if (check.ok) {
      const updated = await prisma.customDomain.update({
        where: { id: record.id },
        data: {
          lastDnsCheckAt: now,
          lastDnsOk: true,
          verified: true,
          verifiedAt: now,
          verifiedByEmail: session.email,
        },
        include: domainInclude,
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "domain.verify",
        summary: `DNS verified ${record.domain}`,
        meta: { domainId: record.id, tenantId: record.tenantId, via: "dns" },
      });
      const vercel = await addDomainToVercelProject(record.domain);
      return c.json({
        ok: true,
        dnsOk: true,
        records: check.records,
        vercel,
        domain: mapPlatformDomainRow(updated),
      });
    }

    const updated = await prisma.customDomain.update({
      where: { id: record.id },
      data: { lastDnsCheckAt: now, lastDnsOk: false },
      include: domainInclude,
    });
    return c.json({
      ok: false,
      dnsOk: false,
      records: check.records,
      error: check.error ?? "TXT record not found or mismatch",
      domain: mapPlatformDomainRow(updated),
    });
  });

  platform.post("/domains/:id/verify", async (c) => {
    const session = c.get("session");
    const record = await prisma.customDomain.findUnique({
      where: { id: c.req.param("id") },
      include: domainInclude,
    });
    if (!record) return c.json({ error: "Not found" }, 404);
    const now = new Date();
    const updated = await prisma.customDomain.update({
      where: { id: record.id },
      data: {
        verified: true,
        verifiedAt: now,
        verifiedByEmail: session.email,
        lastDnsOk: true,
        lastDnsCheckAt: now,
      },
      include: domainInclude,
    });
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domain.verify",
      summary: `Manually verified domain ${record.domain}`,
      meta: { domainId: record.id, tenantId: record.tenantId, via: "manual" },
    });
    return c.json({ domain: mapPlatformDomainRow(updated) });
  });

  platform.post("/domains/:id/unverify", async (c) => {
    const session = c.get("session");
    const record = await prisma.customDomain.findUnique({
      where: { id: c.req.param("id") },
      include: domainInclude,
    });
    if (!record) return c.json({ error: "Not found" }, 404);
    const updated = await prisma.customDomain.update({
      where: { id: record.id },
      data: {
        verified: false,
        verifiedAt: null,
        verifiedByEmail: null,
        isPrimary: false,
        lastDnsOk: null,
      },
      include: domainInclude,
    });
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domain.unverify",
      summary: `Revoked verification for ${record.domain}`,
      meta: { domainId: record.id, tenantId: record.tenantId },
    });
    return c.json({ domain: mapPlatformDomainRow(updated) });
  });

  platform.patch("/domains/:id/primary", async (c) => {
    const session = c.get("session");
    const record = await prisma.customDomain.findUnique({
      where: { id: c.req.param("id") },
      include: domainInclude,
    });
    if (!record) return c.json({ error: "Not found" }, 404);
    if (!record.verified) {
      return c.json({ error: "Only verified domains can be primary" }, 400);
    }
    await clearPrimaryForTenant(record.tenantId, record.id);
    const updated = await prisma.customDomain.update({
      where: { id: record.id },
      data: { isPrimary: true },
      include: domainInclude,
    });
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domain.primary",
      summary: `Set primary domain ${record.domain}`,
      meta: { domainId: record.id, tenantId: record.tenantId },
    });
    return c.json({ domain: mapPlatformDomainRow(updated) });
  });

  platform.delete("/domains/:id", async (c) => {
    const session = c.get("session");
    const record = await prisma.customDomain.findUnique({
      where: { id: c.req.param("id") },
    });
    if (!record) return c.json({ error: "Not found" }, 404);
    await prisma.customDomain.delete({ where: { id: record.id } });
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "domain.delete",
      summary: `Deleted domain ${record.domain}`,
      meta: { domainId: record.id, tenantId: record.tenantId, domain: record.domain },
    });
    return c.json({ ok: true });
  });

  platform.post("/domains/bulk-verify", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ ids?: string[] }>();
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return c.json({ error: "ids required" }, 400);
    const now = new Date();
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const id of ids) {
      const record = await prisma.customDomain.findUnique({ where: { id } });
      if (!record) {
        results.push({ id, ok: false, error: "not found" });
        continue;
      }
      const check = await checkTxtVerification(record.domain, record.verificationToken);
      if (!check.ok) {
        await prisma.customDomain.update({
          where: { id },
          data: { lastDnsCheckAt: now, lastDnsOk: false },
        });
        results.push({ id, ok: false, error: check.error ?? "DNS mismatch" });
        continue;
      }
      await prisma.customDomain.update({
        where: { id },
        data: {
          verified: true,
          verifiedAt: now,
          verifiedByEmail: session.email,
          lastDnsCheckAt: now,
          lastDnsOk: true,
        },
      });
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "domain.verify",
        summary: `Bulk DNS verified ${record.domain}`,
        meta: { domainId: id, tenantId: record.tenantId, via: "bulk-dns" },
      });
      results.push({ id, ok: true });
    }

    return c.json({ results });
  });

  platform.post("/domains/bulk-remind", async (c) => {
    const body = await c.req.json<{ ids?: string[] }>();
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return c.json({ error: "ids required" }, 400);

    const records = await prisma.customDomain.findMany({
      where: { id: { in: ids }, verified: false },
      include: domainInclude,
    });

    await ensureEmailTemplates();
    const sent: string[] = [];
    for (const d of records) {
      const instr = dnsInstructions(d.domain, d.verificationToken);
      try {
        await sendTemplatedEmail({
          key: "domain_reminder",
          to: d.tenant.owner.email,
          vars: {
            domain: d.domain,
            txtValue: instr.txtValue,
          },
        });
        sent.push(d.id);
      } catch (e) {
        console.error("[domain-remind]", d.id, e);
      }
    }

    return c.json({ sent: sent.length, ids: sent });
  });
}
