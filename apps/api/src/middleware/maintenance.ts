import { createMiddleware } from "hono/factory";
import { getPlatformSettings } from "../lib/platform-settings.js";

/** Blocks merchant API when platform maintenance mode is on. */
export const merchantMaintenanceGuard = createMiddleware(async (c, next) => {
  const settings = await getPlatformSettings();
  if (settings.maintenanceMode) {
    return c.json(
      {
        error: "Platform maintenance",
        message:
          settings.maintenanceMessage ||
          "The platform is temporarily unavailable. Please try again later.",
      },
      503
    );
  }
  await next();
});
