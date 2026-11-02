/** Pop one license key from a newline-separated pool; returns [key, remainingPool]. */
export function takeLicenseKey(
  pool: string | null | undefined
): { key: string | null; remaining: string | null } {
  const lines = String(pool ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { key: null, remaining: null };
  const [key, ...rest] = lines;
  return { key: key ?? null, remaining: rest.length ? rest.join("\n") : "" };
}
