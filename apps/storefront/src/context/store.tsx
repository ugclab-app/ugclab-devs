import { createContext, useContext, type ReactNode } from "react";
import type { StoreContextDto } from "@/api/client";

const StoreCtx = createContext<StoreContextDto | null>(null);

export function StoreProvider({
  value,
  children,
}: {
  value: StoreContextDto;
  children: ReactNode;
}) {
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
