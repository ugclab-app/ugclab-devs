import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { SettingsPanelShell } from "@/components/settings-section";
import { useAdminT } from "@/hooks/use-admin-t";
import {
  getStorefrontDisplayHost,
  getStorefrontUrl,
} from "@/lib/storefront";

const RECOMMENDED_REGISTRARS = new Set(["cloudflare", "namecheap"]);

type Domain = {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
  lastDnsOk?: boolean | null;
  lastDnsCheckAt?: string | null;
};

type DnsInstructions = {
  txtHost: string;
  txtValue: string;
  cnameHost: string;
  cnameTarget: string;
  note: string;
};

type DomainTab = "default" | "buy" | "connect";

type RegistrarLink = {
  id: string;
  label: string;
  description: string;
  url: string;
};

export function DomainsPanel() {
  const { ta } = useAdminT();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DomainTab>("default");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [selectedBuyDomain, setSelectedBuyDomain] = useState<string | null>(null);
  const [expandedDnsId, setExpandedDnsId] = useState<string | null>(null);
  const [handleDraft, setHandleDraft] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [editingAliasDraft, setEditingAliasDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: () => api.domains(),
  });

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ["domain-search", searchQ],
    queryFn: () => api.searchDomains(searchQ),
    enabled: tab === "buy" && searchQ.trim().length >= 2,
  });

  const { data: purchaseLinks } = useQuery({
    queryKey: ["domain-purchase-links", selectedBuyDomain],
    queryFn: () => api.domainPurchaseLinks(selectedBuyDomain!),
    enabled: tab === "buy" && Boolean(selectedBuyDomain),
  });

  const domains = (data?.domains ?? []) as Domain[];
  const aliases = data?.aliases ?? [];
  const config = (data as { config?: Record<string, unknown> })?.config ?? {};
  const slug = (data as { tenantSlug?: string })?.tenantSlug ?? "demo";
  const entriConfigured = Boolean(config.entriConfigured);
  const cnameTarget = String(config.cnameTarget ?? "cname.tescommerce.com");

  const tabs: { id: DomainTab; label: string }[] = [
    { id: "default", label: ta("domainsPage.tabFree") },
    { id: "buy", label: ta("domainsPage.tabBuy") },
    { id: "connect", label: ta("domainsPage.tabConnect") },
  ];

  async function onAddConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.addDomain(String(fd.get("domain")));
      (e.target as HTMLFormElement).reset();
      setAlert({ ok: true, message: ta("domainsPage.addedOk") });
      setTab("connect");
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

  async function checkDns(id: string) {
    setPending(true);
    try {
      const r = await api.checkDomainDns(id);
      if (r.ok) {
        setAlert({ ok: true, message: ta("domainsPage.verifiedOk") });
      } else {
        setAlert({
          ok: false,
          message: r.error ?? ta("domainsPage.txtNotFound"),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : ta("domainsPage.dnsCheckFailed"),
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading) return <p className="text-sm text-zinc-500">{ta("domainsPage.loading")}</p>;

  const verified = domains.filter((d) => d.verified);
  const storeUrl = getStorefrontUrl(slug);
  const displayHost = getStorefrontDisplayHost(slug);

  const registrars = (purchaseLinks?.registrars ?? []) as RegistrarLink[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      {tab === "default" && (
        <div className="space-y-6">
          <SettingsPanelShell
            title={ta("domainsPage.freeTitle")}
            description={ta("domainsPage.freeDesc")}
          >
            <p className="font-mono text-sm font-semibold text-violet-700">{displayHost}</p>
            <p className="mt-1 break-all font-mono text-xs text-zinc-500">{storeUrl}</p>
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const next = (handleDraft ?? slug).trim();
                if (!next || next === slug) return;
                setPending(true);
                void api
                  .updateStoreSlug(next)
                  .then(async () => {
                    setHandleDraft(null);
                    setAlert({ ok: true, message: ta("domainsPage.savedOk") });
                    await queryClient.invalidateQueries({ queryKey: ["domains"] });
                  })
                  .catch((err) => {
                    setAlert({
                      ok: false,
                      message: err instanceof Error ? err.message : "Failed",
                    });
                  })
                  .finally(() => setPending(false));
              }}
            >
              <label className="min-w-[200px] flex-1 text-xs text-zinc-500">
                {ta("domainsPage.editHandle")}
                <input
                  value={handleDraft ?? slug}
                  onChange={(e) => setHandleDraft(e.target.value)}
                  className="ugclab-input mt-1 w-full font-mono"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="ugclab-btn ugclab-btn-primary shrink-0"
              >
                {ta("domainsPage.saveHandle")}
              </button>
            </form>
            <p className="mt-2 text-xs text-zinc-500">{ta("domainsPage.handleHint")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyStoreUrl url={storeUrl} />
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="ugclab-btn border border-zinc-200 bg-white text-sm"
              >
                {ta("domainsPage.openStore")}
              </a>
            </div>
          </SettingsPanelShell>

          <SettingsPanelShell
            title={ta("domainsPage.extraTitle")}
            description={ta("domainsPage.extraDesc")}
          >
            <ul className="space-y-3">
              {aliases.map((alias) => {
                const url = getStorefrontUrl(alias);
                const editing = editingAlias === alias;
                return (
                  <li key={alias} className="rounded-lg border border-zinc-200 px-3 py-3">
                    {editing ? (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setPending(true);
                          void api
                            .updateStoreAlias(alias, editingAliasDraft)
                            .then(async () => {
                              setEditingAlias(null);
                              await queryClient.invalidateQueries({ queryKey: ["domains"] });
                            })
                            .catch((err) => {
                              setAlert({
                                ok: false,
                                message: err instanceof Error ? err.message : "Failed",
                              });
                            })
                            .finally(() => setPending(false));
                        }}
                      >
                        <input
                          value={editingAliasDraft}
                          onChange={(e) => setEditingAliasDraft(e.target.value)}
                          className="ugclab-input min-w-[160px] flex-1 font-mono"
                        />
                        <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
                          {ta("domainsPage.save")}
                        </button>
                        <button
                          type="button"
                          className="ugclab-btn border border-zinc-200 bg-white"
                          onClick={() => setEditingAlias(null)}
                        >
                          {ta("domainsPage.cancel")}
                        </button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold text-violet-700">
                            {getStorefrontDisplayHost(alias)}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-zinc-500">{url}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <CopyStoreUrl url={url} />
                          <button
                            type="button"
                            className="ugclab-btn border border-zinc-200 bg-white text-sm"
                            onClick={() => {
                              setEditingAlias(alias);
                              setEditingAliasDraft(alias);
                            }}
                          >
                            {ta("domainsPage.edit")}
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            className="ugclab-btn border border-zinc-200 bg-white text-sm text-red-700"
                            onClick={() => {
                              setPending(true);
                              void api
                                .deleteStoreAlias(alias)
                                .then(async () => {
                                  await queryClient.invalidateQueries({ queryKey: ["domains"] });
                                })
                                .catch((err) => {
                                  setAlert({
                                    ok: false,
                                    message: err instanceof Error ? err.message : "Failed",
                                  });
                                })
                                .finally(() => setPending(false));
                            }}
                          >
                            {ta("domainsPage.remove")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const next = aliasDraft.trim();
                if (!next) return;
                setPending(true);
                void api
                  .addStoreAlias(next)
                  .then(async () => {
                    setAliasDraft("");
                    await queryClient.invalidateQueries({ queryKey: ["domains"] });
                  })
                  .catch((err) => {
                    setAlert({
                      ok: false,
                      message: err instanceof Error ? err.message : "Failed",
                    });
                  })
                  .finally(() => setPending(false));
              }}
            >
              <input
                value={aliasDraft}
                onChange={(e) => setAliasDraft(e.target.value)}
                placeholder={ta("domainsPage.addressPlaceholder")}
                className="ugclab-input min-w-[200px] flex-1 font-mono"
              />
              <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary shrink-0">
                {ta("domainsPage.addAddress")}
              </button>
            </form>
          </SettingsPanelShell>
        </div>
      )}

      {tab === "buy" && (
        <div className="space-y-6">
          <SettingsPanelShell title={ta("domainsPage.buyTitle")} description={ta("domainsPage.buyDesc")}>
            {!entriConfigured ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {ta("domainsPage.entriHint")}
              </p>
            ) : null}

            <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-3 text-xs text-sky-950">
              <p className="font-semibold">{ta("domainsPage.caLocalTitle")}</p>
              <p className="mt-1">{ta("domainsPage.caLocalDesc")}</p>
            </div>

            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setSearchQ(String(fd.get("q") ?? "").trim());
              }}
            >
              <input
                name="q"
                placeholder={ta("domainsPage.searchPlaceholder")}
                className="ugclab-input min-w-[200px] flex-1 font-mono"
                defaultValue={searchQ}
              />
              <button type="submit" className="ugclab-btn ugclab-btn-primary shrink-0">
                {ta("domainsPage.search")}
              </button>
            </form>

            {searchLoading ? (
              <p className="mt-4 text-sm text-zinc-500">{ta("domainsPage.searching")}</p>
            ) : null}

            {searchData?.results?.length ? (
              <ul className="mt-4 divide-y rounded-xl border border-zinc-200">
                {(
                  searchData.results as Array<{
                    domain: string;
                    available: boolean | null;
                    priceUsd: number | null;
                    source: string;
                  }>
                ).map((r) => (
                  <li
                    key={r.domain}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-mono font-medium">{r.domain}</span>
                      {r.available === true ? (
                        <span className="ml-2 text-xs font-semibold text-emerald-600">
                          {ta("domainsPage.available")}
                        </span>
                      ) : r.available === false ? (
                        <span className="ml-2 text-xs text-zinc-500">{ta("domainsPage.taken")}</span>
                      ) : (
                        <span className="ml-2 text-xs text-zinc-400">
                          {ta("domainsPage.checkRegistrar")}
                        </span>
                      )}
                      {r.priceUsd != null ? (
                        <span className="ml-2 text-xs text-zinc-500">
                          {ta("domainsPage.fromPerYear").replace(
                            "{{price}}",
                            r.priceUsd.toFixed(2)
                          )}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="ugclab-btn ugclab-btn-secondary text-xs"
                      onClick={() => setSelectedBuyDomain(r.domain)}
                    >
                      {ta("domainsPage.buyOptions")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {selectedBuyDomain && registrars.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    {ta("domainsPage.checkoutFor")}{" "}
                    <span className="font-mono">{selectedBuyDomain}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {ta("domainsPage.checkoutDesc")}{" "}
                    <button
                      type="button"
                      className="font-medium text-violet-700 underline"
                      onClick={() => setTab("connect")}
                    >
                      {ta("domainsPage.checkoutConnectLink")}
                    </button>
                    .
                  </p>
                  <ul className="mt-4 space-y-2">
                    {registrars.map((r) => {
                      const recommended = RECOMMENDED_REGISTRARS.has(r.id);
                      return (
                        <li key={r.id}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`ugclab-btn flex w-full items-center justify-between border bg-white text-sm ${
                              recommended
                                ? "border-violet-300 ring-1 ring-violet-200"
                                : "border-zinc-200"
                            }`}
                          >
                            <span>
                              {recommended ? (
                                <span className="mr-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                                  {ta("domainsPage.recommended")}
                                </span>
                              ) : null}
                              <span className="font-medium">{r.label}</span>
                              <span className="ml-2 text-xs text-zinc-500">{r.description}</span>
                            </span>
                            <span className="shrink-0 text-violet-700">
                              {ta("domainsPage.openRegistrar")}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-sm font-semibold text-emerald-950">
                    {ta("domainsPage.afterPurchaseTitle")}
                  </p>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-emerald-900">
                    {ta("domainsPage.afterPurchaseSteps")
                      .split("\n")
                      .map((line) => (
                        <li key={line}>{line.replace(/^\d+\.\s*/, "")}</li>
                      ))}
                  </ol>
                  <button
                    type="button"
                    className="ugclab-btn ugclab-btn-primary mt-4 text-sm"
                    onClick={() => setTab("connect")}
                  >
                    {ta("domainsPage.goToConnect")}
                  </button>
                </div>
              </div>
            ) : null}
          </SettingsPanelShell>
        </div>
      )}

      {tab === "connect" && (
        <div className="space-y-6">
          <SettingsPanelShell
            title={ta("domainsPage.connectTitle")}
            description={ta("domainsPage.connectDesc")}
          >
            {verified.length > 0 ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-medium">{ta("domainsPage.liveOnDomain")}</p>
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {verified.map((d) => (
                    <li key={d.id}>
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        https://{d.domain}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form onSubmit={onAddConnect} className="flex gap-2">
              <input
                name="domain"
                placeholder={ta("domainsPage.connectPlaceholder")}
                required
                className="ugclab-input flex-1 font-mono"
              />
              <button
                type="submit"
                disabled={pending}
                className="ugclab-btn ugclab-btn-primary shrink-0"
              >
                {ta("domainsPage.addDomain")}
              </button>
            </form>

            <p className="mt-4 text-xs text-zinc-500">
              {ta("domainsPage.cnameHint")}{" "}
              <span className="font-mono">{cnameTarget}</span>. {ta("domainsPage.cnameTxtHint")}
            </p>
          </SettingsPanelShell>

          {domains.length === 0 ? (
            <p className="text-sm text-zinc-500">{ta("domainsPage.noDomains")}</p>
          ) : (
            <ul className="space-y-4">
              {domains.map((d) => (
                <DomainConnectCard
                  key={d.id}
                  domain={d}
                  expanded={expandedDnsId === d.id}
                  pending={pending}
                  onToggle={() =>
                    setExpandedDnsId(expandedDnsId === d.id ? null : d.id)
                  }
                  onCheckDns={() => void checkDns(d.id)}
                  onRemove={async () => {
                    if (!confirm(ta("domainsPage.removeConfirm"))) return;
                    await api.deleteDomain(d.id);
                    await queryClient.invalidateQueries({ queryKey: ["domains"] });
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DomainConnectCard({
  domain: d,
  expanded,
  pending,
  onToggle,
  onCheckDns,
  onRemove,
}: {
  domain: Domain;
  expanded: boolean;
  pending: boolean;
  onToggle: () => void;
  onCheckDns: () => void;
  onRemove: () => void;
}) {
  const { ta } = useAdminT();
  const { data: dnsData } = useQuery({
    queryKey: ["domain-dns", d.id],
    queryFn: () => api.domainDnsInstructions(d.id),
    enabled: expanded,
  });

  const instr = dnsData?.instructions as DnsInstructions | undefined;

  return (
    <li className="rounded-xl border border-zinc-200 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono font-medium">{d.domain}</span>
          {d.verified ? (
            <span className="ml-2 text-xs font-semibold text-emerald-600">
              {ta("domainsPage.verified")}
            </span>
          ) : d.lastDnsOk === false ? (
            <span className="ml-2 text-xs text-amber-600">{ta("domainsPage.dnsPending")}</span>
          ) : (
            <span className="ml-2 text-xs text-zinc-500">{ta("domainsPage.notVerified")}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ugclab-btn ugclab-btn-ghost text-xs" onClick={onToggle}>
            {expanded ? ta("domainsPage.hideDns") : ta("domainsPage.dnsSteps")}
          </button>
          {!d.verified ? (
            <button
              type="button"
              disabled={pending}
              className="ugclab-btn ugclab-btn-primary text-xs"
              onClick={onCheckDns}
            >
              {ta("domainsPage.checkDns")}
            </button>
          ) : null}
          <button type="button" className="text-xs text-red-600" onClick={() => void onRemove()}>
            {ta("domainsPage.remove")}
          </button>
        </div>
      </div>

      {expanded && instr ? (
        <div className="mt-4 space-y-3 rounded-lg bg-zinc-50 p-3 text-xs">
          <DnsRow label={ta("domainsPage.dnsTxtHost")} value={instr.txtHost} />
          <DnsRow label={ta("domainsPage.dnsTxtValue")} value={instr.txtValue} copy />
          <DnsRow label={ta("domainsPage.dnsCnameHost")} value={instr.cnameHost} />
          <DnsRow label={ta("domainsPage.dnsCnameTarget")} value={instr.cnameTarget} copy />
          <p className="text-zinc-500">{instr.note}</p>
        </div>
      ) : null}
    </li>
  );
}

function DnsRow({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  copy?: boolean;
}) {
  const { ta } = useAdminT();
  return (
    <div>
      <p className="font-medium text-zinc-600">{label}</p>
      <p className="mt-0.5 break-all font-mono text-zinc-800">{value}</p>
      {copy ? (
        <button
          type="button"
          className="mt-1 font-medium text-violet-700"
          onClick={() => {
            void navigator.clipboard.writeText(value);
          }}
        >
          {ta("domainsPage.copy")}
        </button>
      ) : null}
    </div>
  );
}
