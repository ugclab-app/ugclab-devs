/** Platform MoR payout rules (env). */
export function getMorPayoutMinCents(): number {
  const raw = process.env.MOR_MIN_PAYOUT_CENTS ?? "5000";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

/** Human label, e.g. "Weekly (Mondays)" */
export function getMorPayoutScheduleLabel(): string {
  return (
    process.env.MOR_PAYOUT_SCHEDULE?.trim() ||
    "Processed manually; typical schedule: weekly"
  );
}

export function assertMorPayoutAmount(amountCents: number): string | null {
  const min = getMorPayoutMinCents();
  if (amountCents < min) {
    return `Minimum payout is ${min / 100} (set MOR_MIN_PAYOUT_CENTS)`;
  }
  return null;
}
