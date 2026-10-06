import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { EmptyState } from "@/components/empty-state";
import { FormAlert } from "@/components/form-alert";

type B2bCatalog = { id: string; name: string; productIds: string[] };

type Company = {
  id: string;
  name: string;
  status: string;
  paymentTermsDays: number | null;
  depositPercent?: number | null;
  note: string | null;
  catalogProductIds?: string[];
  catalogs?: B2bCatalog[] | null;
  priceList: { id: string; name: string } | null;
  buyers: {
    id: string;
    email: string;
    role: string;
    customer: { email: string; name: string | null };
  }[];
  _count: { orders: number; customers: number };
};

type PriceList = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  _count?: { companies: number };
};

type Quote = {
  id: string;
  title: string;
  status: string;
  subtotalCents: number;
  currency: string;
  createdAt: string;
  company: { id: string; name: string };
};

export default function B2bPage() {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ["b2b-companies"],
    queryFn: () => api.b2bCompanies(),
  });
  const { data: listsData } = useQuery({
    queryKey: ["b2b-price-lists"],
    queryFn: () => api.b2bPriceLists(),
  });
  const { data: quotesData } = useQuery({
    queryKey: ["b2b-quotes"],
    queryFn: () => api.b2bQuotes(),
  });

  const companies = (companiesData?.companies ?? []) as Company[];
  const priceLists = (listsData?.priceLists ?? []) as PriceList[];
  const quotes = (quotesData?.quotes ?? []) as Quote[];

  async function run(fn: () => Promise<unknown>, message: string) {
    setPending(true);
    setAlert({});
    try {
      await fn();
      setAlert({ ok: true, message });
      await qc.invalidateQueries({ queryKey: ["b2b-companies"] });
      await qc.invalidateQueries({ queryKey: ["b2b-price-lists"] });
      await qc.invalidateQueries({ queryKey: ["b2b-quotes"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <AdminPageShell
      crumbs={[{ label: "B2B" }]}
      title="B2B"
      description="Companies, buyers, quotes, and wholesale price lists."
    >
      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              () =>
                api.createB2bCompany({
                  name: String(fd.get("name") ?? ""),
                  paymentTermsDays: fd.get("paymentTermsDays")
                    ? Number(fd.get("paymentTermsDays"))
                    : null,
                  note: String(fd.get("note") ?? "") || null,
                  priceListId: String(fd.get("priceListId") ?? "") || null,
                }),
              "Company created"
            ).then(() => (e.target as HTMLFormElement).reset());
          }}
        >
          <h2 className="font-semibold">New company</h2>
          <input
            name="name"
            required
            placeholder="Company name"
            className="ugclab-input w-full"
          />
          <input
            name="paymentTermsDays"
            type="number"
            min={0}
            placeholder="Payment terms (days)"
            className="ugclab-input w-full"
          />
          <select name="priceListId" className="ugclab-select w-full">
            <option value="">No price list</option>
            {priceLists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} ({pl.currency})
              </option>
            ))}
          </select>
          <input name="note" placeholder="Note" className="ugclab-input w-full" />
          <button
            type="submit"
            disabled={pending}
            className="ugclab-btn ugclab-btn-primary text-sm"
          >
            Create company
          </button>
        </form>

        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              () =>
                api.createB2bPriceList({
                  name: String(fd.get("name") ?? ""),
                  currency: String(fd.get("currency") ?? "") || undefined,
                }),
              "Price list created"
            ).then(() => (e.target as HTMLFormElement).reset());
          }}
        >
          <h2 className="font-semibold">New price list</h2>
          <input
            name="name"
            required
            placeholder="Price list name"
            className="ugclab-input w-full"
          />
          <input
            name="currency"
            placeholder="Currency (e.g. USD)"
            className="ugclab-input w-full"
            maxLength={3}
          />
          <button
            type="submit"
            disabled={pending}
            className="ugclab-btn ugclab-btn-primary text-sm"
          >
            Create price list
          </button>
          {priceLists.length > 0 ? (
            <ul className="divide-y rounded-lg border text-sm">
              {priceLists.map((pl) => (
                <li key={pl.id} className="px-3 py-2">
                  {pl.name} · {pl.currency}
                  {pl._count?.companies != null
                    ? ` · ${pl._count.companies} companies`
                    : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </div>

      <form
        className="admin-card mt-6 max-w-xl space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const companyId = String(fd.get("companyId") ?? "");
          const productId = String(fd.get("productId") ?? "").trim();
          const lineTitle = String(fd.get("lineTitle") ?? "").trim();
          const quantity = Number(fd.get("quantity") ?? 1) || 1;
          const unitAmount = Math.round(
            (Number(fd.get("unitAmount") ?? 0) || 0) * 100
          );
          const lines =
            productId && lineTitle && unitAmount > 0
              ? [{ productId, title: lineTitle, quantity, unitAmount }]
              : [];
          void run(
            () =>
              api.createB2bQuote({
                companyId,
                title: String(fd.get("title") ?? "") || "Quote",
                note: String(fd.get("note") ?? "") || undefined,
                currency: String(fd.get("currency") ?? "") || undefined,
                lines,
              }),
            "Quote created"
          ).then(() => (e.target as HTMLFormElement).reset());
        }}
      >
        <h2 className="font-semibold">New quote</h2>
        <select name="companyId" required className="ugclab-select w-full">
          <option value="">Select company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="title"
          placeholder="Quote title"
          className="ugclab-input w-full"
        />
        <input
          name="currency"
          placeholder="Currency (e.g. USD)"
          className="ugclab-input w-full"
          maxLength={3}
        />
        <input name="note" placeholder="Note" className="ugclab-input w-full" />
        <p className="text-xs text-zinc-500">Optional line item</p>
        <input
          name="productId"
          placeholder="Product ID"
          className="ugclab-input w-full"
        />
        <input
          name="lineTitle"
          placeholder="Line title"
          className="ugclab-input w-full"
        />
        <div className="flex gap-2">
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            placeholder="Qty"
            className="ugclab-input w-24"
          />
          <input
            name="unitAmount"
            type="number"
            step="0.01"
            min={0}
            placeholder="Unit price"
            className="ugclab-input flex-1"
          />
        </div>
        <button
          type="submit"
          disabled={pending || companies.length === 0}
          className="ugclab-btn ugclab-btn-primary text-sm"
        >
          Create quote
        </button>
        {quotes.length > 0 ? (
          <ul className="divide-y rounded-lg border text-sm">
            {quotes.slice(0, 8).map((q) => (
              <li key={q.id} className="px-3 py-2">
                {q.title} · {q.company.name} ·{" "}
                {(q.subtotalCents / 100).toFixed(2)} {q.currency}
                <span className="ml-1 text-xs uppercase text-zinc-500">
                  {q.status}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Companies</h2>
        {companies.length === 0 ? (
          <EmptyState
            title="No B2B companies"
            description="Create a company and add buyers by email."
          />
        ) : (
          companies.map((c) => (
            <div key={c.id} className="admin-card space-y-3 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {c.name}{" "}
                    <span className="text-xs font-normal uppercase text-zinc-500">
                      {c.status}
                    </span>
                  </p>
                  <p className="text-sm text-zinc-500">
                    {c._count.customers} customers · {c._count.orders} orders
                    {c.priceList ? ` · ${c.priceList.name}` : ""}
                    {c.paymentTermsDays != null
                      ? ` · Net ${c.paymentTermsDays}`
                      : ""}
                    {c.depositPercent != null ? ` · ${c.depositPercent}% deposit` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Payment terms:{" "}
                    {c.paymentTermsDays != null
                      ? `Net ${c.paymentTermsDays} days`
                      : "Not set"}
                    {c.depositPercent != null
                      ? ` · Deposit ${c.depositPercent}%`
                      : ""}
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    className="mt-2 text-sm font-medium text-violet-700 hover:underline"
                    onClick={() => {
                      void run(async () => {
                        const res = await api.b2bSetupCardSession(c.id);
                        if (res.url) window.location.href = res.url;
                      }, "Opening Stripe…");
                    }}
                  >
                    Save card for company
                  </button>
                </div>
              </div>
              {c.buyers.length > 0 ? (
                <ul className="text-sm text-zinc-600">
                  {c.buyers.map((b) => (
                    <li key={b.id}>
                      {b.email}
                      {b.customer.name ? ` (${b.customer.name})` : ""} · {b.role}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">No buyers yet</p>
              )}
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  void run(
                    () =>
                      api.addB2bBuyer(c.id, {
                        email: String(fd.get("email") ?? ""),
                        name: String(fd.get("name") ?? "") || undefined,
                      }),
                    "Buyer added"
                  ).then(() => (e.target as HTMLFormElement).reset());
                }}
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Buyer email"
                  className="ugclab-input flex-1 min-w-[10rem]"
                />
                <input
                  name="name"
                  placeholder="Name"
                  className="ugclab-input w-36"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                >
                  Add buyer
                </button>
              </form>
              <form
                className="space-y-2 border-t border-zinc-100 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  void run(
                    () =>
                      api.patchB2bCompany(c.id, {
                        paymentTermsDays: fd.get("paymentTermsDays")
                          ? Number(fd.get("paymentTermsDays"))
                          : null,
                        depositPercent: fd.get("depositPercent")
                          ? Number(fd.get("depositPercent"))
                          : null,
                      }),
                    "Terms updated"
                  );
                }}
              >
                <p className="text-xs font-medium text-zinc-600">Payment terms & deposit</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    name="paymentTermsDays"
                    type="number"
                    min={0}
                    defaultValue={c.paymentTermsDays ?? ""}
                    placeholder="Net days"
                    className="ugclab-input w-28"
                  />
                  <input
                    name="depositPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={c.depositPercent ?? ""}
                    placeholder="Deposit %"
                    className="ugclab-input w-28"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  >
                    Save terms
                  </button>
                </div>
              </form>
              <form
                className="space-y-2 border-t border-zinc-100 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  let catalogs: B2bCatalog[] = [];
                  try {
                    catalogs = JSON.parse(String(fd.get("catalogsJson") ?? "[]")) as B2bCatalog[];
                  } catch {
                    setAlert({ ok: false, message: "Invalid catalogs JSON" });
                    return;
                  }
                  void run(
                    () => api.patchB2bCompany(c.id, { catalogs }),
                    "Catalogs updated"
                  );
                }}
              >
                <label className="block text-xs font-medium text-zinc-600">
                  Named catalogs (JSON: [{`{ id, name, productIds }`}])
                </label>
                <textarea
                  name="catalogsJson"
                  defaultValue={JSON.stringify(
                    c.catalogs?.length
                      ? c.catalogs
                      : c.catalogProductIds?.length
                        ? [
                            {
                              id: "default",
                              name: "Default",
                              productIds: c.catalogProductIds,
                            },
                          ]
                        : [],
                    null,
                    2
                  )}
                  className="ugclab-input w-full min-h-[120px] font-mono text-xs"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                >
                  Save catalogs
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </AdminPageShell>
  );
}
