import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function SavedFiltersBar({ scope }: { scope: "ORDERS" | "PRODUCTS" | "CUSTOMERS" }) {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["saved-filters", scope],
    queryFn: () => api.savedFilters(scope),
  });
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => {
      const query: Record<string, unknown> = {};
      params.forEach((v, k) => {
        query[k] = v;
      });
      return api.createSavedFilter({ scope, name: name.trim(), query });
    },
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["saved-filters", scope] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteSavedFilter(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["saved-filters", scope] }),
  });

  const filters = data?.filters ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {filters.map((f) => (
        <span key={f.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1">
          <button
            type="button"
            className="font-medium text-zinc-800 hover:text-violet-700"
            onClick={() => {
              const next = new URLSearchParams();
              for (const [k, v] of Object.entries(f.query ?? {})) {
                if (v != null && v !== "") next.set(k, String(v));
              }
              setParams(next);
            }}
          >
            {f.name}
          </button>
          <button
            type="button"
            className="text-zinc-400 hover:text-red-600"
            aria-label={`Delete ${f.name}`}
            onClick={() => remove.mutate(f.id)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="ugclab-input w-36 py-1 text-sm"
        placeholder="Save view as…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        className="text-violet-700 hover:underline disabled:opacity-40"
        disabled={!name.trim() || create.isPending}
        onClick={() => create.mutate()}
      >
        Save filter
      </button>
    </div>
  );
}
