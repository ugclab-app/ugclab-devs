import { useSearchParams } from "react-router-dom";

export function OrderDateFilter() {
  const [params, setParams] = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function apply(field: "from" | "to", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(field, value);
    else next.delete(field);
    setParams(next);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-500">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => apply("from", e.target.value)}
          className="ugclab-input"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-500">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => apply("to", e.target.value)}
          className="ugclab-input"
        />
      </label>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete("from");
            next.delete("to");
            setParams(next);
          }}
          className="text-sm text-zinc-500 hover:text-violet-600"
        >
          Clear dates
        </button>
      )}
    </div>
  );
}
