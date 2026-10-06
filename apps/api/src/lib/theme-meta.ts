import { Prisma, prisma, type Prisma as PrismaTypes } from "@ugclab/database";
import {
  parseStoreTheme,
  resolveHomeBlocks,
  type StoreTheme,
} from "@ugclab/tenant/store-theme";
import { jsonForPrisma } from "./theme-json.js";

export type ThemeExperiment = {
  enabled?: boolean;
  trafficBPercent?: number;
  variantBTheme?: StoreTheme | null;
};

export function parseThemeExperiment(raw: unknown): ThemeExperiment {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pct = Number(o.trafficBPercent);
  return {
    enabled: o.enabled === true || o.enabled === "true",
    trafficBPercent: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 50,
    variantBTheme:
      o.variantBTheme != null ? parseStoreTheme(o.variantBTheme) : undefined,
  };
}

export function readThemeDraftMeta(raw: unknown): {
  publishAt: string | null;
  experiment: ThemeExperiment;
} {
  if (!raw || typeof raw !== "object") {
    return { publishAt: null, experiment: {} };
  }
  const o = raw as Record<string, unknown>;
  const publishAt =
    typeof o._publishAt === "string" && o._publishAt.trim()
      ? o._publishAt.trim()
      : null;
  return { publishAt, experiment: parseThemeExperiment(o._experiment) };
}

export function themeDraftWithMeta(
  theme: StoreTheme,
  meta: { publishAt?: string | null; experiment?: ThemeExperiment }
): PrismaTypes.InputJsonValue {
  const o = { ...jsonForPrisma(theme) } as Record<string, unknown>;
  if (meta.publishAt) o._publishAt = meta.publishAt;
  else delete o._publishAt;
  if (meta.experiment?.enabled || meta.experiment?.variantBTheme) {
    o._experiment = {
      enabled: meta.experiment.enabled === true,
      trafficBPercent: meta.experiment.trafficBPercent ?? 50,
      ...(meta.experiment.variantBTheme
        ? { variantBTheme: jsonForPrisma(meta.experiment.variantBTheme) }
        : {}),
    };
  } else {
    delete o._experiment;
  }
  return o as PrismaTypes.InputJsonValue;
}

function pushThemeVersion(
  history: unknown,
  snapshot: {
    id: string;
    label: string;
    savedAt: string;
    homeBlocks: unknown;
    globalBlocks?: unknown;
  }
) {
  const list = Array.isArray(history) ? [...history] : [];
  list.unshift(snapshot);
  return list.slice(0, 15);
}

/** Publish current themeDraft to live theme (clears scheduled publish time). */
export async function publishStoreTheme(tenantId: string) {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { theme: true, themeDraft: true },
  });
  if (!settings) throw new Error("Store settings not found");
  const draftRaw = settings.themeDraft ?? settings.theme;
  if (!draftRaw) throw new Error("Nothing to publish");

  const theme = parseStoreTheme(draftRaw);
  const meta = readThemeDraftMeta(draftRaw);
  const homeBlocks = theme.homeBlocks ?? resolveHomeBlocks(theme);
  const publishSnapshot = {
    id: `ver_${Date.now().toString(36)}`,
    label: `Published ${new Date().toLocaleDateString()}`,
    savedAt: new Date().toISOString(),
    homeBlocks,
    globalBlocks: theme.globalBlocks,
  };
  const themeWithHistory = parseStoreTheme({
    ...jsonForPrisma(theme),
    themeVersionHistory: pushThemeVersion(theme.themeVersionHistory, publishSnapshot),
  });
  const published = themeDraftWithMeta(themeWithHistory, {
    publishAt: null,
    experiment: meta.experiment?.enabled ? meta.experiment : undefined,
  });
  await prisma.storeSettings.update({
    where: { tenantId },
    data: {
      theme: published as PrismaTypes.InputJsonValue,
      themeDraft: published as PrismaTypes.InputJsonValue,
    },
  });
  return published;
}

export async function processScheduledThemePublish(limit = 40) {
  const rows = await prisma.storeSettings.findMany({
    where: { themeDraft: { not: Prisma.DbNull } },
    select: { tenantId: true, themeDraft: true },
    take: 500,
  });
  const now = Date.now();
  let published = 0;
  for (const row of rows) {
    const { publishAt } = readThemeDraftMeta(row.themeDraft);
    if (!publishAt) continue;
    const at = Date.parse(publishAt);
    if (!Number.isFinite(at) || at > now) continue;
    try {
      await publishStoreTheme(row.tenantId);
      published += 1;
      if (published >= limit) break;
    } catch (e) {
      console.error("[cron] theme publish", row.tenantId, e);
    }
  }
  return { published };
}
