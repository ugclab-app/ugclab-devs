import { AdminShell } from "@/components/admin-shell";
import { SettingsForm } from "@/components/settings-form";
import { StoreQrCode } from "@/components/store-qr-code";
import { StorefrontPreview } from "@/components/storefront-preview";
import { getStorefrontUrl } from "@/lib/storefront";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const s = tenant.settings;
  const storeUrl = getStorefrontUrl(tenant.slug);
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
  );

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title="Settings"
      description="Store identity, preview, QR code, and notifications."
    >
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SettingsForm
            storeUrl={storeUrl}
            initial={{
              name: tenant.name,
              slug: tenant.slug,
              currency: s?.currency ?? "USD",
              defaultLocale: s?.defaultLocale ?? "en",
              timezone: s?.timezone ?? "UTC",
              primaryColor: s?.primaryColor ?? "#7c3aed",
              logoUrl: s?.logoUrl ?? "",
              privacyUrl: s?.privacyUrl ?? "",
              refundUrl: s?.refundUrl ?? "",
            }}
          />
        </div>
        <div className="space-y-6">
          <StorefrontPreview url={storeUrl} />
          <section className="admin-card p-6">
            <h2 className="font-semibold text-zinc-900">Store QR code</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Print or share offline.
            </p>
            <div className="mt-4 flex justify-center">
              <StoreQrCode url={storeUrl} />
            </div>
          </section>
          <section className="admin-card p-6 text-sm text-zinc-600">
            <h2 className="font-semibold text-zinc-900">Order emails</h2>
            <p className="mt-2">
              {emailConfigured
                ? "You'll get an email when an order is marked PAID (and when checkout is connected)."
                : "Add RESEND_API_KEY or SENDGRID_API_KEY to .env to enable merchant order emails."}
            </p>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
