import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
      aria-hidden
    />
  );
}

export default function SystemPage() {
  const query = useQuery({
    queryKey: ["platform-system"],
    queryFn: () => api.system(),
  });

  return (
    <QueryState query={query}>
      {(data) => <SystemContent data={data} />}
    </QueryState>
  );
}

function SystemContent({
  data,
}: {
  data: Awaited<ReturnType<typeof api.system>>;
}) {
  const rows = [
    {
      label: "Payment model",
      value: data.paymentModel === "mor" ? "Merchant of Record (MoR)" : "Stripe Connect",
    },
    {
      label: "Stripe",
      value: data.stripeConfigured ? "Configured" : "Not configured",
      ok: data.stripeConfigured,
    },
    {
      label: "Email (Resend / SendGrid)",
      value: data.emailConfigured ? "Configured" : "Not configured",
      ok: data.emailConfigured,
    },
    { label: "Database", value: data.database, ok: data.database === "ok" },
    { label: "Merchant admin URL", value: data.merchantAdminUrl },
    { label: "Storefront base URL", value: data.storefrontUrl },
    {
      label: "Platform ops email",
      value: data.platformOpsEmail ?? "Not set (PLATFORM_OPS_EMAIL)",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System</h1>
        <p className="mt-1 text-sm text-slate-500">
          Environment checks — change values in API server env, not here.
        </p>
      </div>

      <div className="platform-card divide-y">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
          >
            <span className="text-sm font-medium text-slate-700">{r.label}</span>
            <span className="flex items-center gap-2 text-sm text-slate-900">
              {r.ok !== undefined ? <StatusDot ok={r.ok} /> : null}
              {r.value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Plan editing and global fee defaults are managed via database seed / migrations for
        now. Per-store fee override is on each store detail page.
      </p>
    </div>
  );
}
