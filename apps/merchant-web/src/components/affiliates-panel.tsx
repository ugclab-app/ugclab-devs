import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { AffiliateCreatorEmailForm } from "@/components/affiliate-creator-email-form";
import { getAffiliateStorefrontUrl } from "@/lib/storefront";

type AffiliateSettings = {
  enabled: boolean;
  defaultCommissionBps: number;
  cookieDays: number;
};

type Partner = {
  id: string;
  code: string;
  displayName: string;
  email: string | null;
  commissionBps: number | null;
  status: string;
  stats?: { orderCount: number; approvedCents: number; paidCents: number };
};

type Commission = {
  id: string;
  partner: { code: string; displayName: string };
  orderNumber: string;
  commissionCents: number;
  commissionBps: number;
  status: string;
  payoutNote: string | null;
  createdAt: string;
};

export function AffiliatesPanel({ tenantSlug }: { tenantSlug: string }) {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const [subTab, setSubTab] = useState<"settings" | "partners" | "commissions">("settings");
  const [commissionFilter, setCommissionFilter] = useState<string>("APPROVED");
  const [commissionPartnerId, setCommissionPartnerId] = useState<string>("");
  const [payoutNote, setPayoutNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["affiliate-settings"],
    queryFn: () => api.affiliateSettings(),
  });

  const { data: partnersData } = useQuery({
    queryKey: ["affiliate-partners"],
    queryFn: () => api.affiliatePartners(),
  });

  const { data: commissionsData } = useQuery({
    queryKey: ["affiliate-commissions", commissionFilter, commissionPartnerId],
    queryFn: () =>
      api.affiliateCommissions({
        status: commissionFilter || undefined,
        partnerId: commissionPartnerId || undefined,
      }),
    enabled: subTab === "commissions",
  });

  const settings = settingsData?.settings as AffiliateSettings | undefined;
  const partners = (partnersData?.partners ?? []) as Partner[];
  const commissions = (commissionsData?.commissions ?? []) as Commission[];

  const currency = "USD";

  async function run(fn: () => Promise<unknown>, msg: string) {
    setPending(true);
    try {
      await fn();
      setAlert({ ok: true, message: msg });
      await qc.invalidateQueries({ queryKey: ["affiliate-settings"] });
      await qc.invalidateQueries({ queryKey: ["affiliate-partners"] });
      await qc.invalidateQueries({ queryKey: ["affiliate-commissions"] });
      await qc.invalidateQueries({ queryKey: ["mor-balance"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  function copyLink(code: string) {
    const url = getAffiliateStorefrontUrl(tenantSlug, code);
    void navigator.clipboard.writeText(url);
    setAlert({ ok: true, message: "Link copied" });
  }

  if (settingsLoading) {
    return <p className="text-sm text-zinc-500">Loading affiliates…</p>;
  }

  const owedCents = partners.reduce((s, p) => s + (p.stats?.approvedCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
        <strong>Tescommerce does not pay creators.</strong> Pay them directly (PayPal, bank, Wise,
        etc.), then mark commissions as paid here for your records.
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["settings", "Program"],
            ["partners", "Creators"],
            ["commissions", "Commissions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              subTab === id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "settings" && settings ? (
        <form
          className="max-w-md space-y-4 rounded-xl border border-zinc-200 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              () =>
                api.patchAffiliateSettings({
                  enabled: fd.get("enabled") === "on",
                  defaultCommissionBps: Math.round(
                    Number(fd.get("defaultPercent")) * 100
                  ),
                  cookieDays: Number(fd.get("cookieDays")),
                }),
              "Program settings saved"
            );
          }}
        >
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
              className="rounded"
            />
            Enable creator referral program
          </label>
          <div>
            <label className="text-xs font-medium text-zinc-500">Default commission %</label>
            <input
              name="defaultPercent"
              type="number"
              min={0}
              max={50}
              step={0.5}
              defaultValue={(settings.defaultCommissionBps / 100).toFixed(1)}
              className="ugclab-input mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Attribution window (days)</label>
            <input
              name="cookieDays"
              type="number"
              min={1}
              max={90}
              defaultValue={settings.cookieDays}
              className="ugclab-input mt-1 w-full"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Owed to creators (unpaid):{" "}
            <strong>{formatMoney(owedCents, currency)}</strong>
          </p>
          <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
            Save settings
          </button>
        </form>
      ) : null}

      {subTab === "partners" ? (
        <div className="space-y-6">
          <form
            className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const pct = fd.get("commissionPercent");
              void run(
                () =>
                  api.createAffiliatePartner({
                    displayName: fd.get("displayName"),
                    email: fd.get("email") || undefined,
                    code: fd.get("code") || undefined,
                    commissionBps:
                      pct && String(pct).trim()
                        ? Math.round(Number(pct) * 100)
                        : undefined,
                  }),
                "Creator added"
              );
              (e.target as HTMLFormElement).reset();
            }}
          >
            <h2 className="font-semibold">Add creator</h2>
            <input
              name="displayName"
              required
              placeholder="Name"
              className="ugclab-input w-full"
            />
            <input
              name="email"
              type="email"
              placeholder="Email (optional, for your records)"
              className="ugclab-input w-full"
            />
            <input name="code" placeholder="Link code (auto if empty)" className="ugclab-input w-full" />
            <input
              name="commissionPercent"
              type="number"
              min={0}
              max={50}
              step={0.5}
              placeholder="Commission % (optional override)"
              className="ugclab-input w-full"
            />
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Add creator
            </button>
          </form>

          <p className="text-sm text-zinc-600">
            <strong>Manage creators:</strong> copy link · email (templates or custom) · edit ·
            pause · remove. Pay owed amounts in{" "}
            <button
              type="button"
              className="font-medium text-violet-700 underline"
              onClick={() => setSubTab("commissions")}
            >
              Commissions
            </button>
            .
          </p>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Creator</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Orders</th>
                  <th className="px-4 py-2">Owed</th>
                  <th className="px-4 py-2">Paid</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {partners.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.displayName}</div>
                        {p.email ? (
                          <div className="text-xs text-zinc-500">{p.email}</div>
                        ) : null}
                        {p.status === "PAUSED" ? (
                          <span className="text-xs text-amber-700">Paused</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3">{p.stats?.orderCount ?? 0}</td>
                      <td className="px-4 py-3">
                        {(p.stats?.approvedCents ?? 0) > 0 ? (
                          <button
                            type="button"
                            className="font-medium text-violet-700 hover:underline"
                            onClick={() => {
                              setCommissionPartnerId(p.id);
                              setCommissionFilter("APPROVED");
                              setSubTab("commissions");
                            }}
                          >
                            {formatMoney(p.stats?.approvedCents ?? 0, currency)}
                          </button>
                        ) : (
                          formatMoney(0, currency)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(p.stats?.paidCents ?? 0, currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {p.status === "ACTIVE" ? (
                            <button
                              type="button"
                              className="ugclab-btn border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                              onClick={() => copyLink(p.code)}
                            >
                              Copy link
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="ugclab-btn border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800"
                            onClick={() => {
                              setEmailingId(emailingId === p.id ? null : p.id);
                              setEditingId(null);
                            }}
                          >
                            {emailingId === p.id ? "Close email" : "Email"}
                          </button>
                          <button
                            type="button"
                            className="ugclab-btn ugclab-btn-ghost px-2.5 py-1 text-xs"
                            onClick={() => {
                              setEditingId(editingId === p.id ? null : p.id);
                              setEmailingId(null);
                            }}
                          >
                            {editingId === p.id ? "Close" : "Edit"}
                          </button>
                          <button
                            type="button"
                            className="ugclab-btn ugclab-btn-secondary px-2.5 py-1 text-xs"
                            disabled={pending}
                            onClick={() =>
                              void run(
                                () =>
                                  api.patchAffiliatePartner(p.id, {
                                    status:
                                      p.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                                  }),
                                p.status === "ACTIVE" ? "Creator paused" : "Creator activated"
                              )
                            }
                          >
                            {p.status === "ACTIVE" ? "Pause" : "Activate"}
                          </button>
                          <button
                            type="button"
                            className="ugclab-btn border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-800"
                            disabled={pending}
                            onClick={() => {
                              if (
                                !confirm(
                                  `Remove "${p.displayName}"? Their referral link stops working. Past commissions stay in Commissions.`
                                )
                              )
                                return;
                              void run(
                                () => api.deleteAffiliatePartner(p.id),
                                "Creator removed"
                              );
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                    {emailingId === p.id ? (
                      <tr>
                        <td colSpan={6} className="bg-violet-50/40 px-4 py-4">
                          <AffiliateCreatorEmailForm
                            partner={p}
                            pending={pending}
                            onClose={() => setEmailingId(null)}
                            onSend={(fn) =>
                              void run(async () => {
                                await fn();
                                setEmailingId(null);
                              }, `Email sent to ${p.email}`)
                            }
                          />
                        </td>
                      </tr>
                    ) : null}
                    {editingId === p.id ? (
                      <tr>
                        <td colSpan={6} className="bg-zinc-50 px-4 py-4">
                          <form
                            className="grid max-w-lg gap-3 sm:grid-cols-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const fd = new FormData(e.currentTarget);
                              const pct = fd.get("commissionPercent");
                              void run(async () => {
                                await api.patchAffiliatePartner(p.id, {
                                  displayName: fd.get("displayName"),
                                  email: fd.get("email") || null,
                                  commissionBps:
                                    pct && String(pct).trim()
                                      ? Math.round(Number(pct) * 100)
                                      : null,
                                });
                                setEditingId(null);
                              }, "Creator updated");
                            }}
                          >
                            <div className="sm:col-span-2">
                              <p className="text-xs text-zinc-500">
                                Link code <span className="font-mono">{p.code}</span> cannot be
                                changed after creation.
                              </p>
                            </div>
                            <input
                              name="displayName"
                              required
                              defaultValue={p.displayName}
                              placeholder="Name"
                              className="ugclab-input w-full"
                            />
                            <input
                              name="email"
                              type="email"
                              defaultValue={p.email ?? ""}
                              placeholder="Email"
                              className="ugclab-input w-full"
                            />
                            <input
                              name="commissionPercent"
                              type="number"
                              min={0}
                              max={50}
                              step={0.5}
                              placeholder="Commission % (empty = program default)"
                              defaultValue={
                                p.commissionBps != null
                                  ? (p.commissionBps / 100).toFixed(1)
                                  : ""
                              }
                              className="ugclab-input w-full sm:col-span-2"
                            />
                            <div className="flex gap-2 sm:col-span-2">
                              <button
                                type="submit"
                                disabled={pending}
                                className="ugclab-btn ugclab-btn-primary"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="ugclab-btn ugclab-btn-secondary"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {!partners.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No creators yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {subTab === "commissions" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Creator</label>
              <select
                value={commissionPartnerId}
                onChange={(e) => setCommissionPartnerId(e.target.value)}
                className="ugclab-select mt-1 block min-w-[160px]"
              >
                <option value="">All creators</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Status</label>
              <select
                value={commissionFilter}
                onChange={(e) => setCommissionFilter(e.target.value)}
                className="ugclab-select mt-1 block"
              >
                <option value="APPROVED">Owed (approved)</option>
                <option value="PAID">Paid (marked)</option>
                <option value="VOID">Void</option>
                <option value="">All</option>
              </select>
            </div>
            <input
              value={payoutNote}
              onChange={(e) => setPayoutNote(e.target.value)}
              placeholder="Payout note (e.g. PayPal 2026-05-25)"
              className="ugclab-input min-w-[200px] flex-1"
            />
            <button
              type="button"
              className="ugclab-btn ugclab-btn-secondary text-sm"
              onClick={() => {
                const ids = commissions
                  .filter((c) => c.status === "APPROVED")
                  .map((c) => c.id);
                if (!ids.length) {
                  setAlert({ ok: false, message: "No owed commissions in view" });
                  return;
                }
                if (!confirm(`Mark ${ids.length} commission(s) as paid?`)) return;
                void run(
                  () => api.bulkMarkAffiliateCommissionsPaid(ids, payoutNote.trim() || undefined),
                  "Marked as paid"
                );
              }}
            >
              Mark visible owed as paid
            </button>
            <button
              type="button"
              className="ugclab-btn ugclab-btn-secondary text-sm"
              onClick={() => {
                void api.exportAffiliateCommissionsCsv().then((blob) => {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `affiliate-commissions-${tenantSlug}.csv`;
                  a.click();
                }).catch((e) =>
                  setAlert({
                    ok: false,
                    message: e instanceof Error ? e.message : "Export failed",
                  })
                );
              }}
            >
              Export CSV
            </button>
          </div>

          <ul className="divide-y rounded-xl border border-zinc-200">
            {commissions.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">{c.partner.displayName}</span>
                  <span className="text-zinc-400"> · </span>
                  <span className="font-mono text-xs">#{c.orderNumber}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {(c.commissionBps / 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatMoney(c.commissionCents, currency)}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
                    {c.status}
                  </span>
                  {c.status === "APPROVED" ? (
                    <button
                      type="button"
                      className="ugclab-btn ugclab-btn-primary px-3 py-1 text-xs"
                      disabled={pending}
                      onClick={() =>
                        void run(
                          () =>
                            api.markAffiliateCommissionPaid(
                              c.id,
                              payoutNote.trim() || undefined
                            ),
                          "Marked as paid"
                        )
                      }
                    >
                      Mark paid
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
            {!commissions.length ? (
              <li className="px-4 py-8 text-center text-zinc-500">No commissions.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
