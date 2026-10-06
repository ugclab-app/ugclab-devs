import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

const DOMAIN_DOCS_URL =
  "https://vercel.com/docs/projects/domains/add-a-domain";

type DomainRow = {
  id: string;
  domain: string;
  verified: boolean;
  isPrimary: boolean;
  verifiedAt: string | null;
  verifiedByEmail: string | null;
  lastDnsCheckAt: string | null;
  lastDnsOk: boolean | null;
  createdAt: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  defaultSubdomain: string;
  defaultStoreUrl: string;
  storefrontUrl: string | null;
  customDomainEnabled: boolean;
  sslStatus: "pending" | "active";
};

function domainStatus(d: DomainRow): "verified" | "dns_ok" | "pending" {
  if (d.verified) return "verified";
  if (d.lastDnsOk) return "dns_ok";
  return "pending";
}

function StatusBadge({ d }: { d: DomainRow }) {
  const s = domainStatus(d);
  if (s === "verified") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Verified
      </span>
    );
  }
  if (s === "dns_ok") {
    return (
      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
        DNS OK
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
      Pending
    </span>
  );
}

function SslBadge({ status }: { status: "pending" | "active" }) {
  const styles =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function DnsModal({
  domainId,
  domain,
  onClose,
}: {
  domainId: string;
  domain: string;
  onClose: () => void;
}) {
  const dnsQuery = useQuery({
    queryKey: ["domain-dns", domainId],
    queryFn: () => api.domainDns(domainId),
  });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="platform-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Verify DNS</h2>
            <p className="font-mono text-sm text-slate-600">{domain}</p>
          </div>
          <button type="button" className="text-slate-500" onClick={onClose}>
            ✕
          </button>
        </div>
        {dnsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : dnsQuery.error ? (
          <p className="text-sm text-red-600">Failed to load DNS instructions</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-2 font-medium text-slate-700">TXT record</p>
              <dl className="space-y-2 font-mono text-xs">
                <div>
                  <dt className="text-slate-500">Host</dt>
                  <dd>{dnsQuery.data?.instructions.txtHost}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Value</dt>
                  <dd className="break-all">{dnsQuery.data?.instructions.txtValue}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="mt-3 text-sky-600 hover:underline"
                onClick={() =>
                  copy(
                    `${dnsQuery.data?.instructions.txtHost}\t${dnsQuery.data?.instructions.txtValue}`
                  )
                }
              >
                Copy DNS record
              </button>
            </div>
            <div className="rounded-lg border border-slate-100 p-4">
              <p className="mb-2 font-medium text-slate-700">CNAME (www)</p>
              <p className="font-mono text-xs text-slate-600">
                {dnsQuery.data?.instructions.cnameHost} →{" "}
                {dnsQuery.data?.instructions.cnameTarget}
              </p>
            </div>
            <p className="text-slate-500">{dnsQuery.data?.instructions.note}</p>
            <a
              href={DOMAIN_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sky-600 hover:underline"
            >
              Custom domain documentation →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AttachDomainModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tenantId, setTenantId] = useState("");
  const [domain, setDomain] = useState("");
  const [addPair, setAddPair] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (addPair) {
        await api.attachDomainPair({ tenantId: tenantId.trim(), apex: domain.trim() });
      } else {
        await api.attachDomain({ tenantId: tenantId.trim(), domain: domain.trim() });
      }
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="platform-card w-full max-w-md p-6">
        <h2 className="mb-4 text-lg font-semibold">Attach domain to store</h2>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Store ID</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="cuid from store detail URL"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">{addPair ? "Apex domain" : "Domain"}</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addPair}
              onChange={(e) => setAddPair(e.target.checked)}
            />
            Add apex + www pair
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ugclab-btn border border-slate-200" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary"
            disabled={busy || !tenantId.trim() || !domain.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : "Attach"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DomainPlatformSetup() {
  const qc = useQueryClient();
  const configQ = useQuery({
    queryKey: ["domains-config"],
    queryFn: () => api.domainsConfig(),
  });
  const [limitDraft, setLimitDraft] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <QueryState query={configQ}>
      {(data) => {
        const cfg = data.config as {
          entriConfigured: boolean;
          vercelConfigured: boolean;
          purchaseMode: string;
          cnameTarget: string;
          storefrontBaseDomain: string;
          maxCustomDomainsDefault: number;
          stats: { totalDomains: number; verifiedDomains: number };
          tenantsOverDefaultLimit: {
            tenantId: string;
            name: string;
            slug: string;
            domainCount: number;
          }[];
        };
        const usage = (data.usage ?? []) as {
          tenantSlug: string;
          domainCount: number;
          limit: number;
          overLimit: boolean;
        }[];
        const over = usage.filter((u) => u.overLimit);

        return (
          <section className="platform-card p-6 space-y-4">
            <h2 className="font-semibold">Platform domain setup</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Entri (buy in-app)</p>
                <p className={cfg.entriConfigured ? "text-emerald-600" : "text-amber-700"}>
                  {cfg.entriConfigured ? "Configured" : "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Vercel domains API</p>
                <p className={cfg.vercelConfigured ? "text-emerald-600" : "text-amber-700"}>
                  {cfg.vercelConfigured ? "Configured" : "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Purchase mode</p>
                <p className="font-mono text-xs">{cfg.purchaseMode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">CNAME target</p>
                <p className="font-mono text-xs break-all">{cfg.cnameTarget}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Free subdomain base: <span className="font-mono">{cfg.storefrontBaseDomain}</span>
              · Env keys: ENTRI_*, VERCEL_TOKEN, STOREFRONT_CNAME_TARGET
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="text-slate-600">Default max custom domains per store</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="mt-1 block w-24 rounded-lg border border-slate-200 px-3 py-2"
                  value={limitDraft || String(cfg.maxCustomDomainsDefault)}
                  onChange={(e) => setLimitDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="ugclab-btn border border-slate-200 bg-white text-sm"
                disabled={saving}
                onClick={async () => {
                  const n = Number(limitDraft || cfg.maxCustomDomainsDefault);
                  setSaving(true);
                  try {
                    await api.updateDomainsConfig(n);
                    setLimitDraft("");
                    await qc.invalidateQueries({ queryKey: ["domains-config"] });
                  } catch (e) {
                    alert(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save limit"}
              </button>
            </div>
            {over.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">{over.length} store(s) over their plan limit</p>
                <ul className="mt-2 list-inside list-disc text-xs">
                  {over.slice(0, 8).map((u) => (
                    <li key={u.tenantSlug}>
                      {u.tenantSlug}: {u.domainCount} / {u.limit}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      }}
    </QueryState>
  );
}

export default function DomainsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dnsModal, setDnsModal] = useState<{ id: string; domain: string } | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const status = params.get("status") ?? "all";
  const q = params.get("q") ?? "";

  const queryKey = useMemo(() => ["domains", status, q], [status, q]);
  const query = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (status !== "all") p.set("status", status);
      if (q) p.set("q", q);
      return api.domains(p);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["domains"] });

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setActionBusy(id);
    try {
      await fn();
      await invalidate();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  };

  const pendingSelected = useMemo(() => {
    const domains = (query.data?.domains ?? []) as DomainRow[];
    return [...selected].filter((id) => {
      const d = domains.find((x) => x.id === id);
      return d && !d.verified;
    });
  }, [selected, query.data?.domains]);

  return (
    <div className="space-y-6">
      <div className="platform-page-header">
        <div>
          <h1>Custom domains</h1>
          <p className="mt-1 text-sm text-slate-500">
            Verify DNS, attach domains for merchants, and manage primary storefront hosts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary text-sm"
            onClick={() => setShowAttach(true)}
          >
            Attach domain
          </button>
          <button
            type="button"
            className="ugclab-btn border border-slate-200 bg-white text-sm"
            onClick={() => api.exportDomainsCsv().catch((e) => alert(String(e)))}
          >
            Export CSV
          </button>
        </div>
      </div>

      <DomainPlatformSetup />

      <QueryState query={query}>
        {(data) => {
          const domains = data.domains as DomainRow[];
          const summary = data.summary;
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="platform-stat">
                  <p className="text-xs font-medium uppercase text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-bold">{summary.total}</p>
                </div>
                <div className="platform-stat">
                  <p className="text-xs font-medium uppercase text-slate-500">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{summary.pending}</p>
                </div>
                <div className="platform-stat">
                  <p className="text-xs font-medium uppercase text-slate-500">Verified</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.verified}</p>
                </div>
                <div className="platform-stat">
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Stores with custom domain
                  </p>
                  <p className="mt-1 text-2xl font-bold">{summary.tenantsWithCustomDomain}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  placeholder="Domain, slug, owner email…"
                  className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  defaultValue={q}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value;
                      const next = new URLSearchParams(params);
                      if (v) next.set("q", v);
                      else next.delete("q");
                      setParams(next);
                    }
                  }}
                />
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => {
                    const next = new URLSearchParams(params);
                    const v = e.target.value;
                    if (v === "all") next.delete("status");
                    else next.set("status", v);
                    setParams(next);
                  }}
                >
                  <option value="all">All</option>
                  <option value="pending">Only pending</option>
                  <option value="dns_ok">DNS OK (not verified)</option>
                  <option value="verified">Only verified</option>
                </select>
                {pendingSelected.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="ugclab-btn border border-slate-200 bg-white text-sm"
                      onClick={() =>
                        runAction("bulk", () => api.bulkVerifyDomains(pendingSelected)).then(
                          () => setSelected(new Set())
                        )
                      }
                    >
                      Check DNS ({pendingSelected.length})
                    </button>
                    <button
                      type="button"
                      className="ugclab-btn border border-slate-200 bg-white text-sm"
                      onClick={() =>
                        api
                          .bulkRemindDomains(pendingSelected)
                          .then(() => alert("Reminder emails sent where possible"))
                      }
                    >
                      Remind merchant
                    </button>
                  </>
                ) : null}
              </div>

              <div className="platform-card overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <th className="w-10 px-4 py-3">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="px-4 py-3">Domain</th>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Default host</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">SSL</th>
                      <th className="px-4 py-3">Added</th>
                      <th className="px-4 py-3">Verified by</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {domains.map((d) => (
                      <tr key={d.id} className={d.isPrimary ? "bg-sky-50/40" : undefined}>
                        <td className="px-4 py-3">
                          {!d.verified ? (
                            <input
                              type="checkbox"
                              checked={selected.has(d.id)}
                              onChange={(e) => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(d.id);
                                else next.delete(d.id);
                                setSelected(next);
                              }}
                            />
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-slate-900">{d.domain}</div>
                          {d.isPrimary ? (
                            <span className="text-xs font-medium text-sky-600">Primary</span>
                          ) : null}
                          {!d.customDomainEnabled ? (
                            <span className="mt-0.5 block text-xs text-amber-700">
                              Plan / feature disabled
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/tenants/${d.tenantId}`} className="font-medium text-sky-600">
                            {d.tenantName}
                          </Link>
                          <div className="font-mono text-xs text-slate-500">{d.tenantSlug}</div>
                          <div className="text-xs text-slate-400">{d.ownerEmail}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {d.defaultSubdomain}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge d={d} />
                        </td>
                        <td className="px-4 py-3">
                          <SslBadge status={d.sslStatus} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {d.verifiedByEmail ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2 text-xs">
                            <button
                              type="button"
                              className="text-sky-600 hover:underline"
                              onClick={() => setDnsModal({ id: d.id, domain: d.domain })}
                            >
                              How to verify
                            </button>
                            {!d.verified ? (
                              <button
                                type="button"
                                className="text-sky-600 hover:underline disabled:opacity-50"
                                disabled={actionBusy === d.id}
                                onClick={() =>
                                  runAction(d.id, () => api.checkDomainDns(d.id))
                                }
                              >
                                Check DNS
                              </button>
                            ) : null}
                            {!d.verified ? (
                              <button
                                type="button"
                                className="text-slate-600 hover:underline"
                                onClick={() => runAction(d.id, () => api.verifyDomain(d.id))}
                              >
                                Mark verified
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="text-amber-700 hover:underline"
                                onClick={() => runAction(d.id, () => api.unverifyDomain(d.id))}
                              >
                                Revoke
                              </button>
                            )}
                            {d.verified && !d.isPrimary ? (
                              <button
                                type="button"
                                className="text-slate-600 hover:underline"
                                onClick={() => runAction(d.id, () => api.setPrimaryDomain(d.id))}
                              >
                                Set primary
                              </button>
                            ) : null}
                            {d.storefrontUrl ? (
                              <a
                                href={d.storefrontUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-600 hover:underline"
                              >
                                Open store
                              </a>
                            ) : (
                              <a
                                href={d.defaultStoreUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:underline"
                              >
                                Default URL
                              </a>
                            )}
                            <button
                              type="button"
                              className="text-red-600 hover:underline"
                              onClick={() => {
                                if (!confirm(`Delete ${d.domain}?`)) return;
                                runAction(d.id, () => api.deleteDomain(d.id));
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!domains.length ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                          No domains match your filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          );
        }}
      </QueryState>

      {dnsModal ? (
        <DnsModal
          domainId={dnsModal.id}
          domain={dnsModal.domain}
          onClose={() => setDnsModal(null)}
        />
      ) : null}
      {showAttach ? (
        <AttachDomainModal onClose={() => setShowAttach(false)} onDone={() => void invalidate()} />
      ) : null}
    </div>
  );
}
