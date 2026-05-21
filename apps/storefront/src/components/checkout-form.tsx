import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@ugclab/ui";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { ExpressPayHint } from "@/components/express-pay-hint";
import { StoreTrustStrip } from "@/components/store-trust-strip";

export function CheckoutForm({
  subtotalAmount,
  showPolicies,
  privacyHref,
  refundHref,
}: {
  subtotalAmount: number;
  showPolicies?: boolean;
  privacyHref?: string;
  refundHref?: string;
}) {
  const { tenant, locale } = useStoreParams();
  const { currency, settings, checkoutFooterText, payments, theme } = useStore();
  const stripeLive = payments?.stripeLive ?? false;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const taxRateBps = settings?.taxRateBps ?? 0;

  const [discountCode, setDiscountCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);

  async function previewDiscount() {
    if (!discountCode.trim()) return;
    try {
      const data = await storeApi.validateDiscount(tenant, discountCode, subtotalAmount);
      setDiscountPreview(data.discountAmount);
      setError(null);
    } catch (e) {
      setDiscountPreview(null);
      setError(e instanceof Error ? e.message : "Invalid code");
    }
  }

  const place = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      storeApi.placeOrder(tenant, { ...body, locale }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["store-context"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      if (result.mode === "stripe" && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      const nav = { locale, tenant };
      navigate(
        storeHref(`/orders/${result.orderId}`, nav) +
          `&token=${(result as { accessToken: string }).accessToken}`
      );
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Checkout failed");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const body: Record<string, unknown> = {
          email: fd.get("email"),
          name: fd.get("name"),
          shippingName: fd.get("shippingName"),
          shippingAddress1: fd.get("shippingAddress1"),
          shippingAddress2: fd.get("shippingAddress2"),
          shippingCity: fd.get("shippingCity"),
          shippingPostal: fd.get("shippingPostal"),
          country: fd.get("country"),
          acceptPolicies: fd.get("acceptPolicies") === "on",
          createAccount: createAccount,
        };
        if (discountCode) body.discountCode = discountCode;
        if (createAccount) body.password = fd.get("password");
        place.mutate(body);
      }}
      className="mt-8 space-y-5"
    >
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Input name="email" label="Email" type="email" required />
      <Input
        name="name"
        label="Full name"
        type="text"
        required={theme.checkoutRequireName}
      />
      {theme.checkoutRequirePhone ? (
        <Input name="phone" label="Phone" type="tel" required />
      ) : null}
      <Input name="shippingName" label="Shipping name" type="text" />
      <Input name="shippingAddress1" label="Address line 1" type="text" />
      <Input name="shippingAddress2" label="Address line 2 (optional)" type="text" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="shippingCity" label="City" type="text" />
        <Input name="shippingPostal" label="Postal code" type="text" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Country (shipping)</label>
        <select name="country" defaultValue="US" className="ugclab-select mt-1.5 w-full">
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="NL">Netherlands</option>
          <option value="PL">Poland</option>
        </select>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
        <label className="block text-sm font-medium">Discount code</label>
        <div className="flex gap-2">
          <input
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            className="ugclab-input flex-1 font-mono uppercase"
            placeholder="SAVE10"
          />
          <button
            type="button"
            onClick={previewDiscount}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Apply
          </button>
        </div>
        {discountPreview != null ? (
          <p className="text-sm text-emerald-700">
            Discount: −{(discountPreview / 100).toFixed(2)} {currency}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={createAccount}
          onChange={(e) => setCreateAccount(e.target.checked)}
        />
        Create an account for faster checkout next time
      </label>
      {createAccount ? (
        <Input name="password" label="Password (min 8 characters)" type="password" minLength={8} />
      ) : null}

      {showPolicies ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptPolicies" required className="mt-1" />
          <span>
            I agree to the{" "}
            {privacyHref ? (
              <a
                href={privacyHref}
                className="text-violet-600 underline"
                target={privacyHref.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                privacy policy
              </a>
            ) : null}
            {privacyHref && refundHref ? " and " : null}
            {refundHref ? (
              <a
                href={refundHref}
                className="text-violet-600 underline"
                target={refundHref.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                refund policy
              </a>
            ) : null}
          </span>
        </label>
      ) : null}

      {theme.shippingCarrierLabel ? (
        <p className="text-xs text-zinc-600">
          Shipping: <span className="font-medium">{theme.shippingCarrierLabel}</span>
        </p>
      ) : null}

      {theme.stripeTaxEnabled ? (
        <p className="text-xs text-amber-800 rounded-lg bg-amber-50 px-3 py-2">
          Tax is calculated automatically by Stripe at checkout (Stripe Tax must be enabled on your
          Stripe account).
        </p>
      ) : taxRateBps > 0 ? (
        <p className="text-xs text-zinc-500">
          Tax rate {(taxRateBps / 100).toFixed(1)}% applied to order total.
        </p>
      ) : null}

      <ExpressPayHint
        stripeLive={stripeLive}
        linkEnabled={theme.stripeLinkEnabled !== false}
      />
      <StoreTrustStrip />

      <button
        type="submit"
        className="store-btn-primary w-full disabled:opacity-50"
        disabled={place.isPending}
      >
        {place.isPending
          ? "Processing…"
          : theme.checkoutButtonText?.trim() ||
            (stripeLive ? "Pay with card" : "Complete order")}
      </button>
      {checkoutFooterText ? (
        <p className="text-center text-xs text-zinc-500">{checkoutFooterText}</p>
      ) : stripeLive ? (
        <p className="text-center text-xs text-zinc-400">
          Secure payment via Stripe. You will be redirected to complete your purchase.
        </p>
      ) : (
        <p className="text-center text-xs text-zinc-400">
          Demo checkout — order marked as paid when Stripe is not connected.
        </p>
      )}
    </form>
  );
}
