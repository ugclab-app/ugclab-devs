import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "@/context/store";

const OPEN_PATHS = /^\/(pages\/|policies\/|blog)/;

export function StoreClosedGate({ children }: { children: ReactNode }) {
  const { theme, tenant } = useStore();
  const location = useLocation();

  if (!theme.storeClosed) return <>{children}</>;

  const path = location.pathname;
  if (OPEN_PATHS.test(path)) return <>{children}</>;

  const message =
    theme.storeClosedMessage?.trim() ||
    "We're getting ready to open. Check back soon!";

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
        Coming soon
      </p>
      <h1 className="mt-3 text-2xl font-bold text-zinc-900">{tenant.name}</h1>
      <p className="mt-4 text-zinc-600">{message}</p>
    </div>
  );
}
