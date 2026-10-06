import { prisma } from "@ugclab/database";
import { checkTxtVerification } from "./custom-domain-dns.js";
import { logPlatformAudit } from "./platform-audit.js";

const SYSTEM_EMAIL = "system@platform.local";

export async function autoVerifyPendingDomains(limit = 50) {
  const pending = await prisma.customDomain.findMany({
    where: { verified: false },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let verified = 0;
  let checked = 0;
  const now = new Date();

  for (const d of pending) {
    checked += 1;
    const check = await checkTxtVerification(d.domain, d.verificationToken);
    if (check.ok) {
      await prisma.customDomain.update({
        where: { id: d.id },
        data: {
          verified: true,
          verifiedAt: now,
          verifiedByEmail: "dns:auto-cron",
          lastDnsCheckAt: now,
          lastDnsOk: true,
        },
      });
      await logPlatformAudit({
        actorUserId: "system",
        actorEmail: SYSTEM_EMAIL,
        action: "domain.verify",
        summary: `Auto-verified ${d.domain}`,
        meta: { domainId: d.id, tenantId: d.tenantId, via: "cron" },
      });
      verified += 1;
    } else {
      await prisma.customDomain.update({
        where: { id: d.id },
        data: { lastDnsCheckAt: now, lastDnsOk: false },
      });
    }
  }

  return { checked, verified };
}
