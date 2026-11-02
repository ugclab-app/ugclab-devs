import { prisma } from "@ugclab/database";
import { isDomainBlacklisted, normalizeDomainInput } from "./custom-domain.js";
import { checkTxtVerification, dnsInstructions } from "./custom-domain-dns.js";
import { assertTenantCanAddDomain } from "./platform-domain-policy.js";
import { addDomainToVercelProject } from "./vercel-domains.js";

/** Attach a domain Entri has already registered and pointed at the storefront. */
export async function attachEntriPurchasedDomain(
  tenantId: string,
  rawDomain: string,
  actorEmail: string
) {
  const apex = normalizeDomainInput(rawDomain).replace(/^www\./, "");
  if (!apex.includes(".")) throw new Error("Enter a valid domain");
  const hosts = [apex, `www.${apex}`];
  const attached: string[] = [];

  for (const host of hosts) {
    if (await isDomainBlacklisted(host)) {
      throw new Error("This domain cannot be used");
    }
    const taken = await prisma.customDomain.findUnique({ where: { domain: host } });
    if (taken && taken.tenantId !== tenantId) {
      throw new Error(`${host} is already registered to another store`);
    }
    if (taken?.verified) {
      attached.push(host);
      continue;
    }
    if (!taken) {
      try {
        await assertTenantCanAddDomain(tenantId);
      } catch (err) {
        if (host.startsWith("www.") && attached.length > 0) break;
        throw err;
      }
      await prisma.customDomain.create({
        data: {
          tenantId,
          domain: host,
          verified: true,
          verifiedAt: new Date(),
          verifiedByEmail: `entri:${actorEmail}`,
          lastDnsOk: true,
          lastDnsCheckAt: new Date(),
        },
      });
    } else {
      await prisma.customDomain.update({
        where: { id: taken.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
          verifiedByEmail: `entri:${actorEmail}`,
          lastDnsOk: true,
          lastDnsCheckAt: new Date(),
        },
      });
    }
    attached.push(host);
    addDomainToVercelProject(host).catch((err) =>
      console.error("[entri] vercel domain", host, err)
    );
    if (host === apex) {
      const { notifyDomainConnected } = await import("./owner-alerts.js");
      notifyDomainConnected(tenantId, host).catch((err) =>
        console.error("[email] domain connected", err)
      );
    }
  }

  return { domains: attached };
}

export async function verifyMerchantDomainDns(
  tenantId: string,
  domainId: string,
  actorEmail: string
) {
  const record = await prisma.customDomain.findFirst({
    where: { id: domainId, tenantId },
  });
  if (!record) throw new Error("Domain not found");

  const check = await checkTxtVerification(record.domain, record.verificationToken);
  const now = new Date();

  if (!check.ok) {
    const recentFail =
      record.lastDnsOk === false &&
      record.lastDnsCheckAt != null &&
      now.getTime() - record.lastDnsCheckAt.getTime() < 24 * 60 * 60 * 1000;
    await prisma.customDomain.update({
      where: { id: record.id },
      data: { lastDnsCheckAt: now, lastDnsOk: false },
    });
    if (!recentFail) {
      const { notifyDomainCheckFailed } = await import("./owner-alerts.js");
      notifyDomainCheckFailed(tenantId, record.domain).catch((err) =>
        console.error("[email] domain check", err)
      );
    }
    return {
      ok: false as const,
      dnsOk: false,
      records: check.records,
      error: check.error ?? "TXT record not found. Add the record at your registrar and wait a few minutes.",
      instructions: dnsInstructions(record.domain, record.verificationToken),
      domain: record,
    };
  }

  const updated = await prisma.customDomain.update({
    where: { id: record.id },
    data: {
      verified: true,
      verifiedAt: now,
      verifiedByEmail: actorEmail,
      lastDnsCheckAt: now,
      lastDnsOk: true,
    },
  });

  const vercel = await addDomainToVercelProject(record.domain);

  if (!record.verified) {
    const { notifyDomainConnected } = await import("./owner-alerts.js");
    notifyDomainConnected(tenantId, record.domain).catch((err) =>
      console.error("[email] domain connected", err)
    );
  }

  return {
    ok: true as const,
    dnsOk: true,
    records: check.records,
    vercel,
    instructions: dnsInstructions(record.domain, record.verificationToken),
    domain: updated,
  };
}
