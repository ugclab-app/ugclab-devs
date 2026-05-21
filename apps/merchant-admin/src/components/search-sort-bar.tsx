"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

type SortOption = { value: string; label: string };

export function SearchSortBar({
  basePath,
  sortOptions,
  placeholder = "Search…",
}: {
  basePath: string;
  sortOptions: SortOption[];
  placeholder?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? sortOptions[0]?.value ?? "";

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") params.delete(key);
        else params.set(key, val);
      }
      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`);
      });
    },
    [basePath, router, searchParams]
  );

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${pending ? "opacity-70" : ""}`}
    >
      <input
        type="search"
        defaultValue={q}
        placeholder={placeholder}
        className="ugclab-input max-w-md"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            update({ q: (e.target as HTMLInputElement).value || null });
          }
        }}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v !== q) update({ q: v || null });
        }}
      />
      <select
        value={sort}
        onChange={(e) => update({ sort: e.target.value })}
        className="ugclab-select w-full sm:w-48"
        aria-label="Sort"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
