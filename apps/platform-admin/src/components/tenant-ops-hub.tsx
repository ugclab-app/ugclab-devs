import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type OpsHubData = {
  tenant: {
    id: string;
    slug: string;
    platformFlags: string[];
  };
  domains: { domain: string; verified: boolean; sslStatus: string }[];
  theme: {
    publishedThemeId: string | null;
    draftThemeId: string | null;
    hasDraftMismatch: boolean;
  };
  stripe: {
    connected: boolean;
    chargesEnabled: boolean;
    accountId: string | null;
  };
  webhooks: { failed7d: number };
  emails: { recent: { subject: string; status: string; createdAt?: string }[] };
  moderation: { unpublishedPages: unknown[] };
  affiliates: {
    programEnabled: boolean;
    defaultCommissionBps: number;
    platformDisabled: boolean;
    activePartners: number;
    owedToCreatorsCents: number;
    referralOrders30d: number;
  };
  marketing: {
    featureOn: boolean;
    paused: boolean;
    sentToday: number;
    dailyCap: number;
    subscriberCount: number;
    lastCampaign: {
      subject: string;
      sentAt: string | null;
      sentCount: number;
    } | null;
    recentCampaigns: {
      id: string;
      subject: string;
      status: string;
      sentCount: number;
      openCount: number;
      clickCount: number;
    }[];
  };
  mor: {
    currency: string;
    availableCents: number;
    owedToCreatorsCents: number;
    pendingPayoutCents: number;
    earnedCents: number;
  } | null;
};

export function TenantOpsHub({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["tenant-ops", tenantId],
    queryFn: () => api.tenantOpsHub(tenantId),
  });

  return (
    <section className="platform-card p-0 overflow-hidden">
      <div className="border-b bg-slate-50 px-6 py-3">
        <h2 className="font-semibold">Store 360°</h2>
        <p className="text-xs text-slate-500">
          Domains, affiliates, marketing, MoR, Stripe, webhooks
        </p>
      </div>
      <QueryState query={query}>
        {(raw) => {
          const data = raw as OpsHubData;
          const currency = data.mor?.currency ?? "USD";

          return (
            <div className="grid gap-0 lg:grid-cols-2">
              <OpsPanel title="Domains">
                {data.domains.length ? (
                  <ul className="space-y-2 text-sm">
                    {data.domains.map((d) => (
                      <li key={d.domain}>
                        <span className="font-mono">{d.domain}</span>{" "}
                        {d.verified ? (
                          <span className="text-emerald-600">verified</span>
                        ) : (
                          <span className="text-amber-600">pending</span>
                        )}{" "}
                        · SSL {d.sslStatus}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No custom domains</p>
                )}
                <Link
                  to={`/domains?q=${encodeURIComponent(data.tenant.slug)}`}
                  className="mt-2 inline-block text-xs text-sky-600"
                >
                  Open domains →
                </Link>
              </OpsPanel>

              <OpsPanel title="Affiliates">
                <AffiliatePanel
                  tenantId={tenantId}
                  tenantSlug={data.tenant.slug}
                  data={data.affiliates}
                  onChanged={() =>
                    qc.invalidateQueries({ queryKey: ["tenant-ops", tenantId] })
                  }
                />
              </OpsPanel>

              <OpsPanel title="Marketing">
                <MarketingPanel
                  tenantId={tenantId}
                  data={data.marketing}
                  onChanged={() =>
                    qc.invalidateQueries({ queryKey: ["tenant-ops", tenantId] })
                  }
                />
              </OpsPanel>

              {data.mor ? (
                <OpsPanel title="MoR balance">
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Available</dt>
                      <dd className="font-medium">
                        {formatMoney(data.mor.availableCents, currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Owed to creators</dt>
                      <dd className="font-medium text-amber-700">
                        {formatMoney(data.mor.owedToCreatorsCents, currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Pending payout</dt>
                      <dd>{formatMoney(data.mor.pendingPayoutCents, currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Earned (lifetime)</dt>
                      <dd>{formatMoney(data.mor.earnedCents, currency)}</dd>
                    </div>
                  </dl>
                  <Link to="/payouts?status=open" className="mt-2 inline-block text-xs text-sky-600">
                    Payout queue →
                  </Link>
                </OpsPanel>
              ) : null}

              <OpsPanel title="Theme">
                <dl className="text-sm space-y-1">
                  <div>
                    <dt className="text-slate-500">Published</dt>
                    <dd className="font-mono">{data.theme.publishedThemeId ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Draft</dt>
                    <dd className="font-mono">{data.theme.draftThemeId ?? "—"}</dd>
                  </div>
                </dl>
                {data.theme.hasDraftMismatch ? (
                  <p className="mt-2 text-xs text-amber-700">Draft ≠ published theme</p>
                ) : null}
              </OpsPanel>

              <OpsPanel title="Stripe">
                <p className="text-sm">
                  {data.stripe.connected ? (
                    <>Connected · charges {data.stripe.chargesEnabled ? "on" : "off"}</>
                  ) : (
                    <span className="text-slate-500">Not connected</span>
                  )}
                </p>
                {data.stripe.accountId ? (
                  <p className="mt-1 font-mono text-xs text-slate-500">{data.stripe.accountId}</p>
                ) : null}
              </OpsPanel>

              <OpsPanel title="Webhooks (7d)">
                <p className="text-sm">
                  Failed / unprocessed: <strong>{data.webhooks.failed7d}</strong>
                </p>
                <Link to="/integrations" className="mt-2 inline-block text-xs text-sky-600">
                  Integrations →
                </Link>
              </OpsPanel>

              <OpsPanel title="Emails to owner">
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {data.emails.recent.map((e, i) => (
                    <li key={i}>
                      {e.subject} · {e.status}
                    </li>
                  ))}
                </ul>
              </OpsPanel>

              <OpsPanel title="Moderation flags">
                <form
                  className="space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const raw = new FormData(e.currentTarget).get("flags");
                    const flags = String(raw ?? "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    await api.updateTenantPlatformFlags(tenantId, flags);
                    await qc.invalidateQueries({ queryKey: ["tenant-ops", tenantId] });
                  }}
                >
                  <input
                    name="flags"
                    className="ugclab-input w-full text-sm"
                    defaultValue={data.tenant.platformFlags.join(", ")}
                    placeholder="high_risk, review_products"
                  />
                  <button type="submit" className="ugclab-btn border border-slate-200 text-xs">
                    Save flags
                  </button>
                </form>
                <p className="mt-2 text-xs text-slate-500">
                  Unpublished pages: {data.moderation.unpublishedPages.length}
                </p>
              </OpsPanel>
            </div>
          );
        }}
      </QueryState>
    </section>
  );
}

function AffiliatePanel({
  tenantId,
  tenantSlug,
  data,
  onChanged,
}: {
  tenantId: string;
  tenantSlug: string;
  data: OpsHubData["affiliates"];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(body: { enabled?: boolean; platformDisabled?: boolean }) {
    setBusy(true);
    try {
      await api.patchAffiliateProgram(tenantId, body);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <p>
        Program:{" "}
        {data.platformDisabled ? (
          <span className="font-medium text-red-600">Platform locked</span>
        ) : data.programEnabled ? (
          <span className="text-emerald-600">On</span>
        ) : (
          <span className="text-slate-500">Off</span>
        )}
        <span className="text-slate-500">
          {" "}
          · {(data.defaultCommissionBps / 100).toFixed(1)}% default
        </span>
      </p>
      <p className="text-slate-600">
        {data.activePartners} active partners · {data.referralOrders30d} ref orders (30d)
      </p>
      <p className="font-medium text-amber-800">
        Owed: {formatMoney(data.owedToCreatorsCents, "USD")}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          className="text-xs text-sky-600 hover:underline disabled:opacity-50"
          onClick={() => patch({ enabled: !data.programEnabled })}
        >
          {data.programEnabled ? "Disable program" : "Enable program"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="text-xs text-amber-700 hover:underline disabled:opacity-50"
          onClick={() => patch({ platformDisabled: !data.platformDisabled })}
        >
          {data.platformDisabled ? "Unlock" : "Platform lock"}
        </button>
        <Link
          to={`/affiliates?q=${encodeURIComponent(tenantSlug)}`}
          className="text-xs text-slate-500 hover:text-sky-600"
        >
          All affiliates →
        </Link>
      </div>
    </div>
  );
}

function MarketingPanel({
  tenantId,
  data,
  onChanged,
}: {
  tenantId: string;
  data: OpsHubData["marketing"];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(body: {
    marketingPaused?: boolean;
    marketingFeatureOn?: boolean;
  }) {
    setBusy(true);
    try {
      await api.patchMarketingTenant(tenantId, body);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <p>
        {data.paused ? (
          <span className="font-medium text-red-600">Sends paused</span>
        ) : data.featureOn ? (
          <span className="text-emerald-600">Active</span>
        ) : (
          <span className="text-slate-500">Feature off</span>
        )}
        <span className="text-slate-500">
          {" "}
          · {data.sentToday}/{data.dailyCap} sent today · {data.subscriberCount} subscribers
        </span>
      </p>
      {data.lastCampaign ? (
        <p className="text-xs text-slate-600">
          Last: {data.lastCampaign.subject} ({data.lastCampaign.sentCount} sent)
        </p>
      ) : (
        <p className="text-xs text-slate-500">No campaigns sent yet</p>
      )}
      {data.recentCampaigns.length > 0 ? (
        <ul className="max-h-20 overflow-y-auto text-xs text-slate-600 space-y-0.5">
          {data.recentCampaigns.slice(0, 3).map((c) => (
            <li key={c.id}>
              {c.subject} · {c.status}
              {c.status === "SENT"
                ? ` · ${c.openCount}/${c.sentCount} opens`
                : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          className="text-xs text-amber-700 hover:underline disabled:opacity-50"
          onClick={() => patch({ marketingPaused: !data.paused })}
        >
          {data.paused ? "Resume sends" : "Pause sends"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="text-xs text-sky-600 hover:underline disabled:opacity-50"
          onClick={() => patch({ marketingFeatureOn: !data.featureOn })}
        >
          {data.featureOn ? "Disable feature" : "Enable feature"}
        </button>
        <Link to="/marketing" className="text-xs text-slate-500 hover:text-sky-600">
          All marketing →
        </Link>
      </div>
    </div>
  );
}

function OpsPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-r border-slate-100 p-6 last:border-r-0">
      <h3 className="text-xs font-semibold uppercase text-slate-500">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
