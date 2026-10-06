import { AdminPageShell } from "@/components/admin-page-shell";
import { PaymentsPanel } from "@/components/payments-panel";
import { BillingPanel } from "@/components/billing-panel";
import { TwoFaRequiredBanner } from "@/components/two-fa-required-banner";
import { useAdminT } from "@/hooks/use-admin-t";

export default function PaymentsPage() {
  const { ta, t } = useAdminT();
  return (
    <AdminPageShell
      crumbs={[{ label: t.nav.payments }]}
      title={ta("paymentsPage.title")}
      description={ta("paymentsPage.description")}
    >
      <div className="space-y-8 pb-8">
        <TwoFaRequiredBanner area="payouts" />
        <PaymentsPanel />
        <BillingPanel />
      </div>
    </AdminPageShell>
  );
}
