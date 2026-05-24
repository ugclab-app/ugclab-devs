import { createMiddleware } from "hono/factory";
import { getSessionToken } from "../lib/auth-token.js";
import type { SessionPayload } from "../lib/auth-token.js";
import { resolveSession } from "../lib/session-resolve.js";

export type AuthEnv = {
  Variables: {
    session: SessionPayload;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = await resolveSession(token);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", session);
  await next();
});
