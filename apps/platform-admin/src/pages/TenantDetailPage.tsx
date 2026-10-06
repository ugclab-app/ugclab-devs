import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { TenantMorPayouts } from "@/components/tenant-mor-payouts";
import { QueryState } from "@/components/query-state";
import { PlatformNotes } from "@/components/platform-notes";
import { TenantBillingPanel } from "@/components/tenant-billing-panel";
import { TenantFeatureFlags } from "@/components/tenant-feature-flags";
import { TenantOpsHub } from "@/components/tenant-ops-hub";
import { TenantProductsPanel } from "@/components/tenant-products-panel";
import { TenantMessagesPanel } from "@/components/tenant-messages-panel";
import { PermissionGate } from "@/components/permission-gate";

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => api.tenant(id!),
    enabled: !!id,
  });

  const opsQuery = useQuery({
    queryKey: ["tenant-ops", id],
    queryFn: () => api.tenantOpsHub(id!),
    enabled: !!id,
  });

  return (
    <QueryState query={query}>
      {(data) => (
        <TenantDetailContent
          data={data}
          ops={opsQuery.data}
          id={id!}
          onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: ["tenant", id] });
            await queryClient.invalidateQueries({ queryKey: ["tenants"] });
          }}
        />
      )}
    </QueryState>
  );
}

function TenantDetailContent({
  data,
  ops,
  id,
  onRefresh,
}: {
  data: { tenant: unknown; paymentModel?: string };
  ops?: Awaited<ReturnType<typeof api.tenantOpsHub>>;
  id: string;
  onRefresh: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [feeDraft, setFeeDraft] = useState("");
  const [feeTouched, setFeeTouched] = useState(false);

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.plans(),
  });

  const t = data.tenant as {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptionPlanId: string | null;
    platformFeeBpsOverride: number | null;
    storefrontUrl: string;
    owner: { id: string; email: string; name: string | null };
    subscriptionPlan: {
      id: string;
      name: string;
      platformFeeBps?: number;
    } | null;
    settings: { currency: string } | null;
    customDomains: { domain: string; verified: boolean }[];
    _count: { products: number; orders: number; customers: number };
    stats: { orders30d: number; gmv30d: number; pendingPayouts?: number };
    recentOrders: {
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      currency: string;
      affiliateCommissionCents?: number;
      referral?: { code: string; displayName: string } | null;
      customer?: { email: string } | null;
    }[];
  };

  const paymentModel = data.paymentModel ?? "connect";
  const mor = paymentModel === "mor";
  const opsData = ops as {
    affiliates?: { owedToCreatorsCents: number; platformDisabled: boolean };
    mor?: { availableCents: number; currency: string };
    marketing?: { paused: boolean };
  } | undefined;
  const riskBadges: { label: string; tone: "red" | "amber" }[] = [];
  if (opsData?.marketing?.paused) {
    riskBadges.push({ label: "Marketing paused", tone: "red" });
  }
  if (opsData?.affiliates?.platformDisabled) {
    riskBadges.push({ label: "Affiliates locked", tone: "red" });
  }
  if (t.status === "SUSPENDED") {
    riskBadges.push({ label: "Suspended", tone: "amber" });
  }

  const currency = t.settings?.currency ?? "USD";
  const morCurrency = opsData?.mor?.currency ?? currency;
  const merchantUrl = import.meta.env.VITE_MERCHANT_ADMIN_URL ?? "http://localhost:3001";
  const plans = (plansData?.plans ?? []) as { id: string; name: string; slug: string }[];
  const planFeeBps = t.subscriptionPlan?.platformFeeBps ?? 500;
  const effectiveFeeBps = t.platformFeeBpsOverride ?? planFeeBps;
  const feeInput =
    feeTouched ? feeDraft : t.platformFeeBpsOverride != null ? String(t.platformFeeBpsOverride) : "";

  async function setStatus(status: string) {
    await api.updateTenant(t.id, { status });
    await queryClient.invalidateQueries({ queryKey: ["tenant", id] });
    await queryClient.invalidateQueries({ queryKey: ["tenants"] });
  }

  return (
    <div className="space-y-6">
      <Link to="/tenants" className="text-sm text-slate-500 hover:text-sky-600">
        ← Stores
      </Link>
      <div className="platform-page-header">
        <div>
          <h1>{t.name}</h1>
          <p className="font-mono text-sm text-slate-500">{t.slug}</p>
          <p className="mt-1 text-sm text-slate-600">
            Owner: {t.owner.email}
            {t.owner.name ? ` (${t.owner.name})` : ""}
          </p>
          {riskBadges.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {riskBadges.map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    b.tone === "red"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-1 font-mono text-xs text-slate-400">{t.id}</p>
        </div>
        <div className="platform-toolbar">
          <button
            type="button"
            className="platform-btn-secondary text-sm"
            onClick={() => {
              void navigator.clipboard.writeText(t.id);
            }}
          >
            Copy ID
          </button>
          <Link
            to={`/domains?q=${encodeURIComponent(t.slug)}`}
            className="platform-btn-secondary text-sm"
          >
            Domains
          </Link>
          <a
            href={t.storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="platform-btn-secondary"
          >
            View store
          </a>
          <PermissionGate permission="users:impersonate">
            <button
              type="button"
              className="platform-btn-primary"
              onClick={async () => {
                const { url } = await api.impersonateUser(t.owner.id);
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              Login as merchant
            </button>
          </PermissionGate>
          <PermissionGate permission="tenants:write">
            {t.status !== "ACTIVE" ? (
              <button type="button" onClick={() => setStatus("ACTIVE")} className="platform-btn-secondary">
                Activate
              </button>
            ) : null}
            {t.status !== "SUSPENDED" ? (
              <button type="button" onClick={() => setStatus("SUSPENDED")} className="platform-btn-danger">
                Suspend
              </button>
            ) : null}
          </PermissionGate>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={t.status} />
        <Stat label="Plan" value={t.subscriptionPlan?.name ?? "—"} />
        <Stat label="GMV (30d)" value={formatMoney(t.stats.gmv30d, currency)} />
        <Stat label="Orders (30d)" value={String(t.stats.orders30d)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a href="#store-products" className="platform-stat block transition hover:border-sky-300">
          <p className="text-sm text-slate-500">Products</p>
          <p className="mt-1 text-xl font-bold">{t._count.products}</p>
        </a>
        <Stat label="Customers" value={String(t._count.customers)} />
        {mor && opsData?.mor ? (
          <>
            <Stat
              label="Available balance"
              value={formatMoney(opsData.mor.availableCents, morCurrency)}
            />
            <Stat
              label="Owed to creators"
              value={formatMoney(
                opsData.affiliates?.owedToCreatorsCents ?? 0,
                morCurrency
              )}
              highlight
            />
          </>
        ) : null}
      </div>

      <TenantOpsHub tenantId={t.id} />

      <TenantMessagesPanel tenantId={t.id} />

      <TenantProductsPanel
        tenantId={t.id}
        tenantSlug={t.slug}
        storefrontUrl={t.storefrontUrl}
      />

      <section className="platform-card p-6 space-y-3 text-sm">
        <h2 className="font-semibold">Transfer ownership</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const email = new FormData(e.currentTarget).get("ownerEmail");
            if (!email || !confirm(`Transfer store to ${email}?`)) return;
            await api.transferTenantOwner(t.id, String(email));
            await onRefresh();
          }}
        >
          <input
            name="ownerEmail"
            type="email"
            placeholder="new owner@email.com"
            className="ugclab-input min-w-[16rem] flex-1"
          />
          <button type="submit" className="ugclab-btn border border-slate-200 bg-white text-sm">
            Transfer
          </button>
        </form>
      </section>

      <PlatformNotes entityType="tenant" entityId={t.id} />
      <TenantBillingPanel tenantId={t.id} onDone={onRefresh} />
      <TenantFeatureFlags tenantId={t.id} />

      <section className="platform-card p-6 space-y-4 text-sm">
        <h2 className="font-semibold">Subscription & fees</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-slate-500">Plan</span>
            <select
              className="ugclab-select mt-1 min-w-[12rem]"
              value={t.subscriptionPlanId ?? ""}
              onChange={async (e) => {
                const v = e.target.value;
                await api.updateTenant(t.id, {
                  subscriptionPlanId: v || null,
                });
                await queryClient.invalidateQueries({ queryKey: ["tenant", id] });
              }}
            >
              <option value="">No plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-slate-600">
            Plan fee: {(planFeeBps / 100).toFixed(2)}% · Effective:{" "}
            <strong>{(effectiveFeeBps / 100).toFixed(2)}%</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs text-slate-500">Platform fee override (bps)</span>
            <input
              type="number"
              min={0}
              max={5000}
              placeholder="Use plan default"
              className="ugclab-input mt-1 w-40"
              value={feeInput}
              onChange={(e) => {
                setFeeTouched(true);
                setFeeDraft(e.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary text-sm"
            onClick={async () => {
              const raw = feeInput.trim();
              await api.updateTenant(t.id, {
                platformFeeBpsOverride: raw === "" ? null : Number(raw),
              });
              setFeeTouched(false);
              setFeeDraft("");
              await queryClient.invalidateQueries({ queryKey: ["tenant", id] });
            }}
          >
            Save fee
          </button>
          {t.platformFeeBpsOverride != null ? (
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-sky-600"
              onClick={async () => {
                await api.updateTenant(t.id, { platformFeeBpsOverride: null });
                setFeeTouched(false);
                setFeeDraft("");
                await queryClient.invalidateQueries({ queryKey: ["tenant", id] });
              }}
            >
              Clear override
            </button>
          ) : null}
        </div>
        {(t.stats.pendingPayouts ?? 0) > 0 ? (
          <p className="text-amber-700">
            {t.stats.pendingPayouts} open payout request
            {t.stats.pendingPayouts === 1 ? "" : "s"} —{" "}
            <Link to="/payouts?status=open" className="font-medium text-sky-600">
              Review queue →
            </Link>
          </p>
        ) : null}
        <h2 className="font-semibold pt-2">Owner</h2>
        <p>{t.owner.name ?? "—"} · {t.owner.email}</p>
        <h2 className="font-semibold pt-2">Links</h2>
        <p>
          <a href={t.storefrontUrl} target="_blank" rel="noreferrer" className="text-sky-600">
            Storefront ↗
          </a>
        </p>
        <p>
          Merchant admin is separate — owner signs in at{" "}
          <a href={merchantUrl} className="text-sky-600">
            {merchantUrl}
          </a>
        </p>
        {t.customDomains.length > 0 ? (
          <p className="text-slate-500">
            Domains: {t.customDomains.map((d) => d.domain).join(", ")}
          </p>
        ) : null}
      </section>

      <TenantMorPayouts tenantId={t.id} />

      <section className="platform-card overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Recent orders</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-6 py-2">Order</th>
              <th className="px-6 py-2">Customer</th>
              <th className="px-6 py-2">Referral</th>
              <th className="px-6 py-2">Status</th>
              <th className="px-6 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {t.recentOrders.map((o) => (
              <tr key={o.id}>
                <td className="px-6 py-3">
                  <Link to={`/orders?q=${encodeURIComponent(o.orderNumber)}`} className="text-sky-600">
                    #{o.orderNumber}
                  </Link>
                </td>
                <td className="px-6 py-3">{o.customer?.email ?? "Guest"}</td>
                <td className="px-6 py-3 text-xs">
                  {o.referral ? (
                    <>
                      {o.referral.displayName}{" "}
                      <span className="text-slate-500">({o.referral.code})</span>
                      {(o.affiliateCommissionCents ?? 0) > 0 ? (
                        <span className="block text-amber-700">
                          {formatMoney(o.affiliateCommissionCents!, o.currency)} comm.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-3">{o.status}</td>
                <td className="px-6 py-3 text-right">
                  {formatMoney(o.totalAmount, o.currency)}
                </td>
              </tr>
            ))}
            {t.recentOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No orders
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="platform-stat">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-amber-800" : ""}`}>
        {value}
      </p>
    </div>
  );
}
