import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type BlockRow = {
  id: string;
  label: string;
  description: string;
  category: string;
  published: boolean;
  sortOrder: number;
  minPlan: string | null;
  deprecated: boolean;
};

export default function BlocksPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const query = useQuery({ queryKey: ["blocks"], queryFn: () => api.blocks() });

  return (
    <div className="space-y-6">
      <div className="platform-page-header">
        <div>
          <h1>Block catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Controls which sections merchants can add in the site builder.
          </p>
        </div>
        <button
          type="button"
          className="ugclab-btn border border-slate-200 bg-white text-sm"
          onClick={() => api.syncBlocks().then(() => qc.invalidateQueries({ queryKey: ["blocks"] }))}
        >
          Sync from codebase
        </button>
      </div>

      <QueryState query={query}>
        {(data) => {
          const blocks = data.blocks as BlockRow[];
          return (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-4 py-3">Block</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {blocks.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(b.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(b.id);
                            else next.delete(b.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.label}</div>
                        <div className="font-mono text-xs text-slate-500">{b.id}</div>
                      </td>
                      <td className="px-4 py-3">{b.category}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={b.published}
                          onChange={(e) =>
                            api
                              .updateBlock(b.id, { published: e.target.checked })
                              .then(() => qc.invalidateQueries({ queryKey: ["blocks"] }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected.size > 0 ? (
                <div className="border-t px-4 py-3 flex gap-2">
                  <button
                    type="button"
                    className="text-sm text-sky-600"
                    onClick={() =>
                      api
                        .bulkUpdateBlocks([...selected], true)
                        .then(() => {
                          setSelected(new Set());
                          qc.invalidateQueries({ queryKey: ["blocks"] });
                        })
                    }
                  >
                    Publish selected
                  </button>
                  <button
                    type="button"
                    className="text-sm text-slate-600"
                    onClick={() =>
                      api
                        .bulkUpdateBlocks([...selected], false)
                        .then(() => {
                          setSelected(new Set());
                          qc.invalidateQueries({ queryKey: ["blocks"] });
                        })
                    }
                  >
                    Unpublish selected
                  </button>
                </div>
              ) : null}
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
