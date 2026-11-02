import { prisma } from "@ugclab/database";

export async function recordStoreAcquisition(opts: {
  tenantId: string;
  email: string;
  partnerAttributed: boolean;
}) {
  const email = opts.email.toLowerCase();
  const prospect = await prisma.outreachProspect.findUnique({ where: { email } });
  const source = opts.partnerAttributed ? "partner" : prospect ? "outreach" : "direct";
  await prisma.tenant.update({
    where: { id: opts.tenantId },
    data: { acquisitionSource: source },
  });
  if (prospect && prospect.status !== "REGISTERED") {
    await prisma.outreachProspect.update({
      where: { id: prospect.id },
      data: { status: "REGISTERED", registeredAt: new Date() },
    });
  }
}
