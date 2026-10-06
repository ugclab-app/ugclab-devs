import { useState } from "react";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

export type SellingOptionsInitial = {
  preorderEnabled?: boolean;
  preorderShipAt?: string | null;
  tryBeforeYouBuyEnabled?: boolean;
  tryBeforeYouBuyDays?: number | null;
  subscriptionEnabled?: boolean;
  subscriptionInterval?: string | null;
  sellAsGiftCard?: boolean;
};

export function ProductSellingOptions({
  productId,
  initial,
}: {
  productId: string;
  initial: SellingOptionsInitial;
}) {
  const [preorderEnabled, setPreorderEnabled] = useState(!!initial.preorderEnabled);
  const [preorderShipAt, setPreorderShipAt] = useState(
    initial.preorderShipAt
      ? new Date(initial.preorderShipAt).toISOString().slice(0, 16)
      : ""
  );
  const [tbybEnabled, setTbybEnabled] = useState(!!initial.tryBeforeYouBuyEnabled);
  const [tbybDays, setTbybDays] = useState(
    String(initial.tryBeforeYouBuyDays ?? 30)
  );
  const [subEnabled, setSubEnabled] = useState(!!initial.subscriptionEnabled);
  const [subInterval, setSubInterval] = useState(
    initial.subscriptionInterval ?? "month"
  );
  const [sellAsGiftCard, setSellAsGiftCard] = useState(!!initial.sellAsGiftCard);
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  async function save() {
    setPending(true);
    setAlert({});
    try {
      await api.patchProductSellingOptions(productId, {
        preorderEnabled,
        preorderShipAt: preorderEnabled && preorderShipAt ? preorderShipAt : null,
        tryBeforeYouBuyEnabled: tbybEnabled,
        tryBeforeYouBuyDays: tbybEnabled ? Number(tbybDays) || 30 : null,
        subscriptionEnabled: subEnabled,
        subscriptionInterval: subEnabled ? subInterval : null,
      });
      await api.setSellAsGiftCard(productId, sellAsGiftCard);
      setAlert({ ok: true, message: "Selling options saved" });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-card mx-auto max-w-6xl space-y-4 p-5">
      <h2 className="font-semibold">Selling options</h2>
      <FormAlert ok={alert.ok} message={alert.message} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preorderEnabled}
              onChange={(e) => setPreorderEnabled(e.target.checked)}
            />
            Pre-order
          </span>
          {preorderEnabled ? (
            <input
              type="datetime-local"
              value={preorderShipAt}
              onChange={(e) => setPreorderShipAt(e.target.value)}
              className="ugclab-input"
            />
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tbybEnabled}
              onChange={(e) => setTbybEnabled(e.target.checked)}
            />
            Try before you buy
          </span>
          {tbybEnabled ? (
            <input
              type="number"
              min={1}
              max={365}
              value={tbybDays}
              onChange={(e) => setTbybDays(e.target.value)}
              className="ugclab-input"
              placeholder="Days"
            />
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={subEnabled}
              onChange={(e) => setSubEnabled(e.target.checked)}
            />
            Subscription
          </span>
          {subEnabled ? (
            <select
              value={subInterval}
              onChange={(e) => setSubInterval(e.target.value)}
              className="ugclab-select"
            >
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sellAsGiftCard}
              onChange={(e) => setSellAsGiftCard(e.target.checked)}
            />
            Sell as gift card
          </span>
          <span className="text-xs text-zinc-500">
            Issues a gift card to the customer on purchase.
          </span>
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void save()}
        className="ugclab-btn ugclab-btn-primary text-sm"
      >
        {pending ? "Saving…" : "Save selling options"}
      </button>
    </div>
  );
}
