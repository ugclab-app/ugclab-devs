import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./session.js";
import { getSessionToken } from "../lib/auth-token.js";
import { resolveSession } from "../lib/session-resolve.js";
import { getPlatformSettings } from "../lib/platform-settings.js";
import { isPlatformStaff } from "../lib/platform-permissions.js";

/** Any platform staff role (SUPER_ADMIN, OPS, SUPPORT, FINANCE). */
export const requireSuperAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = await resolveSession(token);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!isPlatformStaff(session.role)) {
    return c.json({ error: "Forbidden — platform staff only" }, 403);
  }

  const settings = await getPlatformSettings();
  if (settings.adminIpAllowlist.length > 0) {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "";
    if (!ip || !settings.adminIpAllowlist.includes(ip)) {
      return c.json({ error: "IP not allowed for platform admin" }, 403);
    }
  }

  c.set("session", session);
  await next();
});
