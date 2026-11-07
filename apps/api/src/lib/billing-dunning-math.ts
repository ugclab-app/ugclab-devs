/** Pure dunning schedule helpers (no Prisma). */

/** Days after entering past_due before each reminder step (0-indexed gaps). */
export const DUNNING_GAPS_DAYS = [0, 3, 7] as const;

export function nextDunningStep(
  currentStep: number,
  lastAt: Date | null,
  now = new Date()
): number | null {
  if (currentStep >= DUNNING_GAPS_DAYS.length) return null;
  if (currentStep === 0 && !lastAt) return 1;
  if (!lastAt) return currentStep + 1;
  const gap = DUNNING_GAPS_DAYS[currentStep] ?? 7;
  const prevGap = currentStep === 0 ? 0 : (DUNNING_GAPS_DAYS[currentStep - 1] ?? 0);
  const waitMs = (gap - prevGap) * 24 * 60 * 60 * 1000;
  if (now.getTime() - lastAt.getTime() < waitMs) return null;
  return currentStep + 1;
}
