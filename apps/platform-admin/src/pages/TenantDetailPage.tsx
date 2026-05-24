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

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => api.tenant(id!),
    enabled: !!id,
  });

  return (
    <QueryState query={query}>
      {(data) => (
        <TenantDetailContent
          data={data}
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
  id,
  onRefresh,
}: {
  data: { tenant: unknown };
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
    owner: { email: string; name: string | null };
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
      customer?: { email: string } | null;
    }[];
  };

  const currency = t.settings?.currency ?? "USD";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.name}</h1>
          <p className="font-mono text-sm text-slate-500">{t.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.status !== "ACTIVE" ? (
            <button
              type="button"
              onClick={() => setStatus("ACTIVE")}
              className="ugclab-btn ugclab-btn-primary text-sm"
            >
              Activate
            </button>
          ) : null}
          {t.status !== "SUSPENDED" ? (
            <button
              type="button"
              onClick={() => setStatus("SUSPENDED")}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
            >
              Suspend
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={t.status} />
        <Stat label="Plan" value={t.subscriptionPlan?.name ?? "—"} />
        <Stat label="GMV (30d)" value={formatMoney(t.stats.gmv30d, currency)} />
        <Stat label="Orders (30d)" value={String(t.stats.orders30d)} />
      </div>

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
          <tbody className="divide-y">
            {t.recentOrders.map((o) => (
              <tr key={o.id}>
                <td className="px-6 py-3">#{o.orderNumber}</td>
                <td className="px-6 py-3">{o.customer?.email ?? "Guest"}</td>
                <td className="px-6 py-3">{o.status}</td>
                <td className="px-6 py-3 text-right">
                  {formatMoney(o.totalAmount, o.currency)}
                </td>
              </tr>
            ))}
            {t.recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-stat">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
