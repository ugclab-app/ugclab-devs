import { Link } from "react-router-dom";

export function PlanLimitsBanner({
  planName,
  productCount,
  productLimit,
  staffCount,
}: {
  planName: string;
  productCount: number;
  productLimit: number | null;
  staffCount: number;
}) {
  const atLimit = productLimit != null && productCount >= productLimit;
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        atLimit
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      <span className="font-semibold text-zinc-900">{planName}</span>
      <span className="mx-2 text-zinc-300">·</span>
      Products:{" "}
      <strong>
        {productCount}
        {productLimit != null ? ` / ${productLimit}` : ""}
      </strong>
      <span className="mx-2 text-zinc-300">·</span>
      Staff: <strong>{staffCount}</strong>
      {atLimit ? (
        <>
          {" "}
          —{" "}
          <Link to="/settings?tab=billing" className="font-semibold text-violet-600 underline">
            Upgrade plan
          </Link>
        </>
      ) : null}
    </div>
  );
}
