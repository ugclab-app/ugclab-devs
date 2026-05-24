import { prisma } from "@ugclab/database";

export type PlatformSettingsDto = {
  defaultPlatformFeeBps: number;
  defaultTrialDays: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  requireSuperAdmin2fa: boolean;
  adminIpAllowlist: string[];
  scheduledReportEmail: string | null;
  scheduledReportsEnabled: boolean;
};

const DEFAULTS: PlatformSettingsDto = {
  defaultPlatformFeeBps: 500,
  defaultTrialDays: 14,
  maintenanceMode: false,
  maintenanceMessage: "",
  requireSuperAdmin2fa: false,
  adminIpAllowlist: [],
  scheduledReportEmail: null,
  scheduledReportsEnabled: false,
};

export async function getPlatformSettings(): Promise<PlatformSettingsDto> {
  const rows = await prisma.platformSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    defaultPlatformFeeBps: num(map.get("defaultPlatformFeeBps"), DEFAULTS.defaultPlatformFeeBps),
    defaultTrialDays: num(map.get("defaultTrialDays"), DEFAULTS.defaultTrialDays),
    maintenanceMode: bool(map.get("maintenanceMode"), false),
    maintenanceMessage: str(map.get("maintenanceMessage")) ?? "",
    requireSuperAdmin2fa: bool(map.get("requireSuperAdmin2fa"), false),
    adminIpAllowlist: stringArray(map.get("adminIpAllowlist")),
    scheduledReportEmail: str(map.get("scheduledReportEmail")),
    scheduledReportsEnabled: bool(map.get("scheduledReportsEnabled"), false),
  };
}

export async function setPlatformSetting(key: string, value: unknown) {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

export async function patchPlatformSettings(patch: Partial<PlatformSettingsDto>) {
  const entries: [string, unknown][] = [];
  if (patch.defaultPlatformFeeBps !== undefined) {
    entries.push(["defaultPlatformFeeBps", patch.defaultPlatformFeeBps]);
  }
  if (patch.defaultTrialDays !== undefined) {
    entries.push(["defaultTrialDays", patch.defaultTrialDays]);
  }
  if (patch.maintenanceMode !== undefined) {
    entries.push(["maintenanceMode", patch.maintenanceMode]);
  }
  if (patch.maintenanceMessage !== undefined) {
    entries.push(["maintenanceMessage", patch.maintenanceMessage]);
  }
  if (patch.requireSuperAdmin2fa !== undefined) {
    entries.push(["requireSuperAdmin2fa", patch.requireSuperAdmin2fa]);
  }
  if (patch.adminIpAllowlist !== undefined) {
    entries.push(["adminIpAllowlist", patch.adminIpAllowlist]);
  }
  if (patch.scheduledReportEmail !== undefined) {
    entries.push(["scheduledReportEmail", patch.scheduledReportEmail]);
  }
  if (patch.scheduledReportsEnabled !== undefined) {
    entries.push(["scheduledReportsEnabled", patch.scheduledReportsEnabled]);
  }
  for (const [key, value] of entries) {
    await setPlatformSetting(key, value);
  }
  return getPlatformSettings();
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
