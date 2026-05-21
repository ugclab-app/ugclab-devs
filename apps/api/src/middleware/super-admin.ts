import { createMiddleware } from "hono/factory";
import { UserRole } from "@ugclab/database";
import type { AuthEnv } from "./session.js";
import { getSessionToken, verifySession } from "../lib/auth-token.js";

export const requireSuperAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = await verifySession(token);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (session.role !== UserRole.SUPER_ADMIN) {
    return c.json({ error: "Forbidden — platform admin only" }, 403);
  }
  c.set("session", session);
  await next();
});
