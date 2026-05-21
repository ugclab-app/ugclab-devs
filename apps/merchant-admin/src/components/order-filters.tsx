"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const filters = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FULFILLED", label: "Fulfilled" },
] as const;

export function OrderFilters() {
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => {
        const active = current === f.value;
        const href = f.value ? `/orders?status=${f.value}` : "/orders";
        return (
          <Link
            key={f.label}
            href={href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}
