import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./session.js";
import {
  hasPlatformPermission,
  type PlatformPermission,
} from "../lib/platform-permissions.js";

export function requirePlatformPerm(permission: PlatformPermission) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const session = c.get("session");
    if (!hasPlatformPermission(session.role, permission)) {
      return c.json({ error: "Forbidden — insufficient permissions" }, 403);
    }
    await next();
  });
}
