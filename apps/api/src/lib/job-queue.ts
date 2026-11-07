import { prisma, type BackgroundJobStatus } from "@ugclab/database";

const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000, 12 * 3600_000];

export type JobType = "email.send";

export async function enqueueJob(
  type: JobType | string,
  payload: Record<string, unknown>,
  opts?: { runAt?: Date; maxAttempts?: number }
) {
  return prisma.backgroundJob.create({
    data: {
      type,
      payload: payload as object,
      runAt: opts?.runAt ?? new Date(),
      maxAttempts: opts?.maxAttempts ?? 8,
      status: "PENDING",
    },
  });
}

function nextRunAt(attempts: number): Date | null {
  const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];
  if (!delay) return null;
  return new Date(Date.now() + delay);
}

async function runHandler(type: string, payload: Record<string, unknown>) {
  if (type === "email.send") {
    const { sendEmailDirect } = await import("./email.js");
    await sendEmailDirect(payload as Parameters<typeof sendEmailDirect>[0]);
    return;
  }
  throw new Error(`Unknown job type: ${type}`);
}

export async function processJobById(id: string) {
  const job = await prisma.backgroundJob.findUnique({ where: { id } });
  if (!job || job.status === "SUCCESS" || job.status === "DEAD") return job?.status ?? null;

  const attempts = job.attempts + 1;
  await prisma.backgroundJob.update({
    where: { id },
    data: { status: "PROCESSING", attempts, lockedAt: new Date() },
  });

  try {
    await runHandler(job.type, job.payload as Record<string, unknown>);
    await prisma.backgroundJob.update({
      where: { id },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        lastError: null,
        lockedAt: null,
        runAt: job.runAt,
      },
    });
    return "SUCCESS" satisfies BackgroundJobStatus;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const dead = attempts >= job.maxAttempts;
    const next = dead ? null : nextRunAt(attempts);
    await prisma.backgroundJob.update({
      where: { id },
      data: {
        status: dead ? "DEAD" : "FAILED",
        lastError: message.slice(0, 1000),
        lockedAt: null,
        runAt: next ?? new Date(),
        ...(dead ? { completedAt: new Date() } : {}),
      },
    });
    if (dead) console.warn(`[job-queue] ${job.type} dead after ${attempts}: ${message}`);
    return dead ? "DEAD" : "FAILED";
  }
}

/** Cron: pick due jobs and run them. FAILED jobs retry when runAt has elapsed. */
export async function processDueJobs(limit = 25) {
  const now = new Date();
  const due = await prisma.backgroundJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      runAt: { lte: now },
    },
    orderBy: { runAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let ok = 0;
  let fail = 0;
  for (const row of due) {
    const status = await processJobById(row.id);
    if (status === "SUCCESS") ok += 1;
    else fail += 1;
  }
  return { processed: due.length, ok, fail };
}
