import { AdminPageShell } from "@/components/admin-page-shell";
import { PaymentsPanel } from "@/components/payments-panel";
import { BillingPanel } from "@/components/billing-panel";

export default function PaymentsPage() {
  return (
    <AdminPageShell
      crumbs={[{ label: "Payments" }]}
      title="Payments & billing"
      description="Accept card payments, manage your platform subscription, and view payouts."
    >
      <div className="space-y-8 pb-8">
        <PaymentsPanel />
        <BillingPanel />
      </div>
    </AdminPageShell>
  );
}
