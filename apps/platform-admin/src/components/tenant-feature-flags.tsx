import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

const LABELS: Record<string, string> = {
  marketing: "Marketing",
  subscriptions: "Subscriptions",
  customDomain: "Custom domain",
  aiBuilder: "AI site builder",
};

export function TenantFeatureFlags({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["tenant-features", tenantId],
    queryFn: () => api.tenantFeatures(tenantId),
  });

  return (
    <section className="platform-card p-6 space-y-3 text-sm">
      <h2 className="font-semibold">Feature flags</h2>
      <QueryState query={query}>
        {(data) => (
          <ul className="space-y-2">
            {Object.entries(data.flags as Record<string, boolean>).map(([key, on]) => (
              <li key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={async (e) => {
                    await api.updateTenantFeatures(tenantId, {
                      ...data.flags,
                      [key]: e.target.checked,
                    });
                    await qc.invalidateQueries({ queryKey: ["tenant-features", tenantId] });
                  }}
                />
                <span>{LABELS[key] ?? key}</span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
