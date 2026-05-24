import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import type { ThemeVersionSnapshot } from "@ugclab/tenant/store-theme";

export function ThemeVersionPanel() {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data } = useQuery({
    queryKey: ["theme-versions"],
    queryFn: () => api.themeVersions(),
  });

  const versions = (data?.versions ?? []) as ThemeVersionSnapshot[];

  async function snapshot() {
    const label = window.prompt("Snapshot label", `Backup ${new Date().toLocaleString()}`);
    if (!label?.trim()) return;
    setPending(true);
    try {
      await api.saveThemeVersion(label.trim());
      await qc.invalidateQueries({ queryKey: ["theme-versions"] });
      setAlert({ ok: true, message: "Snapshot saved" });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setPending(false);
    }
  }

  async function restore(id: string) {
    if (!window.confirm("Restore this snapshot to your draft? Current draft blocks will be replaced.")) {
      return;
    }
    setPending(true);
    try {
      await api.restoreThemeVersion(id);
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setAlert({ ok: true, message: "Restored to draft — publish when ready" });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Restore failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Version history</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Save snapshots of your homepage layout and restore later (up to 15 versions).
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={() => void snapshot()}
        >
          Save snapshot
        </button>
      </div>
      <FormAlert ok={alert.ok} message={alert.message} />
      {versions.length === 0 ? (
        <p className="text-sm text-zinc-500">No snapshots yet. Publishing also creates a version automatically.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{v.label}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(v.savedAt).toLocaleString()} · {v.homeBlocks.length} blocks
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                className="ugclab-btn border border-zinc-200 bg-white text-xs"
                onClick={() => void restore(v.id)}
              >
                Restore to draft
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
