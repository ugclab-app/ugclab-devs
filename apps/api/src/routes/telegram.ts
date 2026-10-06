import { Hono } from "hono";
import { handleTelegramUpdate } from "../lib/telegram-bot.js";

const telegram = new Hono();

telegram.post("/webhook/:tenantId", async (c) => {
  const tenantId = c.req.param("tenantId");
  const secret = c.req.query("secret") ?? "";
  if (!tenantId || !secret) return c.json({ ok: true });

  let update: unknown;
  try {
    update = await c.req.json();
  } catch {
    return c.json({ ok: true });
  }

  try {
    await handleTelegramUpdate(
      tenantId,
      secret,
      update as Parameters<typeof handleTelegramUpdate>[2]
    );
  } catch (e) {
    console.error("[telegram] webhook", e);
  }
  // Always 200 so Telegram does not retry aggressively
  return c.json({ ok: true });
});

export { telegram };
