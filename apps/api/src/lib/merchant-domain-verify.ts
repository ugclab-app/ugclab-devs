import { prisma } from "@ugclab/database";
import { checkTxtVerification, dnsInstructions } from "./custom-domain-dns.js";
import { addDomainToVercelProject } from "./vercel-domains.js";

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
    await prisma.customDomain.update({
      where: { id: record.id },
      data: { lastDnsCheckAt: now, lastDnsOk: false },
    });
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

  return {
    ok: true as const,
    dnsOk: true,
    records: check.records,
    vercel,
    instructions: dnsInstructions(record.domain, record.verificationToken),
    domain: updated,
  };
}
