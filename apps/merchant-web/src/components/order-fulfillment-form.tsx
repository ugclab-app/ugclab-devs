import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

export function OrderFulfillmentForm({
  orderId,
  trackingNumber: initialTracking,
  status,
}: {
  orderId: string;
  trackingNumber: string | null;
  status: string;
}) {
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  async function save(markFulfilled: boolean) {
    setPending(true);
    try {
      await api.updateOrderFulfillment(orderId, {
        trackingNumber: tracking,
        markFulfilled,
        notifyCustomer,
      });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setAlert({
        ok: true,
        message: markFulfilled ? "Marked fulfilled" : "Tracking saved",
      });
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
    <section className="admin-card p-6 space-y-4">
      <h2 className="font-semibold text-zinc-900">Shipping</h2>
      <FormAlert ok={alert.ok} message={alert.message} />
      <label className="block text-sm">
        <span className="font-medium text-zinc-700">Tracking number</span>
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="1Z999AA10123456784"
          className="ugclab-input mt-1.5 font-mono"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={notifyCustomer}
          onChange={(e) => setNotifyCustomer(e.target.checked)}
        />
        Email customer when tracking is saved
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => save(false)}
          className="ugclab-btn border border-zinc-200 bg-white text-sm"
        >
          Save tracking
        </button>
        {status !== "FULFILLED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => save(true)}
            className="ugclab-btn ugclab-btn-primary text-sm"
          >
            Save & mark fulfilled
          </button>
        ) : null}
        {tracking.trim() ? (
          <button
            type="button"
            disabled={pending}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            onClick={async () => {
              setPending(true);
              try {
                await api.resendShippingEmail(orderId);
                setAlert({ ok: true, message: "Shipping email sent" });
              } catch (e) {
                setAlert({
                  ok: false,
                  message: e instanceof Error ? e.message : "Failed",
                });
              } finally {
                setPending(false);
              }
            }}
          >
            Resend shipping email
          </button>
        ) : null}
      </div>
    </section>
  );
}
