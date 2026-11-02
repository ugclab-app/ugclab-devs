import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { CustomerSegmentBadges } from "@/components/customer-segment-badges";
import { OrderStatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@/lib/database-types";

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customer(id!),
    enabled: !!id,
  });

  const patch = useMutation({
    mutationFn: (marketingOptOut: boolean) =>
      api.updateCustomer(id!, { marketingOptOut }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", id] }),
  });
  const [creditInput, setCreditInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const adjust = useMutation({
    mutationFn: (body: { storeCreditDeltaCents?: number; loyaltyPointsDelta?: number }) =>
      api.updateCustomer(id!, body),
    onSuccess: () => {
      setAdjustError(null);
      setCreditInput("");
      setPointsInput("");
      return qc.invalidateQueries({ queryKey: ["customer", id] });
    },
    onError: (e) => setAdjustError(e instanceof Error ? e.message : "Update failed"),
  });
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState("");
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [eraseNote, setEraseNote] = useState<string | null>(null);
  const anonymize = useMutation({
    mutationFn: () => api.anonymizeCustomer(id!),
    onSuccess: (r) => {
      setEraseError(null);
      setEraseOpen(false);
      setEraseConfirm("");
      setEraseNote(
        r.hadStripeCustomer
          ? "Personal data erased. Also delete the customer in your Stripe dashboard."
          : r.alreadyDone
            ? "Personal data was already erased."
            : "Personal data erased."
      );
      return qc.invalidateQueries({ queryKey: ["customer", id] });
    },
    onError: (e) => setEraseError(e instanceof Error ? e.message : "Erase failed"),
  });

  if (isLoading || !data) {
    return (
      <AdminPageShell crumbs={[{ label: "Customers", to: "/customers" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  const customer = data.customer as {
    email: string;
    name: string | null;
    country: string | null;
    createdAt: string;
    marketingOptOut: boolean;
    emailBounced: boolean;
    anonymizedAt?: string | null;
    storeCreditCents?: number | null;
    storeCreditCurrency?: string | null;
    loyaltyPoints?: number | null;
    orders: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      totalAmount: number;
      createdAt: string;
      shippingName: string | null;
      shippingCity: string | null;
      shippingCountry: string | null;
    }[];
  };

  const summary = data.summary as {
    orderCount: number;
    paidOrderCount: number;
    totalSpent: number;
    aov: number;
    segment: string[];
    lastOrderAt: string | null;
    firstOrderAt: string | null;
  };

  const openCart = data.openAbandonedCart as {
    id: string;
    subtotalAmount: number;
    currency: string;
    updatedAt: string;
  } | null;

  const creditCurrency = customer.storeCreditCurrency || data.currency;
  const storeCreditCents = customer.storeCreditCents ?? 0;
  const loyaltyPoints = customer.loyaltyPoints ?? 0;
  const anonymized = !!customer.anonymizedAt;

  function submitCredit(sign: 1 | -1) {
    const major = parseFloat(creditInput);
    if (!Number.isFinite(major) || major <= 0) {
      setAdjustError("Enter an amount greater than 0");
      return;
    }
    const cents = Math.round(Math.abs(major) * 100) * sign;
    if (sign < 0 && Math.abs(cents) > storeCreditCents) {
      if (!confirm("This will take the balance below zero. Continue?")) return;
    }
    adjust.mutate({ storeCreditDeltaCents: cents });
  }

  function submitPoints(sign: 1 | -1) {
    const pts = parseInt(pointsInput, 10);
    if (!Number.isFinite(pts) || pts <= 0) {
      setAdjustError("Enter a whole number of points greater than 0");
      return;
    }
    adjust.mutate({ loyaltyPointsDelta: Math.abs(pts) * sign });
  }

  const latestOrder = customer.orders[0];
  const shipLine = latestOrder
    ? [
        latestOrder.shippingName,
        latestOrder.shippingCity,
        latestOrder.shippingCountry,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <AdminPageShell
      crumbs={[
        { label: "Customers", to: "/customers" },
        { label: customer.email },
      ]}
      title={customer.name || customer.email}
      description={customer.name ? customer.email : undefined}
      actions={
        anonymized ? (
          <button
            type="button"
            disabled
            title="Personal data erased — email actions are unavailable"
            className="ugclab-btn border border-zinc-200 bg-white text-sm opacity-50"
          >
            Email marketing
          </button>
        ) : (
          <Link
            to="/marketing"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            state={{ audienceEmail: customer.email }}
          >
            Email marketing
          </Link>
        )
      }
    >
      {anonymized ? (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Personal data erased on {formatShortDate(customer.anonymizedAt ?? null)}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CustomerSegmentBadges segment={summary.segment} />
        {customer.country ? (
          <span className="text-sm text-zinc-500">Country: {customer.country}</span>
        ) : null}
        {customer.emailBounced ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Email bounced
          </span>
        ) : null}
        <span className="text-sm text-zinc-500">
          Customer since {formatShortDate(customer.createdAt)}
        </span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total spent"
          value={formatMoney(summary.totalSpent, data.currency)}
        />
        <Stat label="Orders" value={String(summary.orderCount)} />
        <Stat
          label="Average order"
          value={
            summary.paidOrderCount > 0
              ? formatMoney(summary.aov, data.currency)
              : "—"
          }
        />
        <Stat
          label="Last order"
          value={formatShortDate(summary.lastOrderAt)}
        />
      </div>

      <section className="admin-card mb-8 p-6 space-y-5">
        <h2 className="font-semibold text-zinc-900">Store credit & loyalty</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Store credit</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {formatMoney(storeCreditCents, creditCurrency)}
            </p>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-600">
                Adjust store credit ({creditCurrency})
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={creditInput}
                  onChange={(e) => setCreditInput(e.target.value)}
                  placeholder="0.00"
                  className="ugclab-input w-full"
                />
                <button
                  type="button"
                  disabled={adjust.isPending}
                  onClick={() => submitCredit(1)}
                  className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
                >
                  + Add
                </button>
                <button
                  type="button"
                  disabled={adjust.isPending}
                  onClick={() => submitCredit(-1)}
                  className="ugclab-btn border border-zinc-200 bg-white text-sm disabled:opacity-50"
                >
                  − Deduct
                </button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Loyalty points</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {loyaltyPoints.toLocaleString()} pts
            </p>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-600">Adjust points</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  step="1"
                  min={0}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="0"
                  className="ugclab-input w-full"
                />
                <button
                  type="button"
                  disabled={adjust.isPending}
                  onClick={() => submitPoints(1)}
                  className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
                >
                  + Add
                </button>
                <button
                  type="button"
                  disabled={adjust.isPending}
                  onClick={() => submitPoints(-1)}
                  className="ugclab-btn border border-zinc-200 bg-white text-sm disabled:opacity-50"
                >
                  − Deduct
                </button>
              </div>
            </div>
          </div>
        </div>
        {adjustError ? <p className="text-sm text-red-600">{adjustError}</p> : null}
      </section>

      <section className="admin-card mb-8 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Preferences</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={customer.marketingOptOut}
            disabled={patch.isPending}
            onChange={(e) => patch.mutate(e.target.checked)}
          />
          <span>
            Unsubscribed from marketing
            {data.emailSubscriber ? " (synced with email list)" : ""}
          </span>
        </label>
        {shipLine ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-800">Latest shipping: </span>
            {shipLine}
          </p>
        ) : null}
        {openCart ? (
          <p className="text-sm">
            <span className="font-medium text-amber-800">Open abandoned cart: </span>
            {formatMoney(openCart.subtotalAmount, openCart.currency)} · updated{" "}
            {formatShortDate(openCart.updatedAt)}
            {" · "}
            <Link to="/abandoned-carts" className="text-violet-600 font-medium">
              View carts
            </Link>
          </p>
        ) : null}
      </section>

      <div className="admin-card overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Order history</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customer.orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No orders yet
                </td>
              </tr>
            ) : (
              customer.orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-4">
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-semibold text-violet-600"
                    >
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatShortDate(o.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatMoney(o.totalAmount, data.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="admin-card mt-8 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Privacy</h2>
        <p className="text-sm text-zinc-600">
          Export everything stored about this customer, or erase their personal data (GDPR
          “right to be forgotten”).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.open(api.customerExportUrl(id!), "_blank")}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Export data (JSON)
          </button>
          <button
            type="button"
            disabled={anonymized || anonymize.isPending}
            onClick={() => {
              setEraseError(null);
              setEraseOpen(true);
            }}
            className="ugclab-btn border border-red-200 bg-white text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Erase personal data
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Blanks name, email, addresses, phone, wishlist, marketing subscription and review names.
          Orders stay for accounting. Cannot be undone.
        </p>
        {eraseOpen && !anonymized ? (
          <form
            className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (eraseConfirm.trim() !== "ERASE") {
                setEraseError("Type ERASE to confirm");
                return;
              }
              anonymize.mutate();
            }}
          >
            <p className="text-sm text-red-800">
              Type <span className="font-mono font-semibold">ERASE</span> to permanently erase
              this customer’s personal data.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={eraseConfirm}
                onChange={(e) => setEraseConfirm(e.target.value)}
                placeholder="ERASE"
                autoComplete="off"
                className="ugclab-input w-40 font-mono"
              />
              <button
                type="submit"
                disabled={eraseConfirm.trim() !== "ERASE" || anonymize.isPending}
                className="ugclab-btn bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {anonymize.isPending ? "Erasing…" : "Erase now"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEraseOpen(false);
                  setEraseConfirm("");
                  setEraseError(null);
                }}
                className="ugclab-btn border border-zinc-200 bg-white text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        {eraseError ? <p className="text-sm text-red-600">{eraseError}</p> : null}
        {eraseNote ? <p className="text-sm text-zinc-700">{eraseNote}</p> : null}
      </section>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
