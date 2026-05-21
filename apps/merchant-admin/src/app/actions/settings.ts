"use server";

import { prisma } from "@ugclab/database";
import { revalidatePath } from "next/cache";
import { normalizeSlug, requireTenant } from "@/lib/merchant";

export type SettingsActionState = {
  ok: boolean;
  message?: string;
};

export async function updateStoreSettings(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const { tenant } = await requireTenant();

    const name = String(formData.get("name") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "");
    const slug = normalizeSlug(slugRaw);
    const slugConfirm = formData.get("slugConfirm") === "on";
    const currency = String(formData.get("currency") ?? "USD")
      .toUpperCase()
      .slice(0, 3);
    const defaultLocale = String(formData.get("defaultLocale") ?? "en").slice(
      0,
      10
    );
    const timezone = String(formData.get("timezone") ?? "UTC").trim();
    const primaryColor = String(formData.get("primaryColor") ?? "#7c3aed");
    const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
    const privacyUrl = String(formData.get("privacyUrl") ?? "").trim() || null;
    const refundUrl = String(formData.get("refundUrl") ?? "").trim() || null;

    if (!name) return { ok: false, message: "Store name is required" };
    if (!slug) return { ok: false, message: "Store slug is required" };

    if (slug !== tenant.slug && !slugConfirm) {
      return {
        ok: false,
        message: "Confirm slug change — existing store links will stop working.",
      };
    }

    if (slug !== tenant.slug) {
      const taken = await prisma.tenant.findFirst({
        where: { slug, NOT: { id: tenant.id } },
      });
      if (taken) {
        return { ok: false, message: "This slug is already taken" };
      }
    }

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenant.id },
        data: { name, slug },
      }),
      prisma.storeSettings.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          currency,
          defaultLocale,
          timezone,
          primaryColor,
          logoUrl,
          privacyUrl,
          refundUrl,
        },
        update: {
          currency,
          defaultLocale,
          timezone,
          primaryColor,
          logoUrl,
          privacyUrl,
          refundUrl,
        },
      }),
    ]);

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, message: "Settings saved" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to save settings",
    };
  }
}
