import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type SectionRow = {
  id: string;
  label: string;
  description: string;
  category: string;
  published: boolean;
  sortOrder: number;
  deprecated: boolean;
};

export default function SectionsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["sections"], queryFn: () => api.sections() });

  return (
    <div className="space-y-6">
      <div className="platform-page-header">
        <div>
          <h1>Section catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ready-made block groups merchants add via &quot;+ Section&quot; in the site builder.
          </p>
        </div>
        <button
          type="button"
          className="ugclab-btn border border-slate-200 bg-white text-sm"
          onClick={() => api.syncSections().then(() => qc.invalidateQueries({ queryKey: ["sections"] }))}
        >
          Sync from codebase
        </button>
      </div>

      <QueryState query={query}>
        {(data) => {
          const sections = data.sections as SectionRow[];
          return (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sections.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.label}</div>
                        <div className="font-mono text-xs text-slate-500">{s.id}</div>
                        <div className="text-xs text-slate-500">{s.description}</div>
                      </td>
                      <td className="px-4 py-3">{s.category}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={s.published}
                          onChange={(e) =>
                            api
                              .updateSection(s.id, { published: e.target.checked })
                              .then(() => qc.invalidateQueries({ queryKey: ["sections"] }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
