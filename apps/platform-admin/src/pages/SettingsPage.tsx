import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type Settings = {
  defaultPlatformFeeBps: number;
  defaultTrialDays: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  requireSuperAdmin2fa: boolean;
  adminIpAllowlist: string[];
  scheduledReportEmail: string | null;
  scheduledReportsEnabled: boolean;
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["platform-settings"], queryFn: () => api.platformSettings() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform settings</h1>
      <QueryState query={query}>
        {(data) => (
          <SettingsForm
            settings={data.settings as Settings}
            env={data as { stripeConfigured?: boolean; emailConfigured?: boolean; merchantAdminUrl?: string }}
            onSave={async (patch) => {
              await api.updatePlatformSettings(patch);
              await qc.invalidateQueries({ queryKey: ["platform-settings"] });
            }}
          />
        )}
      </QueryState>
    </div>
  );
}

function SettingsForm({
  settings: s,
  env,
  onSave,
}: {
  settings: Settings;
  env: { stripeConfigured?: boolean; emailConfigured?: boolean; merchantAdminUrl?: string };
  onSave: (p: Partial<Settings>) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <section className="platform-card divide-y text-sm">
        <Row label="Stripe" value={env.stripeConfigured ? "OK" : "Missing"} ok={env.stripeConfigured} />
        <Row label="Email" value={env.emailConfigured ? "OK" : "Missing"} ok={env.emailConfigured} />
        <Row label="Merchant admin" value={env.merchantAdminUrl ?? "—"} />
      </section>

      <section className="platform-card p-6 space-y-4">
        <h2 className="font-semibold">Defaults</h2>
        <label className="block">
          <span className="text-xs text-slate-500">Default platform fee (bps)</span>
          <input
            type="number"
            className="ugclab-input mt-1 w-32"
            defaultValue={s.defaultPlatformFeeBps}
            onBlur={(e) => onSave({ defaultPlatformFeeBps: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500">Default trial days</span>
          <input
            type="number"
            className="ugclab-input mt-1 w-32"
            defaultValue={s.defaultTrialDays}
            onBlur={(e) => onSave({ defaultTrialDays: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="platform-card p-6 space-y-4">
        <h2 className="font-semibold">Security</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked={s.requireSuperAdmin2fa}
            onChange={(e) => onSave({ requireSuperAdmin2fa: e.target.checked })}
          />
          Require 2FA for all super admins
        </label>
        <label className="block">
          <span className="text-xs text-slate-500">Admin IP allowlist (comma-separated, empty = all)</span>
          <input
            className="ugclab-input mt-1 w-full font-mono text-xs"
            defaultValue={s.adminIpAllowlist.join(", ")}
            onBlur={(e) =>
              onSave({
                adminIpAllowlist: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </section>

      <section className="platform-card p-6 space-y-4">
        <h2 className="font-semibold">Maintenance</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked={s.maintenanceMode}
            onChange={(e) => onSave({ maintenanceMode: e.target.checked })}
          />
          Maintenance mode
        </label>
        <textarea
          className="ugclab-input w-full text-sm"
          rows={2}
          defaultValue={s.maintenanceMessage}
          placeholder="Message for merchants…"
          onBlur={(e) => onSave({ maintenanceMessage: e.target.value })}
        />
      </section>

      <section className="platform-card p-6 space-y-4">
        <h2 className="font-semibold">Scheduled reports</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked={s.scheduledReportsEnabled}
            onChange={(e) => onSave({ scheduledReportsEnabled: e.target.checked })}
          />
          Enable weekly CSV email
        </label>
        <input
          className="ugclab-input w-full max-w-md"
          placeholder="ops@company.com"
          defaultValue={s.scheduledReportEmail ?? ""}
          onBlur={(e) => onSave({ scheduledReportEmail: e.target.value || null })}
        />
        <p className="text-xs text-slate-500">
          Cron job wiring uses PLATFORM_OPS_EMAIL when enabled — export runs on next scheduled job.
        </p>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 px-6 py-4">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={ok === false ? "text-red-600" : ok ? "text-emerald-600" : ""}>
        {value}
      </span>
    </div>
  );
}
