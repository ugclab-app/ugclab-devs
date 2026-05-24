import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

export function OrderEditPanel({
  orderId,
  status,
  shipping,
}: {
  orderId: string;
  status: string;
  shipping: {
    shippingName?: string | null;
    shippingAddress1?: string | null;
    shippingAddress2?: string | null;
    shippingCity?: string | null;
    shippingPostal?: string | null;
    shippingCountry?: string | null;
  };
}) {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const editable = status === "PENDING" || status === "PAID";

  const { data: productsData } = useQuery({
    queryKey: ["products", "edit-order"],
    queryFn: () => api.products(new URLSearchParams({ status: "ACTIVE", limit: "100" })),
    enabled: editable,
  });

  if (!editable) {
    return (
      <section className="admin-card p-6 text-sm text-zinc-500">
        Order can no longer be edited (fulfilled or cancelled).
      </section>
    );
  }

  const products = (productsData as { products?: { id: string; title: string }[] })?.products ?? [];

  return (
    <section className="admin-card p-6 space-y-4">
      <h2 className="font-semibold text-zinc-900">Edit order</h2>
      <FormAlert ok={alert.ok} message={alert.message} />

      <form
        className="space-y-2 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const fd = new FormData(e.currentTarget);
          try {
            await api.editOrder(orderId, {
              shippingName: fd.get("shippingName"),
              shippingAddress1: fd.get("shippingAddress1"),
              shippingAddress2: fd.get("shippingAddress2"),
              shippingCity: fd.get("shippingCity"),
              shippingPostal: fd.get("shippingPostal"),
              shippingCountry: fd.get("shippingCountry"),
            });
            setAlert({ ok: true, message: "Shipping updated" });
            await qc.invalidateQueries({ queryKey: ["order", orderId] });
          } catch (err) {
            setAlert({
              ok: false,
              message: err instanceof Error ? err.message : "Failed",
            });
          } finally {
            setPending(false);
          }
        }}
      >
        <p className="text-xs font-medium text-zinc-500 uppercase">Shipping address</p>
        <input name="shippingName" defaultValue={shipping.shippingName ?? ""} placeholder="Name" className="ugclab-input w-full" />
        <input name="shippingAddress1" defaultValue={shipping.shippingAddress1 ?? ""} placeholder="Address" className="ugclab-input w-full" />
        <input name="shippingAddress2" defaultValue={shipping.shippingAddress2 ?? ""} placeholder="Apt" className="ugclab-input w-full" />
        <div className="grid grid-cols-2 gap-2">
          <input name="shippingCity" defaultValue={shipping.shippingCity ?? ""} placeholder="City" className="ugclab-input w-full" />
          <input name="shippingPostal" defaultValue={shipping.shippingPostal ?? ""} placeholder="Postal" className="ugclab-input w-full" />
        </div>
        <input name="shippingCountry" defaultValue={shipping.shippingCountry ?? "US"} placeholder="Country (US)" className="ugclab-input w-full" />
        <button type="submit" disabled={pending} className="ugclab-btn-primary text-sm">
          Save address
        </button>
      </form>

      <form
        className="space-y-2 border-t border-zinc-100 pt-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const fd = new FormData(e.currentTarget);
          try {
            await api.editOrder(orderId, {
              addLine: {
                productId: String(fd.get("productId")),
                quantity: parseInt(String(fd.get("quantity") ?? "1"), 10) || 1,
              },
            });
            setAlert({ ok: true, message: "Line added" });
            (e.target as HTMLFormElement).reset();
            await qc.invalidateQueries({ queryKey: ["order", orderId] });
          } catch (err) {
            setAlert({
              ok: false,
              message: err instanceof Error ? err.message : "Failed",
            });
          } finally {
            setPending(false);
          }
        }}
      >
        <p className="text-xs font-medium text-zinc-500 uppercase">Add line item</p>
        <select name="productId" required className="ugclab-select w-full">
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min={1} defaultValue={1} className="ugclab-input w-full" />
        <button type="submit" disabled={pending} className="ugclab-btn border border-zinc-200 bg-white text-sm">
          Add item
        </button>
      </form>
    </section>
  );
}

export function OrderTagsEditor({
  orderId,
  tags: initial,
}: {
  orderId: string;
  tags: string[];
}) {
  const qc = useQueryClient();
  const [tags, setTags] = useState(initial.join(", "));

  return (
    <section className="admin-card p-6">
      <h2 className="font-semibold text-zinc-900">Tags</h2>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="vip, wholesale, urgent"
        className="ugclab-input mt-3 w-full text-sm"
      />
      <button
        type="button"
        className="ugclab-btn-primary mt-2 text-sm"
        onClick={async () => {
          const list = tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          await api.setOrderTags(orderId, list);
          await qc.invalidateQueries({ queryKey: ["order", orderId] });
          await qc.invalidateQueries({ queryKey: ["orders"] });
        }}
      >
        Save tags
      </button>
    </section>
  );
}
