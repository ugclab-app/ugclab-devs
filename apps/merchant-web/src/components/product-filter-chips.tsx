import { Link, useSearchParams } from "react-router-dom";

const CHIPS: { label: string; params: Record<string, string> }[] = [
  { label: "All", params: {} },
  { label: "Active", params: { status: "ACTIVE" } },
  { label: "Draft", params: { status: "DRAFT" } },
  { label: "Digital", params: { type: "DIGITAL" } },
  { label: "Physical", params: { type: "PHYSICAL" } },
  { label: "Low stock", params: { lowStock: "1" } },
];

export function ProductFilterChips() {
  const [params] = useSearchParams();

  function isActive(chip: (typeof CHIPS)[0]) {
    const keys = Object.keys(chip.params);
    if (keys.length === 0) {
      return (
        !params.get("status") &&
        !params.get("type") &&
        params.get("lowStock") !== "1"
      );
    }
    return keys.every((k) => params.get(k) === chip.params[k]);
  }

  function href(chip: (typeof CHIPS)[0]) {
    const next = new URLSearchParams(params);
    next.delete("status");
    next.delete("type");
    next.delete("lowStock");
    for (const [k, v] of Object.entries(chip.params)) next.set(k, v);
    const q = next.toString();
    return `/products${q ? `?${q}` : ""}`;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {CHIPS.map((chip) => (
        <Link
          key={chip.label}
          to={href(chip)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            isActive(chip)
              ? "bg-violet-600 text-white shadow-sm"
              : "border border-zinc-200 bg-white text-zinc-600 hover:border-violet-200 hover:text-violet-700"
          }`}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
