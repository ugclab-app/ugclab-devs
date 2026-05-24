import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { SettingsPanelShell } from "@/components/settings-section";

function invoiceStatusLabel(status: string | null) {
  switch (status) {
    case "paid":
      return "Paid";
    case "open":
      return "Open";
    case "draft":
      return "Draft";
    case "void":
      return "Void";
    case "uncollectible":
      return "Uncollectible";
    default:
      return status ?? "—";
  }
}

export function BillingInvoicesPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => api.billingInvoices(),
  });

  if (isLoading) {
    return (
      <SettingsPanelShell title="Platform invoices">
        <p className="text-sm text-zinc-500">Loading…</p>
      </SettingsPanelShell>
    );
  }

  const invoices = (data?.invoices ?? []) as {
    id: string;
    number: string | null;
    status: string | null;
    currency: string;
    amountDue: number;
    amountPaid: number;
    createdAt: string;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
  }[];

  return (
    <SettingsPanelShell
      title="Platform invoices"
      description="Invoices for your Tescommerce subscription (Stripe Billing). Customer order payments are separate."
    >
      {!data?.configured ? (
        <p className="text-sm text-zinc-600">
          Billing is not configured on this environment.
        </p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No subscription invoices yet. Invoices appear after you subscribe to a paid
          plan or receive a trial invoice from Stripe.
        </p>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => {
                const amount =
                  inv.status === "paid" ? inv.amountPaid : inv.amountDue;
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {inv.number ?? inv.id.slice(0, 12)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          inv.status === "paid"
                            ? "text-emerald-700"
                            : inv.status === "open"
                              ? "text-amber-700"
                              : "text-zinc-600"
                        }
                      >
                        {invoiceStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-violet-600 hover:underline"
                        >
                          View
                        </a>
                      ) : inv.invoicePdf ? (
                        <a
                          href={inv.invoicePdf}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-violet-600 hover:underline"
                        >
                          PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsPanelShell>
  );
}
