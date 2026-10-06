/** Deep-merge locale bundle over English (missing keys fall back to EN). */
export function deepMergeAdmin<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T> | undefined
): T {
  if (!override) return base;
  const out = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const b = base[key];
    const o = override[key];
    if (
      o &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      b &&
      typeof b === "object" &&
      !Array.isArray(b)
    ) {
      out[key] = deepMergeAdmin(
        b as Record<string, unknown>,
        o as Record<string, unknown>
      ) as T[keyof T];
    } else if (o !== undefined) {
      out[key] = o as T[keyof T];
    }
  }
  return out;
}

export function createAdminTa(admin: Record<string, unknown>) {
  return function ta(
    path: string,
    vars?: Record<string, string | number>
  ): string {
    const parts = path.split(".");
    let cur: unknown = admin;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as object)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return path;
      }
    }
    let s = typeof cur === "string" ? cur : path;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return s;
  };
}
