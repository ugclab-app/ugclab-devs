import { prisma } from "@ugclab/database";

export async function logPlatformEmail(opts: {
  to: string;
  subject: string;
  template?: string;
  status?: string;
}) {
  try {
    await prisma.platformEmailLog.create({
      data: {
        to: opts.to,
        subject: opts.subject.slice(0, 500),
        template: opts.template ?? null,
        status: opts.status ?? "sent",
      },
    });
  } catch (e) {
    console.warn("[email-log]", e);
  }
}
