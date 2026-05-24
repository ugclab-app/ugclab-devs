import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function ThemesPage() {
  const qc = useQueryClient();
  const themesQ = useQuery({ queryKey: ["themes"], queryFn: () => api.themes() });
  const usageQ = useQuery({ queryKey: ["theme-usage"], queryFn: () => api.themeUsage() });

  const usageMap = new Map(
    ((usageQ.data?.byTheme ?? []) as { themeId: string; storeCount: number }[]).map((u) => [
      u.themeId,
      u.storeCount,
    ])
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Theme catalog</h1>
      <p className="text-sm text-slate-500">
        Publish themes to the merchant gallery. Usage counts stores with{" "}
        <code className="text-xs">catalogThemeId</code> in saved theme.
      </p>
      {usageQ.data ? (
        <p className="text-sm">
          Custom/untracked themes: {usageQ.data.customThemeStores} stores
        </p>
      ) : null}

      <QueryState query={themesQ}>
        {(data) => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-3">Theme</th>
                  <th className="px-6 py-3">Stores</th>
                  <th className="px-6 py-3">Published</th>
                  <th className="px-6 py-3">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.themes as { id: string; label: string; published: boolean; featured: boolean }[]).map(
                  (t) => (
                    <tr key={t.id}>
                      <td className="px-6 py-4 font-medium">{t.label}</td>
                      <td className="px-6 py-4">{usageMap.get(t.id) ?? 0}</td>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={t.published}
                          onChange={(e) =>
                            api.updateTheme(t.id, { published: e.target.checked }).then(() =>
                              qc.invalidateQueries({ queryKey: ["themes"] })
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={t.featured}
                          onChange={(e) =>
                            api.updateTheme(t.id, { featured: e.target.checked }).then(() =>
                              qc.invalidateQueries({ queryKey: ["themes"] })
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
