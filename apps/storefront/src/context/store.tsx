import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CheckoutExtras, StoreContextDto } from "@/api/client";

export const DEFAULT_CHECKOUT_EXTRAS: CheckoutExtras = {
  tipsEnabled: false,
  tipPresets: [],
  customFields: [],
  blockedCountries: [],
  turnstileSiteKey: null,
};

export type StoreContextValue = StoreContextDto & { checkoutExtras: CheckoutExtras };

const StoreCtx = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  value,
  children,
}: {
  value: StoreContextDto;
  children: ReactNode;
}) {
  const resolved = useMemo<StoreContextValue>(
    () => ({
      ...value,
      checkoutExtras: {
        ...DEFAULT_CHECKOUT_EXTRAS,
        ...(value.checkoutExtras ?? {}),
      },
    }),
    [value]
  );
  return <StoreCtx.Provider value={resolved}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useOptionalStore() {
  return useContext(StoreCtx);
}
