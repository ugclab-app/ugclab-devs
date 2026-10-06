import { createHash, randomBytes } from "crypto";
import { OrderStatus, prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";

const TG_API = "https://api.telegram.org";

export type TelegramBotConfig = {
  botToken?: string;
  botUsername?: string;
  enabled?: boolean;
  notifyOrders?: boolean;
  webhookSecret?: string;
  linkCode?: string;
  chatIds?: number[];
};

export function parseTelegramConfig(integrations: unknown): TelegramBotConfig {
  if (!integrations || typeof integrations !== "object") return {};
  const tg = (integrations as Record<string, unknown>).telegram;
  if (!tg || typeof tg !== "object") return {};
  const o = tg as Record<string, unknown>;
  const chatIds = Array.isArray(o.chatIds)
    ? o.chatIds.map((id) => Number(id)).filter((n) => Number.isFinite(n))
    : [];
  return {
    botToken: o.botToken ? String(o.botToken).trim() : undefined,
    botUsername: o.botUsername ? String(o.botUsername).trim() : undefined,
    enabled: o.enabled === true,
    notifyOrders: o.notifyOrders !== false,
    webhookSecret: o.webhookSecret ? String(o.webhookSecret) : undefined,
    linkCode: o.linkCode ? String(o.linkCode) : undefined,
    chatIds,
  };
}

export function maskTelegramConfig(cfg: TelegramBotConfig) {
  const token = cfg.botToken ?? "";
  return {
    connected: Boolean(cfg.botToken && cfg.enabled),
    botUsername: cfg.botUsername ?? null,
    enabled: cfg.enabled === true,
    notifyOrders: cfg.notifyOrders !== false,
    chatCount: cfg.chatIds?.length ?? 0,
    tokenHint: token
      ? `${token.slice(0, 6)}…${token.slice(-4)}`
      : null,
    linkCode: cfg.linkCode ?? null,
  };
}

export async function readTelegramConfig(tenantId: string): Promise<TelegramBotConfig> {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { integrations: true },
  });
  return parseTelegramConfig(settings?.integrations);
}

export async function writeTelegramConfig(
  tenantId: string,
  next: TelegramBotConfig
) {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { integrations: true },
  });
  const base =
    settings?.integrations && typeof settings.integrations === "object"
      ? { ...(settings.integrations as Record<string, unknown>) }
      : {};
  base.telegram = next;
  await prisma.storeSettings.upsert({
    where: { tenantId },
    create: { tenantId, integrations: base as object },
    update: { integrations: base as object },
  });
}

function publicApiBase(): string {
  return (
    process.env.API_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.API_URL?.replace(/\/$/, "") ||
    process.env.VITE_API_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:4000")
  ).replace(/\/api$/, "");
}

async function tgCall<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result as T;
}

export async function connectTelegramBot(tenantId: string, botToken: string) {
  const token = botToken.trim();
  if (!token.includes(":")) throw new Error("Invalid bot token");

  const me = await tgCall<{ username?: string; id: number }>(token, "getMe");
  const webhookSecret = randomBytes(16).toString("hex");
  const linkCode = randomBytes(4).toString("hex");
  const base = publicApiBase();
  const webhookUrl = `${base}/api/telegram/webhook/${tenantId}?secret=${webhookSecret}`;

  await tgCall(token, "setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });

  const prev = await readTelegramConfig(tenantId);
  await writeTelegramConfig(tenantId, {
    ...prev,
    botToken: token,
    botUsername: me.username ?? undefined,
    enabled: true,
    notifyOrders: prev.notifyOrders !== false,
    webhookSecret,
    linkCode,
    chatIds: prev.chatIds ?? [],
  });

  return {
    botUsername: me.username ?? null,
    linkCode,
    deepLink: me.username
      ? `https://t.me/${me.username}?start=${linkCode}`
      : null,
  };
}

export async function disconnectTelegramBot(tenantId: string) {
  const cfg = await readTelegramConfig(tenantId);
  if (cfg.botToken) {
    try {
      await tgCall(cfg.botToken, "deleteWebhook", { drop_pending_updates: true });
    } catch {
      /* ignore */
    }
  }
  await writeTelegramConfig(tenantId, {
    enabled: false,
    notifyOrders: true,
    chatIds: [],
  });
}

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string
) {
  await tgCall(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export async function notifyTelegramNewOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, items: true, tenant: true },
  });
  if (!order) return;
  const cfg = await readTelegramConfig(order.tenantId);
  if (!cfg.enabled || !cfg.botToken || !cfg.notifyOrders) return;
  if (!cfg.chatIds?.length) return;

  const total = formatMoney(order.totalAmount, order.currency);
  const items = order.items
    .map((i) => `• ${i.title} × ${i.quantity}`)
    .join("\n");
  const adminUrl = process.env.MERCHANT_WEB_URL ?? "http://localhost:3001";
  const text = `<b>New order #${order.orderNumber}</b>
${total} · ${order.status}
${order.customer?.email ?? order.guestEmail ?? "Guest"}

${items}

<a href="${adminUrl}/orders/${order.id}">Open in admin</a>`;

  for (const chatId of cfg.chatIds) {
    await sendTelegramMessage(cfg.botToken, chatId, text).catch(() => {});
  }
}

type TgUpdate = {
  message?: {
    chat: { id: number; type: string };
    text?: string;
    from?: { id: number; first_name?: string };
  };
};

export async function handleTelegramUpdate(
  tenantId: string,
  secret: string,
  update: TgUpdate
) {
  const cfg = await readTelegramConfig(tenantId);
  if (!cfg.enabled || !cfg.botToken) return;
  if (!cfg.webhookSecret || cfg.webhookSecret !== secret) return;

  const msg = update.message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const [cmd, ...args] = text.split(/\s+/);
  const command = (cmd?.split("@")[0] ?? "").toLowerCase();

  const linked = cfg.chatIds?.includes(chatId) ?? false;

  if (command === "/start") {
    const code = args[0]?.trim();
    if (cfg.linkCode && code === cfg.linkCode) {
      const chatIds = Array.from(new Set([...(cfg.chatIds ?? []), chatId]));
      await writeTelegramConfig(tenantId, { ...cfg, chatIds });
      await sendTelegramMessage(
        cfg.botToken,
        chatId,
        `✅ Linked to <b>${(await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name ?? "store"}</b>.\n\nCommands:\n/orders — recent orders\n/pending — pending payment\n/today — today summary\n/stats — 7-day stats\n/unlink — disconnect this chat`
      );
      return;
    }
    if (!cfg.linkCode) {
      await sendTelegramMessage(
        cfg.botToken,
        chatId,
        "Bot is not fully configured. Reconnect it in merchant admin."
      );
      return;
    }
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      "Open the deep link from merchant admin (Growth → Integrations → Telegram) to link this chat."
    );
    return;
  }

  if (!linked) {
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      "This chat is not linked. Use the link from merchant admin."
    );
    return;
  }

  if (command === "/help") {
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      `/orders — last 10 orders\n/pending — awaiting payment\n/today — today\n/stats — last 7 days\n/unlink — remove this chat`
    );
    return;
  }

  if (command === "/unlink") {
    await writeTelegramConfig(tenantId, {
      ...cfg,
      chatIds: (cfg.chatIds ?? []).filter((id) => id !== chatId),
    });
    await sendTelegramMessage(cfg.botToken, chatId, "Unlinked. /start with code to reconnect.");
    return;
  }

  if (command === "/orders" || command === "/pending" || command === "/today") {
    const where: {
      tenantId: string;
      status?: OrderStatus | { in: OrderStatus[] };
      createdAt?: { gte: Date };
    } = { tenantId };
    if (command === "/pending") where.status = OrderStatus.PENDING;
    if (command === "/today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      where.createdAt = { gte: start };
    }
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        orderNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        guestEmail: true,
        customer: { select: { email: true } },
        createdAt: true,
      },
    });
    if (!orders.length) {
      await sendTelegramMessage(cfg.botToken, chatId, "No orders found.");
      return;
    }
    const lines = orders.map((o) => {
      const email = o.customer?.email ?? o.guestEmail ?? "—";
      return `#${o.orderNumber} · ${o.status} · ${formatMoney(o.totalAmount, o.currency)}\n${email}`;
    });
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      `<b>${command === "/pending" ? "Pending" : command === "/today" ? "Today" : "Recent"} orders</b>\n\n${lines.join("\n\n")}`
    );
    return;
  }

  if (command === "/stats") {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const paid = await prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: since },
      },
      select: { totalAmount: true, currency: true },
    });
    const pending = await prisma.order.count({
      where: { tenantId, status: OrderStatus.PENDING },
    });
    const revenue = paid.reduce((s, o) => s + o.totalAmount, 0);
    const currency = paid[0]?.currency ?? "USD";
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      `<b>Last 7 days</b>\nOrders paid: ${paid.length}\nRevenue: ${formatMoney(revenue, currency)}\nPending now: ${pending}`
    );
    return;
  }

  await sendTelegramMessage(
    cfg.botToken,
    chatId,
    "Unknown command. Try /help"
  );
}

/** Stable hash — unused publicly, kept for future token-at-rest hashing. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}
