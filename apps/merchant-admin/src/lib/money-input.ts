export function centsToInput(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "";
  return (cents / 100).toFixed(2);
}
