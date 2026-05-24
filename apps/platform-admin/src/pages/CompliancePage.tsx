import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function CompliancePage() {
  const qc = useQueryClient();
  const blQ = useQuery({ queryKey: ["blacklist"], queryFn: () => api.blacklist() });
  const [type, setType] = useState<"email" | "domain">("email");
  const [value, setValue] = useState("");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Compliance & fraud</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Audit export</h2>
        <button
          type="button"
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={() => api.exportAuditCsv()}
        >
          Download audit CSV
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Blacklist</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await api.addBlacklist({ type, value });
            setValue("");
            await qc.invalidateQueries({ queryKey: ["blacklist"] });
          }}
        >
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as "email" | "domain")}
          >
            <option value="email">Email</option>
            <option value="domain">Domain</option>
          </select>
          <input
            className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="user@spam.com or bad-domain.com"
          />
          <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm">
            Add
          </button>
        </form>
        <QueryState query={blQ}>
          {(data) => (
            <ul className="platform-card divide-y text-sm">
              {(data.entries as { id: string; type: string; value: string; reason: string | null }[]).map(
                (e) => (
                  <li key={e.id} className="flex justify-between px-6 py-2">
                    <span>
                      {e.type}: <code>{e.value}</code>
                    </span>
                    <button
                      type="button"
                      className="text-red-600 text-xs"
                      onClick={async () => {
                        await api.removeBlacklist(e.id);
                        await qc.invalidateQueries({ queryKey: ["blacklist"] });
                      }}
                    >
                      Remove
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </QueryState>
      </section>
    </div>
  );
}
