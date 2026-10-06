import type { Hono } from "hono";
import type { AuthEnv } from "../middleware/session.js";
import {
  ensureEmailTemplates,
  listEmailTemplates,
  renderTemplate,
  sendTemplatedEmail,
  updateEmailTemplateByKey,
} from "../lib/email-templates.js";

export function registerPlatformEmailTemplateRoutes(platform: Hono<AuthEnv>) {
  platform.get("/email-templates", async (c) => {
    await ensureEmailTemplates();
    const templates = await listEmailTemplates();
    return c.json({ templates });
  });

  platform.patch("/email-templates/:key", async (c) => {
    const body = await c.req.json<{
      label?: string;
      subject?: string;
      html?: string;
      text?: string | null;
    }>();
    await ensureEmailTemplates();
    const template = await updateEmailTemplateByKey(c.req.param("key"), body);
    return c.json({ template });
  });

  platform.post("/email-templates/:key/test", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ to?: string; vars?: Record<string, string> }>();
    const to = body.to?.trim() || session.email;
    await ensureEmailTemplates();
    await sendTemplatedEmail({
      key: c.req.param("key"),
      to,
      vars: body.vars,
    });
    return c.json({ ok: true, sentTo: to });
  });

  platform.post("/email-templates/preview", async (c) => {
    const body = await c.req.json<{
      subject: string;
      html: string;
      vars?: Record<string, string>;
    }>();
    const vars = body.vars ?? {};
    return c.json({
      subject: renderTemplate(body.subject, vars),
      html: renderTemplate(body.html, vars),
    });
  });
}
