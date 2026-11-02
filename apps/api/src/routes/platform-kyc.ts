import { readFile } from "fs/promises";
import path from "path";
import type { Context, Hono } from "hono";
import { MerchantKycStatus, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { isKycStorageKey, resolveUploadKey } from "../lib/uploads.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import { notifyMerchantKycDecision } from "../lib/kyc-email.js";

const STATUSES = new Set<string>([
  MerchantKycStatus.PENDING,
  MerchantKycStatus.APPROVED,
  MerchantKycStatus.REJECTED,
]);

function superAdminOnly(c: Context<AuthEnv>) {
  if (c.get("session").role !== "SUPER_ADMIN") {
    return c.json({ error: "Forbidden — super admin only" }, 403);
  }
  return null;
}

export function registerPlatformKycRoutes(platform: Hono<AuthEnv>) {
  platform.get("/kyc", async (c) => {
    const denied = superAdminOnly(c);
    if (denied) return denied;
    const statusRaw = c.req.query("status")?.toUpperCase();
    const status = statusRaw && STATUSES.has(statusRaw) ? (statusRaw as MerchantKycStatus) : undefined;
    const q = c.req.query("q")?.trim() ?? "";
    const rows = await prisma.merchantKyc.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { legalName: { contains: q, mode: "insensitive" } },
                { passportNumber: { contains: q, mode: "insensitive" } },
                { tenant: { slug: { contains: q, mode: "insensitive" } } },
                { tenant: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            settings: { select: { taxFormLegalName: true } },
          },
        },
      },
    });
    return c.json({
      submissions: rows.map((row) => ({
        id: row.id,
        status: row.status,
        legalName: row.legalName,
        country: row.country,
        passportNumber: row.passportNumber,
        payoutLegalName: row.tenant.settings?.taxFormLegalName ?? null,
        hasSelfie: Boolean(row.selfieFile),
        rejectReason: row.rejectReason,
        reviewedByEmail: row.reviewedByEmail,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        submittedAt: row.createdAt.toISOString(),
        tenant: { id: row.tenant.id, name: row.tenant.name, slug: row.tenant.slug },
      })),
    });
  });

  platform.get("/kyc/:id/file", async (c) => {
    const denied = superAdminOnly(c);
    if (denied) return denied;
    const side = c.req.query("side") === "selfie" ? "selfie" : "passport";
    const row = await prisma.merchantKyc.findUnique({ where: { id: c.req.param("id") } });
    const key = side === "selfie" ? row?.selfieFile : row?.passportFile;
    if (!row || !key || !isKycStorageKey(key)) return c.text("Not found", 404);
    const abs = resolveUploadKey(key);
    if (!abs) return c.text("Not found", 404);
    try {
      const buf = await readFile(abs);
      const ext = path.extname(abs).toLowerCase();
      const types: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      };
      return c.body(buf, 200, {
        "Content-Type": types[ext] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${side}${ext || ".jpg"}"`,
      });
    } catch {
      return c.text("Not found", 404);
    }
  });

  platform.post("/kyc/:id/review", async (c) => {
    const denied = superAdminOnly(c);
    if (denied) return denied;
    const session = c.get("session");
    const body = await c.req.json().catch(() => ({}));
    const status = String((body as { status?: string }).status ?? "").toUpperCase();
    const reason = String((body as { reason?: string }).reason ?? "").trim();
    if (!STATUSES.has(status)) {
      return c.json({ error: "Status must be APPROVED, REJECTED, or PENDING." }, 400);
    }
    if (status === MerchantKycStatus.REJECTED && reason.length < 3) {
      return c.json({ error: "Add a short reason for the rejection." }, 400);
    }

    const existing = await prisma.merchantKyc.findUnique({
      where: { id: c.req.param("id") },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);

    const nextStatus = status as MerchantKycStatus;
    const reopened = nextStatus === MerchantKycStatus.PENDING;
    const row = await prisma.merchantKyc.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        rejectReason: nextStatus === MerchantKycStatus.REJECTED ? reason.slice(0, 500) : null,
        reviewedByEmail: reopened ? null : session.email,
        reviewedAt: reopened ? null : new Date(),
      },
    });

    const action = reopened
      ? "kyc.reopen"
      : nextStatus === MerchantKycStatus.APPROVED
        ? "kyc.approve"
        : "kyc.reject";
    const summary = reopened
      ? `Returned passport check to review for ${existing.tenant.name} (${existing.tenant.slug})`
      : `${nextStatus === MerchantKycStatus.APPROVED ? "Approved" : "Rejected"} passport check for ${existing.tenant.name} (${existing.tenant.slug})`;
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action,
      summary,
      meta: { tenantId: existing.tenantId, kycId: existing.id },
    });

    const emailSent = reopened
      ? false
      : await notifyMerchantKycDecision({
          tenantId: existing.tenantId,
          approved: nextStatus === MerchantKycStatus.APPROVED,
          rejectReason: row.rejectReason,
        }).catch((err) => {
          console.error("[kyc-email]", err);
          return false;
        });

    return c.json({
      submission: {
        id: row.id,
        status: row.status,
        rejectReason: row.rejectReason,
        reviewedByEmail: row.reviewedByEmail,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        emailSent,
      },
    });
  });
}
