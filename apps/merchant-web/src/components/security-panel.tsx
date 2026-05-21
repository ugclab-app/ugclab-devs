import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";

export function SecurityPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => api.twoFaStatus(),
  });
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function startSetup() {
    setPending(true);
    try {
      const res = await api.twoFaSetup();
      setSetup(res);
      setAlert({ ok: true, message: "Scan the URI in Google Authenticator or similar" });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Setup failed" });
    } finally {
      setPending(false);
    }
  }

  async function enable() {
    setPending(true);
    try {
      await api.twoFaEnable(code);
      setSetup(null);
      setCode("");
      setAlert({ ok: true, message: "2FA enabled" });
      await qc.invalidateQueries({ queryKey: ["2fa-status"] });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Invalid code" });
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    try {
      await api.twoFaDisable(code, password);
      setAlert({ ok: true, message: "2FA disabled" });
      setCode("");
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["2fa-status"] });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPanelShell
      title="Two-factor authentication"
      description="Add an extra layer of security to your merchant account."
      badge={
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            data?.enabled
              ? "bg-emerald-100 text-emerald-800"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {data?.enabled ? "Enabled" : "Off"}
        </span>
      }
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      {!data?.enabled ? (
        <>
          {!setup ? (
            <button
              type="button"
              disabled={pending}
              onClick={startSetup}
              className="ugclab-btn ugclab-btn-primary text-sm"
            >
              Set up 2FA
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm">
              <p className="font-mono text-xs break-all">{setup.secret}</p>
              <a href={setup.uri} className="text-violet-600 underline text-xs break-all">
                {setup.uri}
              </a>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="ugclab-input max-w-xs"
                maxLength={6}
              />
              <button
                type="button"
                disabled={pending || code.length < 6}
                onClick={enable}
                className="ugclab-btn ugclab-btn-primary text-sm"
              >
                Confirm & enable
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2 max-w-sm">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="2FA code"
            className="ugclab-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Account password"
            className="ugclab-input"
          />
          <button
            type="button"
            disabled={pending}
            onClick={disable}
            className="ugclab-btn border border-red-200 text-red-700 text-sm"
          >
            Disable 2FA
          </button>
        </div>
      )}
    </SettingsPanelShell>
  );
}
