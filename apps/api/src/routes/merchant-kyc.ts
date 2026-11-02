import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { MerchantKycStatus, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { useOwnerOnlyStripeGuards } from "../middleware/merchant-guards.js";
import { deleteUploadKey, saveKycDocument } from "../lib/uploads.js";
import { logActivity } from "../lib/activity-log.js";

const merchantKyc = new Hono<AuthEnv>();
merchantKyc.use("*", requireAuth);
useOwnerOnlyStripeGuards(merchantKyc);

function maskPassport(value: string) {
  const clean = value.replace(/\s/g, "");
  if (clean.length <= 4) return "••••";
  return `${"•".repeat(Math.max(clean.length - 4, 4))}${clean.slice(-4)}`;
}

function publicKyc(row: {
  status: MerchantKycStatus;
  legalName: string;
  country: string;
  passportNumber: string;
  rejectReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  selfieFile: string | null;
}) {
  return {
    status: row.status,
    legalName: row.legalName,
    country: row.country,
    passportLast4: maskPassport(row.passportNumber),
    rejectReason: row.rejectReason,
    hasSelfie: Boolean(row.selfieFile),
    submittedAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

async function asUpload(value: unknown) {
  if (!(value instanceof File) || value.size <= 0) return null;
  return {
    name: value.name,
    type: value.type,
    size: value.size,
    buffer: Buffer.from(await value.arrayBuffer()),
  };
}

merchantKyc.get("/kyc", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const row = await prisma.merchantKyc.findUnique({ where: { tenantId: tenant.id } });
  return c.json({ kyc: row ? publicKyc(row) : null });
});

merchantKyc.post("/kyc", async (c) => {
  const session = c.get("session");
  const { tenant } = await requireTenant(session);
  const existing = await prisma.merchantKyc.findUnique({ where: { tenantId: tenant.id } });
  if (existing && existing.status !== MerchantKycStatus.REJECTED) {
    return c.json(
      { error: "A passport check is already in review or approved." },
      409
    );
  }

  const form = await c.req.parseBody();
  const legalName = String(form.legalName ?? "").trim().replace(/\s+/g, " ");
  const country = String(form.country ?? "").trim().toUpperCase();
  const passportNumber = String(form.passportNumber ?? "").trim().toUpperCase().replace(/\s+/g, "");

  if (legalName.length < 2 || legalName.length > 120) {
    return c.json({ error: "Enter the full name from the passport." }, 400);
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    return c.json({ error: "Country must be a 2-letter code, for example KG." }, 400);
  }
  if (!/^[A-Z0-9]{5,20}$/.test(passportNumber)) {
    return c.json({ error: "Passport number must be 5–20 letters or digits." }, 400);
  }

  const passport = await asUpload(form.passport);
  if (!passport) return c.json({ error: "Upload a photo of the passport page." }, 400);
  const selfie = await asUpload(form.selfie);

  const id = existing?.id ?? randomUUID().replace(/-/g, "");
  let passportSaved: { storageKey: string } | null = null;
  let selfieSaved: { storageKey: string } | null = null;
  try {
    passportSaved = await saveKycDocument(tenant.id, id, "passport", passport);
    if (selfie) selfieSaved = await saveKycDocument(tenant.id, id, "selfie", selfie);

    const row = await prisma.merchantKyc.upsert({
      where: { tenantId: tenant.id },
      create: {
        id,
        tenantId: tenant.id,
        status: MerchantKycStatus.PENDING,
        legalName,
        country,
        passportNumber,
        passportFile: passportSaved.storageKey,
        selfieFile: selfieSaved?.storageKey ?? null,
        rejectReason: null,
        reviewedByEmail: null,
        reviewedAt: null,
      },
      update: {
        status: MerchantKycStatus.PENDING,
        legalName,
        country,
        passportNumber,
        passportFile: passportSaved.storageKey,
        selfieFile: selfieSaved?.storageKey ?? null,
        rejectReason: null,
        reviewedByEmail: null,
        reviewedAt: null,
      },
    });

    if (existing?.passportFile && existing.passportFile !== row.passportFile) {
      await deleteUploadKey(existing.passportFile);
    }
    if (existing?.selfieFile && existing.selfieFile !== row.selfieFile) {
      await deleteUploadKey(existing.selfieFile);
    }

    await logActivity({
      tenantId: tenant.id,
      userId: session.sub,
      userEmail: session.email,
      action: "kyc.submit",
      entityType: "merchant_kyc",
      entityId: row.id,
      summary: "Submitted passport check for platform review",
    });
    const { notifyPlatformOps } = await import("../lib/platform-ops-notify.js");
    notifyPlatformOps({
      subject: `[Tescommerce] KYC submitted — ${tenant.slug}`,
      html: `<p>${tenant.name} submitted a passport check.</p>`,
      text: `KYC submitted by ${tenant.slug}`,
      dedupeKey: `kyc-${row.id}`,
    }).catch(() => {});

    return c.json({ kyc: publicKyc(row) });
  } catch (err) {
    await deleteUploadKey(passportSaved?.storageKey);
    await deleteUploadKey(selfieSaved?.storageKey);
    const message = err instanceof Error ? err.message : "Could not save the passport photo.";
    return c.json({ error: message }, 400);
  }
});

export { merchantKyc };
