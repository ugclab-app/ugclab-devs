import { prisma } from "@ugclab/database";

export async function logActivity(opts: {
  tenantId: string;
  userId?: string | null;
  userEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      tenantId: opts.tenantId,
      userId: opts.userId ?? null,
      userEmail: opts.userEmail,
      action: opts.action,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      summary: opts.summary,
      meta: opts.meta as object | undefined,
    },
  });
}
