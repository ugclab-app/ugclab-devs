import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

type Zone = {
  id: string;
  name: string;
  countries: string[];
  flatRateAmount: number;
  freeShippingThreshold: number | null;
  currency: string;
};

export default function ShippingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["shipping"],
    queryFn: () => api.shippingZones(),
  });
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const zones = (data?.zones ?? []) as Zone[];
  const currency = data?.currency ?? "USD";

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createShippingZone({
        name: fd.get("name"),
        countries: fd.get("countries"),
        flatRate: fd.get("flatRate"),
        freeShippingThreshold: fd.get("freeShippingThreshold") || null,
      });
      (e.target as HTMLFormElement).reset();
      setAlert({ ok: true, message: "Zone created" });
      await queryClient.invalidateQueries({ queryKey: ["shipping"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shipping zones</h1>
      <p className="text-sm text-zinc-500">
        Flat rates by country group. Free shipping threshold is optional (order subtotal in {currency}).
      </p>
      <FormAlert ok={alert.ok} message={alert.message} />
      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-6 py-3">Zone</th>
                <th className="px-6 py-3">Countries</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3">Free from</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {zones.map((z) => (
                <tr key={z.id}>
                  <td className="px-6 py-4 font-medium">{z.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{z.countries.join(", ")}</td>
                  <td className="px-6 py-4">
                    {formatMoney(z.flatRateAmount, z.currency)}
                  </td>
                  <td className="px-6 py-4">
                    {z.freeShippingThreshold
                      ? formatMoney(z.freeShippingThreshold, z.currency)
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this zone?")) return;
                        await api.deleteShippingZone(z.id);
                        await queryClient.invalidateQueries({ queryKey: ["shipping"] });
                      }}
                      className="text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={onCreate} className="admin-card max-w-xl space-y-4 p-6">
        <h2 className="font-semibold">Add zone</h2>
        <input name="name" placeholder="Zone name" required className="ugclab-input" />
        <input
          name="countries"
          placeholder="Countries (US, CA, GB…)"
          required
          className="ugclab-input font-mono"
        />
        <input
          name="flatRate"
          type="number"
          step="0.01"
          placeholder="Flat rate"
          required
          className="ugclab-input"
        />
        <input
          name="freeShippingThreshold"
          type="number"
          step="0.01"
          placeholder="Free shipping from (optional)"
          className="ugclab-input"
        />
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary"
        >
          Add zone
        </button>
      </form>

      <CarrierRatesPreview />
    </div>
  );
}

function CarrierRatesPreview() {
  const [rates, setRates] = useState<
    { id: string; label: string; amountCents: number; provider: string }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="admin-card max-w-xl space-y-4 p-6">
      <h2 className="font-semibold">Carrier rates (Shippo)</h2>
      <p className="text-sm text-zinc-500">
        Live USPS / UPS / DHL quotes when SHIPPO_API_KEY is set. Shown at checkout alongside flat zones.
      </p>
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            const r = await api.previewShippingRates({
              country: fd.get("country"),
              city: fd.get("city"),
              postal: fd.get("postal"),
              weightGrams: (parseFloat(String(fd.get("weightKg") ?? "0.5")) || 0.5) * 1000,
            });
            setRates(r.rates as typeof rates);
            setMsg(r.configured ? null : "Shippo not configured — flat zones only");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <input name="country" defaultValue="US" placeholder="Country" className="ugclab-input" />
        <input name="city" placeholder="City" className="ugclab-input" />
        <input name="postal" placeholder="Postal" className="ugclab-input" />
        <input name="weightKg" type="number" step="0.1" defaultValue={0.5} placeholder="Weight kg" className="ugclab-input sm:col-span-2" />
        <button type="submit" className="ugclab-btn-primary text-sm">
          Get rates
        </button>
      </form>
      {msg ? <p className="text-sm text-amber-700">{msg}</p> : null}
      <ul className="divide-y text-sm">
        {rates.map((r) => (
          <li key={r.id} className="flex justify-between py-2">
            <span>
              {r.label} <span className="text-zinc-400">({r.provider})</span>
            </span>
            <span className="font-medium">{formatMoney(r.amountCents, "USD")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
