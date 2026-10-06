import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type TenantMarketingRow = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  marketingFeatureOn: boolean;
  marketingPaused: boolean;
  campaignCount: number;
  subscriberCount: number;
  sentToday: number;
  dailyCap: number;
  lastCampaign: { sentAt: string | null; subject: string; sentCount: number } | null;
};

type CampaignRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  subject: string;
  name: string | null;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  marketingPaused: boolean;
  sentAt: string | null;
  createdAt: string;
};

export default function MarketingPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "stores";
  const q = params.get("q") ?? "";
  const [busyId, setBusyId] = useState<string | null>(null);
  const qc = useQueryClient();

  const summaryQ = useQuery({
    queryKey: ["marketing-summary"],
    queryFn: () => api.marketingSummary(),
  });

  const tenantsQ = useQuery({
    queryKey: ["marketing-tenants", q],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      return api.marketingTenants(p);
    },
    enabled: tab === "stores",
  });

  const campaignsQ = useQuery({
    queryKey: ["marketing-campaigns", q],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "100" });
      if (q) p.set("q", q);
      return api.marketingCampaigns(p);
    },
    enabled: tab === "campaigns",
  });

  async function patchTenant(
    tenantId: string,
    patch: { marketingPaused?: boolean; marketingFeatureOn?: boolean }
  ) {
    setBusyId(tenantId);
    try {
      await api.patchMarketingTenant(tenantId, patch);
      await qc.invalidateQueries({ queryKey: ["marketing-tenants"] });
      await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      await qc.invalidateQueries({ queryKey: ["marketing-summary"] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Store marketing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Campaigns, send volume, and emergency pause per store.
        </p>
      </div>

      <QueryState query={summaryQ}>
        {(s) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Emails sent (30d)" value={String(s.emailsSent30d)} />
            <Stat label="Campaigns sent (30d)" value={String(s.campaignsSent30d)} />
            <Stat label="Subscribers (all)" value={String(s.totalSubscribers)} />
            <Stat label="Paused stores" value={String(s.marketingPausedTenants)} />
          </div>
        )}
      </QueryState>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(["stores", "campaigns"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("tab", t);
              setParams(next);
            }}
          >
            {t === "stores" ? "By store" : "Campaigns"}
          </button>
        ))}
        <input
          className="ml-auto min-w-[12rem] rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set("q", e.target.value);
            else next.delete("q");
            setParams(next);
          }}
          placeholder="Search…"
        />
      </div>

      {tab === "stores" ? (
        <QueryState query={tenantsQ}>
          {(data) => (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Feature</th>
                    <th className="px-4 py-2">Sent today</th>
                    <th className="px-4 py-2">Campaigns</th>
                    <th className="px-4 py-2">Last send</th>
                    <th className="px-4 py-2">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {((data.tenants ?? []) as TenantMarketingRow[]).map((t) => (
                    <tr key={t.tenantId}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/tenants/${t.tenantId}`}
                          className="font-medium text-sky-600 hover:underline"
                        >
                          {t.tenantName}
                        </Link>
                        <p className="font-mono text-xs text-slate-500">{t.tenantSlug}</p>
                      </td>
                      <td className="px-4 py-3">
                        {t.marketingPaused ? (
                          <span className="font-medium text-red-600">Paused</span>
                        ) : t.marketingFeatureOn ? (
                          <span className="text-emerald-600">On</span>
                        ) : (
                          <span className="text-slate-500">Feature off</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.sentToday} / {t.dailyCap}
                      </td>
                      <td className="px-4 py-3">
                        {t.campaignCount}{" "}
                        <span className="text-slate-500">· {t.subscriberCount} subs</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {t.lastCampaign ? (
                          <>
                            {t.lastCampaign.subject}
                            <br />
                            {t.lastCampaign.sentCount} sent ·{" "}
                            {t.lastCampaign.sentAt
                              ? new Date(t.lastCampaign.sentAt).toLocaleDateString()
                              : "—"}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={busyId === t.tenantId}
                            className="text-left text-xs text-amber-700 hover:underline disabled:opacity-50"
                            onClick={() =>
                              patchTenant(t.tenantId, {
                                marketingPaused: !t.marketingPaused,
                              })
                            }
                          >
                            {t.marketingPaused ? "Resume sends" : "Pause sends"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === t.tenantId}
                            className="text-left text-xs text-sky-600 hover:underline disabled:opacity-50"
                            onClick={() =>
                              patchTenant(t.tenantId, {
                                marketingFeatureOn: !t.marketingFeatureOn,
                              })
                            }
                          >
                            {t.marketingFeatureOn ? "Disable feature" : "Enable feature"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      ) : (
        <QueryState query={campaignsQ}>
          {(data) => (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Sent</th>
                    <th className="px-4 py-2">Open / click</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {((data.campaigns ?? []) as CampaignRow[]).map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs">{c.tenantSlug}</span>
                        {c.marketingPaused ? (
                          <span className="ml-2 text-xs text-red-600">paused</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">{c.subject}</td>
                      <td className="px-4 py-2">{c.status}</td>
                      <td className="px-4 py-2">{c.sentCount}</td>
                      <td className="px-4 py-2">
                        {c.openCount} / {c.clickCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
