import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { SettingsPanelShell } from "@/components/settings-section";
import {
  getStorefrontDisplayHost,
  getStorefrontUrl,
} from "@/lib/storefront";

type Domain = {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
};

export function DomainsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: () => api.domains(),
  });
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const domains = (data?.domains ?? []) as Domain[];
  const slug = (data as { tenantSlug?: string })?.tenantSlug ?? "demo";

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.addDomain(String(fd.get("domain")));
      (e.target as HTMLFormElement).reset();
      setAlert({ ok: true, message: "Domain added" });
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading domains…</p>;

  const verified = domains.filter((d) => d.verified);
  const storeUrl = getStorefrontUrl(slug);
  const displayHost = getStorefrontDisplayHost(slug);

  return (
    <>
    <SettingsPanelShell
      title="Default store address"
      description="Your free subdomain works immediately — no setup required."
    >
      <p className="font-mono text-sm font-semibold text-violet-700">{displayHost}</p>
      <p className="mt-1 break-all font-mono text-xs text-zinc-500">{storeUrl}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyStoreUrl url={storeUrl} />
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="ugclab-btn border border-zinc-200 bg-white text-sm"
        >
          Open store
        </a>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Buy a domain at any registrar (Cloudflare, Namecheap, etc.), then add it below
        and point DNS to your platform.
      </p>
    </SettingsPanelShell>

    <div className="mt-8">
    <SettingsPanelShell
      title="Custom domain"
      description="Connect shop.yourbrand.com — we'll verify ownership via a TXT record."
    >
      {verified.length > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Verified domains</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {verified.map((d) => (
              <li key={d.id}>
                <a
                  href={`https://${d.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-800 underline"
                >
                  https://{d.domain}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <FormAlert ok={alert.ok} message={alert.message} />

      <ul className="space-y-3">
        {domains.map((d) => (
          <li key={d.id} className="rounded-lg border border-zinc-100 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono font-medium">{d.domain}</span>
              {d.verified ? (
                <span className="text-emerald-600 text-xs font-semibold">Verified</span>
              ) : (
                <span className="text-amber-600 text-xs">Pending</span>
              )}
            </div>
            {!d.verified ? (
              <p className="mt-2 text-xs text-zinc-500">
                TXT: <code className="break-all">ugclab-verify={d.verificationToken}</code>
              </p>
            ) : null}
            <div className="mt-2 flex gap-3">
              {!d.verified ? (
                <button
                  type="button"
                  onClick={async () => {
                    await api.verifyDomain(d.id);
                    await queryClient.invalidateQueries({ queryKey: ["domains"] });
                  }}
                  className="text-violet-600 text-xs font-semibold"
                >
                  Mark verified
                </button>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Remove domain?")) return;
                  await api.deleteDomain(d.id);
                  await queryClient.invalidateQueries({ queryKey: ["domains"] });
                }}
                className="text-red-600 text-xs"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="flex gap-2">
        <input
          name="domain"
          placeholder="shop.yourbrand.com"
          required
          className="ugclab-input flex-1 font-mono"
        />
        <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary shrink-0">
          Add
        </button>
      </form>
    </SettingsPanelShell>
    </div>
    </>
  );
}
