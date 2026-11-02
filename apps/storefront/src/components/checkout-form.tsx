import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@ugclab/ui";
import { ApiError, storeApi } from "@/api/client";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { ExpressPayHint } from "@/components/express-pay-hint";
import { StoreTrustStrip } from "@/components/store-trust-strip";
import { getStoredAttribution } from "@/hooks/use-live-presence";

const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "PL", label: "Poland" },
];

type TipChoice = { kind: "none" } | { kind: "percent"; value: number } | { kind: "custom" };

export function CheckoutForm({
  subtotalAmount,
  showPolicies,
  privacyHref,
  refundHref,
  productIds,
}: {
  subtotalAmount: number;
  showPolicies?: boolean;
  privacyHref?: string;
  refundHref?: string;
  productIds?: string[];
}) {
  const { tenant, locale } = useStoreParams();
  const {
    currency,
    settings,
    checkoutFooterText,
    payments,
    theme,
    addons,
    giftWrap: giftWrapOffer,
    baseCurrency,
    checkoutExtras,
  } = useStore();
  const blockedCountries = checkoutExtras.blockedCountries.map((c) => c.toUpperCase());
  const turnstileSiteKey = checkoutExtras.turnstileSiteKey ?? null;
  const countryOptions = COUNTRY_OPTIONS.filter((c) => !blockedCountries.includes(c.code));
  const stripeLive = payments?.stripeLive ?? false;
  const finikLive = payments?.finikLive ?? false;
  const gopayLive = payments?.gopayLive ?? false;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const taxRateBps = settings?.taxRateBps ?? 0;
  const stripeTaxEnabled = theme.stripeTaxEnabled === true;

  const [discountCode, setDiscountCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState<number | null>(null);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardPreview, setGiftCardPreview] = useState<number | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [tip, setTip] = useState<TipChoice>({ kind: "none" });
  const [tipCustom, setTipCustom] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [shippingRates, setShippingRates] = useState<
    { id: string; label: string; amountCents: number }[]
  >([]);
  const [selectedRateId, setSelectedRateId] = useState<string>("flat");
  const [error, setError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"SHIP" | "PICKUP">(
    "SHIP"
  );
  const [pickupWarehouseId, setPickupWarehouseId] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const { data: accountSession } = useQuery({
    queryKey: ["account-session", tenant],
    queryFn: () => storeApi.accountSession(tenant),
  });
  const { data: loyaltyData } = useQuery({
    queryKey: ["loyalty", tenant],
    queryFn: () => storeApi.loyalty(tenant),
    enabled: !!accountSession?.customer,
  });
  const { data: storeCreditData } = useQuery({
    queryKey: ["store-credit", tenant],
    queryFn: () => storeApi.storeCredit(tenant),
    enabled: !!accountSession?.customer,
  });
  const storeCreditBalance = storeCreditData?.balanceCents ?? 0;
  const { data: savedAddresses } = useQuery({
    queryKey: ["account-addresses", tenant],
    queryFn: () => storeApi.addresses(tenant),
    enabled: !!accountSession?.customer,
  });
  const [addressKey, setAddressKey] = useState("new");
  const saved = savedAddresses?.addresses ?? [];
  const chosen = saved.find((a) => a.id === addressKey);
  const chosenCountryBlocked =
    !!chosen?.country && blockedCountries.includes(chosen.country.toUpperCase());

  const { data: pickupData } = useQuery({
    queryKey: ["pickup-locations", tenant, productIds?.join(",") ?? ""],
    queryFn: () => storeApi.pickupLocations(tenant, productIds),
    enabled: fulfillmentMethod === "PICKUP",
  });

  const pickupLocations = pickupData?.locations ?? [];

  useEffect(() => {
    if (fulfillmentMethod === "PICKUP" && pickupLocations.length && !pickupWarehouseId) {
      setPickupWarehouseId(pickupLocations[0]!.id);
    }
  }, [fulfillmentMethod, pickupLocations, pickupWarehouseId]);

  async function previewGiftCard() {
    if (!giftCardCode.trim()) return;
    try {
      const estTotal = Math.max(0, subtotalAmount - (discountPreview ?? 0));
      const data = await storeApi.validateGiftCard(tenant, giftCardCode, estTotal);
      setGiftCardPreview(data.giftCardAmount);
      setError(null);
    } catch (e) {
      setGiftCardPreview(null);
      setError(e instanceof Error ? e.message : "Invalid gift card");
    }
  }

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
      if (
        (result.mode === "stripe" ||
          result.mode === "gopay" ||
          result.mode === "finik") &&
        result.checkoutUrl
      ) {
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
      // Turnstile tokens are single-use: always ask for a fresh challenge after a
      // failed attempt, and especially when the server flagged the captcha itself.
      if (turnstileSiteKey || (e instanceof ApiError && e.captcha)) {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const attr = getStoredAttribution();
        const body: Record<string, unknown> = {
          email: fd.get("email"),
          name: fd.get("name"),
          acceptPolicies: fd.get("acceptPolicies") === "on",
          createAccount: createAccount,
          fulfillmentMethod,
          utmSource: attr.utmSource,
          utmMedium: attr.utmMedium,
          utmCampaign: attr.utmCampaign,
          landingPath: attr.landingPath,
          liveSessionId: attr.sessionId,
          giftWrap,
          giftMessage: giftWrap ? giftMessage : "",
        };
        if (fulfillmentMethod === "PICKUP") {
          if (!pickupWarehouseId) {
            setError("Select a pickup location");
            return;
          }
          body.pickupWarehouseId = pickupWarehouseId;
          body.shippingName = fd.get("name");
          body.country = "US";
        } else {
          body.shippingName = fd.get("shippingName");
          body.shippingAddress1 = fd.get("shippingAddress1");
          body.shippingAddress2 = fd.get("shippingAddress2");
          body.shippingCity = fd.get("shippingCity");
          body.shippingRegion = fd.get("shippingRegion");
          body.shippingPostal = fd.get("shippingPostal");
          body.shippingPhone = fd.get("shippingPhone") || fd.get("phone");
          body.country = fd.get("country");
          const rate = shippingRates.find((r) => r.id === selectedRateId);
          if (rate) body.shippingAmountCents = rate.amountCents;
        }
        if (discountCode) body.discountCode = discountCode;
        if (giftCardCode) body.giftCardCode = giftCardCode;
        if (useLoyalty) body.useLoyaltyPoints = true;
        if (useStoreCredit && storeCreditBalance > 0) body.useStoreCredit = true;
        if (createAccount) body.password = fd.get("password");
        if (checkoutExtras.tipsEnabled) {
          if (tip.kind === "percent") {
            body.tipPercent = tip.value;
          } else if (tip.kind === "custom") {
            const amount = Number.parseFloat(tipCustom.replace(",", "."));
            if (Number.isFinite(amount) && amount > 0) {
              body.tipCents = Math.round(amount * 100);
            }
          }
        }
        if (checkoutExtras.customFields.length > 0) {
          const values: Record<string, string> = {};
          for (const field of checkoutExtras.customFields) {
            const v = (customFieldValues[field.key] ?? "").trim();
            if (field.required && !v) {
              setError(`${field.label} is required`);
              return;
            }
            if (v) values[field.key] = v;
          }
          body.customFields = values;
        }
        if (turnstileSiteKey) {
          if (!turnstileToken) {
            setError("Please complete the security check");
            return;
          }
          body.turnstileToken = turnstileToken;
        }
        place.mutate(body);
      }}
      className="mt-8 space-y-5"
    >
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <fieldset className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
        <legend className="px-1 text-sm font-semibold text-zinc-800">Contact</legend>
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
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-zinc-100 p-4">
        <legend className="px-1 text-sm font-semibold text-zinc-800">
          Fulfillment
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="fulfillmentMethod"
            checked={fulfillmentMethod === "SHIP"}
            onChange={() => setFulfillmentMethod("SHIP")}
          />
          Ship to me
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="fulfillmentMethod"
            checked={fulfillmentMethod === "PICKUP"}
            onChange={() => setFulfillmentMethod("PICKUP")}
          />
          Pickup in store
        </label>
      </fieldset>

      {fulfillmentMethod === "PICKUP" ? (
        <fieldset className="space-y-3 rounded-xl border border-zinc-100 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-800">
            Pickup location
          </legend>
          {pickupLocations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No pickup locations available. Choose shipping instead.
            </p>
          ) : (
            pickupLocations.map((loc) => (
              <label key={loc.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="pickupWarehouse"
                  checked={pickupWarehouseId === loc.id}
                  onChange={() => setPickupWarehouseId(loc.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{loc.name}</span>
                  {(loc.address1 || loc.city) && (
                    <span className="mt-0.5 block text-zinc-500">
                      {[loc.address1, loc.city, loc.postal, loc.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                  {loc.pickupInstructions ? (
                    <span className="mt-0.5 block text-xs text-zinc-400">
                      {loc.pickupInstructions}
                    </span>
                  ) : null}
                  {loc.inStock === false ? (
                    <span className="mt-0.5 block text-xs text-amber-700">
                      Some items may be out of stock here
                    </span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </fieldset>
      ) : (
        <>
          <fieldset key={addressKey} className="space-y-4 rounded-xl border border-zinc-100 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-800">
              Shipping
            </legend>
            {saved.length > 0 ? (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Saved address</span>
                <select
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                  value={addressKey}
                  onChange={(e) => setAddressKey(e.target.value)}
                >
                  <option value="new">New address</option>
                  {saved.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label || a.name} · {a.city}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Input
              name="shippingName"
              label="Shipping name"
              type="text"
              defaultValue={chosen?.name ?? ""}
            />
            <Input
              name="shippingAddress1"
              label="Address line 1"
              type="text"
              defaultValue={chosen?.address1 ?? ""}
            />
            <Input
              name="shippingAddress2"
              label="Address line 2 (optional)"
              type="text"
              defaultValue={chosen?.address2 ?? ""}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="shippingCity"
                label="City"
                type="text"
                required
                defaultValue={chosen?.city ?? ""}
              />
              <Input
                name="shippingRegion"
                label="State / region"
                type="text"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="shippingPostal"
                label="Postal code"
                type="text"
                required
                defaultValue={chosen?.postal ?? ""}
              />
              <Input
                name="shippingPhone"
                label="Phone"
                type="tel"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Country
              </label>
              <select
                name="country"
                defaultValue={chosen?.country ?? "US"}
                className="ugclab-select mt-1.5 w-full"
                onChange={async (e) => {
                  const country = e.target.value;
                  const city = (
                    document.querySelector(
                      '[name="shippingCity"]'
                    ) as HTMLInputElement
                  )?.value;
                  const postal = (
                    document.querySelector(
                      '[name="shippingPostal"]'
                    ) as HTMLInputElement
                  )?.value;
                  try {
                    const data = await storeApi.shippingRates(tenant, {
                      country,
                      city,
                      postal,
                    });
                    setShippingRates(data.rates);
                    setSelectedRateId(data.rates[0]?.id ?? "flat");
                  } catch {
                    setShippingRates([]);
                  }
                }}
              >
                {chosen?.country &&
                !chosenCountryBlocked &&
                !countryOptions.some((c) => c.code === chosen.country) ? (
                  <option value={chosen.country}>{chosen.country}</option>
                ) : null}
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              {chosenCountryBlocked ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  This store does not ship to {chosen!.country}
                </p>
              ) : null}
            </div>
          </fieldset>

          {shippingRates.length > 1 ? (
            <fieldset className="space-y-2 rounded-xl border border-zinc-100 p-4">
              <legend className="px-1 text-sm font-semibold text-zinc-800">
                Shipping method
              </legend>
              {shippingRates.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="shippingRate"
                    checked={selectedRateId === r.id}
                    onChange={() => setSelectedRateId(r.id)}
                  />
                  <span className="flex-1">{r.label}</span>
                  <span className="font-medium">
                    {(r.amountCents / 100).toFixed(2)} {currency}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </>
      )}

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

      <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
        <label className="block text-sm font-medium">Gift card</label>
        <div className="flex gap-2">
          <input
            value={giftCardCode}
            onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
            className="ugclab-input flex-1 font-mono uppercase"
            placeholder="GC-XXXX"
          />
          <button
            type="button"
            onClick={previewGiftCard}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Apply
          </button>
        </div>
        {giftCardPreview != null ? (
          <p className="text-sm text-emerald-700">
            Gift card: −{(giftCardPreview / 100).toFixed(2)} {currency}
          </p>
        ) : null}
      </div>

      {checkoutExtras.customFields.length > 0 ? (
        <fieldset className="space-y-4 rounded-xl border border-zinc-100 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-800">
            Additional information
          </legend>
          {checkoutExtras.customFields.map((field) => {
            const value = customFieldValues[field.key] ?? "";
            const onChange = (v: string) =>
              setCustomFieldValues((prev) => ({ ...prev, [field.key]: v }));
            if (field.type === "textarea") {
              return (
                <label key={field.key} className="block text-sm">
                  <span className="mb-1 block font-medium text-zinc-700">
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <textarea
                    name={`custom_${field.key}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={field.required}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
              );
            }
            return (
              <Input
                key={field.key}
                name={`custom_${field.key}`}
                label={field.required ? `${field.label} *` : field.label}
                type={field.type === "date" ? "date" : "text"}
                required={field.required}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            );
          })}
        </fieldset>
      ) : null}

      {checkoutExtras.tipsEnabled ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium">Add a tip</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTip({ kind: "none" })}
              className={`rounded-lg border px-3 py-2 text-sm ${
                tip.kind === "none"
                  ? "border-[var(--store-primary)] bg-violet-50"
                  : "border-zinc-200 bg-white"
              }`}
            >
              No tip
            </button>
            {checkoutExtras.tipPresets.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setTip({ kind: "percent", value: pct })}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  tip.kind === "percent" && tip.value === pct
                    ? "border-[var(--store-primary)] bg-violet-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                {pct}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTip({ kind: "custom" })}
              className={`rounded-lg border px-3 py-2 text-sm ${
                tip.kind === "custom"
                  ? "border-[var(--store-primary)] bg-violet-50"
                  : "border-zinc-200 bg-white"
              }`}
            >
              Custom
            </button>
          </div>
          {tip.kind === "percent" ? (
            <p className="text-xs text-zinc-500">
              Tip: {((subtotalAmount * tip.value) / 100 / 100).toFixed(2)} {currency}
            </p>
          ) : null}
          {tip.kind === "custom" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-600">Tip amount ({currency})</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={tipCustom}
                onChange={(e) => setTipCustom(e.target.value)}
                placeholder="0.00"
                className="ugclab-input w-40"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {storeCreditBalance > 0 ? (
        <label className="flex items-start gap-2 rounded-lg border border-zinc-200 p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={useStoreCredit}
            onChange={(e) => setUseStoreCredit(e.target.checked)}
          />
          <span>
            Use store credit ({(storeCreditBalance / 100).toFixed(2)}{" "}
            {storeCreditData?.currency || currency} available)
          </span>
        </label>
      ) : null}

      {loyaltyData?.enabled && (loyaltyData.points ?? 0) > 0 ? (
        <label className="flex items-start gap-2 rounded-lg border border-zinc-200 p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={useLoyalty}
            onChange={(e) => setUseLoyalty(e.target.checked)}
          />
          <span>
            Use loyalty points ({loyaltyData.points} pts
            {loyaltyData.redeemCentsPerPoint
              ? ` · ~${((loyaltyData.points * loyaltyData.redeemCentsPerPoint) / 100).toFixed(2)} ${currency}`
              : ""}
            )
          </span>
        </label>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={createAccount}
          onChange={(e) => setCreateAccount(e.target.checked)}
        />
        Create an account for faster checkout next time
      </label>
      {createAccount ? (
        <Input
          name="password"
          label="Password (min 8 characters)"
          type="password"
          minLength={8}
        />
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

      {fulfillmentMethod === "SHIP" && theme.shippingCarrierLabel ? (
        <p className="text-xs text-zinc-600">
          Shipping: <span className="font-medium">{theme.shippingCarrierLabel}</span>
        </p>
      ) : null}

      {stripeTaxEnabled ? (
        <p className="text-xs text-amber-800 rounded-lg bg-amber-50 px-3 py-2">
          Tax is calculated automatically by Stripe at checkout (Stripe Tax must be
          enabled on your Stripe account).
        </p>
      ) : taxRateBps > 0 ? (
        <p className="text-xs text-zinc-500">
          Tax rate {(taxRateBps / 100).toFixed(1)}% applied to order total.
        </p>
      ) : null}

      {addons?.includes("gift-wrap") && giftWrapOffer ? (
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={giftWrap}
              onChange={(e) => setGiftWrap(e.target.checked)}
            />
            <span>
              {giftWrapOffer.label} (+
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: baseCurrency || currency || "USD",
              }).format(giftWrapOffer.priceCents / 100)}
              )
            </span>
          </label>
          {giftWrap && giftWrapOffer.cardEnabled ? (
            <textarea
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="Gift card message"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          ) : null}
        </div>
      ) : null}

      <ExpressPayHint
        stripeLive={stripeLive}
        linkEnabled={theme.stripeLinkEnabled !== false}
      />
      <StoreTrustStrip />

      {turnstileSiteKey ? (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onToken={setTurnstileToken}
          className="flex justify-center"
        />
      ) : null}

      <button
        type="submit"
        className="store-btn-primary w-full disabled:opacity-50"
        disabled={place.isPending || (!!turnstileSiteKey && !turnstileToken)}
      >
        {place.isPending
          ? "Processing…"
          : theme.checkoutButtonText?.trim() ||
            (finikLive
              ? "Pay with Finik"
              : gopayLive
                ? "Pay with GoPay"
                : stripeLive
                  ? "Pay with card"
                  : "Complete order")}
      </button>
      {checkoutFooterText ? (
        <p className="text-center text-xs text-zinc-500">{checkoutFooterText}</p>
      ) : finikLive ? (
        <p className="text-center text-xs text-zinc-400">
          You will be redirected to Finik (QR pay via Kyrgyz bank apps).
        </p>
      ) : gopayLive ? (
        <p className="text-center text-xs text-zinc-400">
          You will be redirected to GoPay (MBank, MegaPay, and other KG apps).
        </p>
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
