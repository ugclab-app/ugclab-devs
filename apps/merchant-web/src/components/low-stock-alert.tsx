import { Link } from "react-router-dom";

export function LowStockAlert({
  count,
  threshold,
}: {
  count: number;
  threshold?: number;
}) {
  if (count <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
      <p>
        <span className="font-semibold">{count} product{count === 1 ? "" : "s"}</span>{" "}
        below stock threshold
        {threshold != null ? ` (${threshold})` : ""}.
      </p>
      <Link
        to="/products?lowStock=1"
        className="font-semibold text-red-800 underline"
      >
        Restock →
      </Link>
    </div>
  );
}
