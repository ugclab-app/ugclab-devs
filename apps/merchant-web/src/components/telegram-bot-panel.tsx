import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

export function TelegramBotPanel() {
  const qc = useQueryClient();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["telegram-bot"],
    queryFn: () => api.getTelegramBot(),
  });

  const tg = data?.telegram;

  async function run(fn: () => Promise<unknown>, msg: string) {
    setPending(true);
    setAlert({});
    try {
      await fn();
      setAlert({ ok: true, message: msg });
      await qc.invalidateQueries({ queryKey: ["telegram-bot"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading Telegram…</p>;
  }

  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-zinc-200 p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Telegram bot</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Connect your own bot to get new-order alerts and check orders / stats
          with commands like /orders, /today, /stats.
        </p>
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      {!tg?.connected ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const res = await api.connectTelegramBot(token.trim());
              setDeepLink(res.deepLink);
              setToken("");
            }, "Bot connected — open the link below in Telegram");
          }}
        >
          <label className="block text-sm text-zinc-700">
            Bot token from @BotFather
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456:ABC…"
              required
              className="ugclab-input mt-1 w-full"
            />
          </label>
          <p className="text-xs text-zinc-500">
            Create a bot in Telegram via @BotFather, then paste the token here.
            Your API must be reachable at a public HTTPS URL (set API_PUBLIC_URL)
            so Telegram can deliver webhooks.
          </p>
          <button
            type="submit"
            disabled={pending || !token.trim()}
            className="ugclab-btn ugclab-btn-primary"
          >
            Connect bot
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-zinc-500">Bot</dt>
            <dd className="font-medium">
              {tg.botUsername ? `@${tg.botUsername}` : "—"}
            </dd>
            <dt className="text-zinc-500">Token</dt>
            <dd className="font-mono text-xs">{tg.tokenHint ?? "—"}</dd>
            <dt className="text-zinc-500">Linked chats</dt>
            <dd>{tg.chatCount}</dd>
          </dl>

          {(deepLink || (tg.linkCode && tg.botUsername)) && (
            <div className="rounded-lg bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-800">Link your chat</p>
              <p className="mt-1 text-zinc-600">
                Open this link in Telegram (or send{" "}
                <code className="rounded bg-zinc-200 px-1">
                  /start {tg.linkCode}
                </code>{" "}
                to the bot):
              </p>
              <a
                href={
                  deepLink ??
                  `https://t.me/${tg.botUsername}?start=${tg.linkCode}`
                }
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block break-all text-sky-700 underline"
              >
                {deepLink ??
                  `https://t.me/${tg.botUsername}?start=${tg.linkCode}`}
              </a>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={tg.notifyOrders}
              disabled={pending}
              onChange={(e) => {
                void run(
                  () => api.patchTelegramBot({ notifyOrders: e.target.checked }),
                  "Notification setting saved"
                );
              }}
            />
            Notify linked chats on new orders
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={tg.enabled}
              disabled={pending}
              onChange={(e) => {
                void run(
                  () => api.patchTelegramBot({ enabled: e.target.checked }),
                  e.target.checked ? "Bot enabled" : "Bot paused"
                );
              }}
            />
            Bot enabled
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="ugclab-btn ugclab-btn-secondary"
              onClick={() => {
                void run(async () => {
                  const res = await api.rotateTelegramLink();
                  setDeepLink(res.deepLink);
                }, "New link code generated");
              }}
            >
              New link code
            </button>
            <button
              type="button"
              disabled={pending}
              className="ugclab-btn ugclab-btn-secondary text-red-700"
              onClick={() => {
                if (!confirm("Disconnect Telegram bot?")) return;
                void run(async () => {
                  await api.disconnectTelegramBot();
                  setDeepLink(null);
                }, "Bot disconnected");
              }}
            >
              Disconnect
            </button>
          </div>

          <div className="border-t border-zinc-100 pt-3 text-xs text-zinc-500">
            <p className="font-medium text-zinc-600">Commands after linking</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>/orders — last 10 orders</li>
              <li>/pending — awaiting payment</li>
              <li>/today — today&apos;s orders</li>
              <li>/stats — last 7 days</li>
              <li>/unlink — disconnect this chat</li>
            </ul>
          </div>
        </div>
      )}

      {!tg?.connected && deepLink && (
        <div className="rounded-lg bg-zinc-50 p-3 text-sm">
          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sky-700 underline"
          >
            {deepLink}
          </a>
        </div>
      )}
    </div>
  );
}
