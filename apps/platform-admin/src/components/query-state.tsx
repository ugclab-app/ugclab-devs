import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

type Props<T> = {
  query: Pick<UseQueryResult<T>, "isLoading" | "isError" | "error" | "data">;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
};

export function QueryState<T>({
  query,
  loadingLabel = "Loading…",
  children,
}: Props<T>) {
  if (query.isLoading) {
    return <p className="text-slate-500">{loadingLabel}</p>;
  }
  if (query.isError) {
    const msg = query.error instanceof Error ? query.error.message : "Request failed";
    return (
      <div className="platform-card border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="font-semibold">Could not load data</p>
        <p className="mt-2">{msg}</p>
        <p className="mt-3 text-red-700">
          If you see 404, restart the API: stop the process on port 4000, then run{" "}
          <code className="rounded bg-red-100 px-1">npm run dev:platform-admin</code>
        </p>
      </div>
    );
  }
  if (query.data == null) {
    return <p className="text-slate-500">No data</p>;
  }
  return <>{children(query.data)}</>;
}
