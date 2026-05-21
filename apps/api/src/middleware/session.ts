import { createMiddleware } from "hono/factory";
import { getSessionToken, verifySession } from "../lib/auth-token.js";
import type { SessionPayload } from "../lib/auth-token.js";

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
  const session = await verifySession(token);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", session);
  await next();
});
