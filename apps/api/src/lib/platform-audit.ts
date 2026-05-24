import { prisma } from "@ugclab/database";

export async function logPlatformAudit(opts: {
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetUserId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.platformAuditLog.create({
    data: {
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      action: opts.action,
      targetUserId: opts.targetUserId ?? null,
      summary: opts.summary,
      meta: opts.meta as object | undefined,
    },
  });
}
