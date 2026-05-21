import type { StoreTheme } from "@ugclab/tenant/store-theme";

export function StoreLiveChatFields({ theme }: { theme: StoreTheme }) {
  const provider = theme.liveChatProvider ?? "none";

  return (
    <section className="admin-card space-y-4 p-6">
      <div>
        <h3 className="font-semibold text-zinc-900">Live chat</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Crisp or Intercom widget on your storefront. Paste the website / app ID from
          their dashboard.
        </p>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-zinc-700">Provider</span>
        <select
          name="liveChatProvider"
          defaultValue={provider}
          className="ugclab-select mt-1.5"
        >
          <option value="none">Off</option>
          <option value="crisp">Crisp</option>
          <option value="intercom">Intercom</option>
          <option value="custom">Custom embed (script HTML)</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-zinc-700">Website / App ID</span>
        <input
          name="liveChatId"
          defaultValue={theme.liveChatId ?? ""}
          placeholder="Crisp website ID or Intercom app_id"
          className="ugclab-input mt-1.5 font-mono text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-zinc-700">Custom embed (optional)</span>
        <textarea
          name="liveChatSnippet"
          rows={4}
          defaultValue={theme.liveChatSnippet ?? ""}
          placeholder='<script src="…"></script>'
          className="ugclab-input mt-1.5 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use when provider is Custom — paste the full snippet from Crisp/Intercom/Tidio.
        </p>
      </label>
    </section>
  );
}
