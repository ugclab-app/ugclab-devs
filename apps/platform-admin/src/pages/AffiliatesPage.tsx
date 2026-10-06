import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type ProgramRow = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  ownerEmail: string;
  enabled: boolean;
  defaultCommissionBps: number;
  activePartners: number;
  owedCents: number;
  owedCount: number;
  referralOrders: number;
  platformDisabled: boolean;
};

export default function AffiliatesPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const enabled = params.get("enabled") ?? "all";
  const [partnerQ, setPartnerQ] = useState("");
  const qc = useQueryClient();

  const summaryQ = useQuery({
    queryKey: ["affiliates-summary"],
    queryFn: () => api.affiliatesSummary(),
  });

  const programsQ = useQuery({
    queryKey: ["affiliates-programs", q, enabled],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (enabled !== "all") p.set("enabled", enabled);
      return api.affiliatesPrograms(p);
    },
  });

  const commissionsQ = useQuery({
    queryKey: ["affiliates-commissions", q],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "80" });
      if (q) p.set("q", q);
      return api.affiliatesCommissions(p);
    },
  });

  const partnersQ = useQuery({
    queryKey: ["affiliates-partners", partnerQ],
    queryFn: () => api.affiliatesPartners(partnerQ),
    enabled: partnerQ.trim().length >= 2,
  });

  const programs = (programsQ.data?.programs ?? []) as ProgramRow[];

  async function toggleProgram(
    tenantId: string,
    patch: { enabled?: boolean; platformDisabled?: boolean }
  ) {
    await api.patchAffiliateProgram(tenantId, patch);
    await qc.invalidateQueries({ queryKey: ["affiliates-programs"] });
    await qc.invalidateQueries({ queryKey: ["affiliates-summary"] });
  }

  const summary = summaryQ.data as {
    programsEnabled: number;
    activePartners: number;
    approvedCommissionCents: number;
    tenantsPlatformDisabled: number;
  } | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliates & creators</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cross-store view of referral programs, owed commissions, and platform locks.
        </p>
      </div>

      <QueryState query={summaryQ}>
        {(s) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Programs on" value={String(s.programsEnabled)} />
            <Stat label="Active partners" value={String(s.activePartners)} />
            <Stat
              label="Owed to creators"
              value={formatMoney(s.approvedCommissionCents ?? 0, "USD")}
            />
            <Stat label="Platform locked" value={String(s.tenantsPlatformDisabled)} />
          </div>
        )}
      </QueryState>

      <section className="platform-card p-4">
        <h2 className="mb-3 font-semibold">Search partners (email / code)</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[16rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={partnerQ}
            onChange={(e) => setPartnerQ(e.target.value)}
            placeholder="Min 2 characters…"
          />
        </div>
        {partnerQ.trim().length >= 2 ? (
          <QueryState query={partnersQ}>
            {(data) => (
              <ul className="mt-3 divide-y text-sm">
                {((data.partners ?? []) as {
                  id: string;
                  tenantId: string;
                  tenantSlug: string;
                  code: string;
                  displayName: string;
                  email: string | null;
                  status: string;
                }[]).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{p.displayName}</span>{" "}
                      <span className="font-mono text-slate-500">{p.code}</span>
                      {p.email ? (
                        <span className="text-slate-500"> · {p.email}</span>
                      ) : null}
                    </span>
                    <Link
                      to={`/tenants/${p.tenantId}`}
                      className="text-sky-600 hover:underline"
                    >
                      {p.tenantSlug} →
                    </Link>
                  </li>
                ))}
                {(data.partners as unknown[])?.length === 0 ? (
                  <li className="py-4 text-slate-500">No partners found</li>
                ) : null}
              </ul>
            )}
          </QueryState>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="min-w-[14rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set("q", e.target.value);
              else next.delete("q");
              setParams(next);
            }}
            placeholder="Store, slug, owner email…"
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={enabled}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value === "all") next.delete("enabled");
              else next.set("enabled", e.target.value);
              setParams(next);
            }}
          >
            <option value="all">All programs</option>
            <option value="yes">Enabled only</option>
            <option value="no">Disabled only</option>
          </select>
        </div>

        <QueryState query={programsQ}>
          {() => (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Program</th>
                    <th className="px-4 py-2">Partners</th>
                    <th className="px-4 py-2">Owed</th>
                    <th className="px-4 py-2">Ref orders</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {programs.map((p) => (
                    <tr key={p.tenantId}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/tenants/${p.tenantId}`}
                          className="font-medium text-sky-600 hover:underline"
                        >
                          {p.tenantName}
                        </Link>
                        <p className="font-mono text-xs text-slate-500">{p.tenantSlug}</p>
                        <p className="text-xs text-slate-500">{p.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        {p.platformDisabled ? (
                          <span className="text-red-600">Platform locked</span>
                        ) : p.enabled ? (
                          <span className="text-emerald-600">On</span>
                        ) : (
                          <span className="text-slate-500">Off</span>
                        )}
                        <p className="text-xs text-slate-500">
                          {(p.defaultCommissionBps / 100).toFixed(1)}% default
                        </p>
                      </td>
                      <td className="px-4 py-3">{p.activePartners}</td>
                      <td className="px-4 py-3">
                        {formatMoney(p.owedCents, "USD")}
                        {p.owedCount > 0 ? (
                          <span className="text-xs text-slate-500"> ({p.owedCount})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{p.referralOrders}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="text-left text-xs text-sky-600 hover:underline"
                            onClick={() =>
                              toggleProgram(p.tenantId, { enabled: !p.enabled })
                            }
                          >
                            {p.enabled ? "Disable program" : "Enable program"}
                          </button>
                          <button
                            type="button"
                            className="text-left text-xs text-amber-700 hover:underline"
                            onClick={() =>
                              toggleProgram(p.tenantId, {
                                platformDisabled: !p.platformDisabled,
                              })
                            }
                          >
                            {p.platformDisabled ? "Unlock platform" : "Platform lock"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {programs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No affiliate programs match filters
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent commissions</h2>
          <button
            type="button"
            className="text-sm text-sky-600 hover:underline"
            onClick={async () => {
              const rows = (commissionsQ.data?.commissions ?? []) as { id: string; status: string }[];
              const ids = rows.filter((r) => r.status === "APPROVED").map((r) => r.id);
              if (!ids.length) return;
              if (!confirm(`Mark ${ids.length} approved commissions as paid?`)) return;
              await api.bulkMarkAffiliateCommissionsPaid(ids);
              await qc.invalidateQueries({ queryKey: ["affiliates-commissions"] });
              await qc.invalidateQueries({ queryKey: ["affiliates-summary"] });
              await qc.invalidateQueries({ queryKey: ["affiliates-programs"] });
            }}
          >
            Settle all visible APPROVED
          </button>
        </div>
        <QueryState query={commissionsQ}>
          {(data) => (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Partner</th>
                    <th className="px-4 py-2">Commission</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {((data.commissions ?? []) as {
                    id: string;
                    tenantSlug: string;
                    orderNumber: string;
                    partnerName: string;
                    partnerCode: string;
                    commissionCents: number;
                    status: string;
                  }[]).map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2 font-mono text-xs">{row.tenantSlug}</td>
                      <td className="px-4 py-2">{row.orderNumber}</td>
                      <td className="px-4 py-2">
                        {row.partnerName}{" "}
                        <span className="text-slate-500">({row.partnerCode})</span>
                      </td>
                      <td className="px-4 py-2">
                        {formatMoney(row.commissionCents, "USD")}
                      </td>
                      <td className="px-4 py-2">{row.status}</td>
                      <td className="px-4 py-2">
                        {row.status === "APPROVED" ? (
                          <button
                            type="button"
                            className="text-xs text-emerald-700 hover:underline"
                            onClick={async () => {
                              await api.markAffiliateCommissionPaid(row.id);
                              await qc.invalidateQueries({
                                queryKey: ["affiliates-commissions"],
                              });
                              await qc.invalidateQueries({ queryKey: ["affiliates-summary"] });
                              await qc.invalidateQueries({ queryKey: ["affiliates-programs"] });
                            }}
                          >
                            Mark paid
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>
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
