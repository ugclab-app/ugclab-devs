/** Pure run-rate forecast; kept Prisma-free so it can be unit-tested. */

export type ForecastInput = {
  inventory: number | null;
  unitsSold: number;
  windowDays: number;
};

export type Forecast = {
  /** Average units sold per day over the window. */
  dailyRate: number;
  /** Whole days until stock hits zero at the current rate; null when there is no sales signal. */
  daysLeft: number | null;
  runOutAt: Date | null;
  level: "out" | "critical" | "warning" | "ok" | "unknown";
};

export function forecastDaysLeft(input: ForecastInput, now = new Date()): Forecast {
  const inv = input.inventory ?? 0;
  const dailyRate = input.windowDays > 0 ? input.unitsSold / input.windowDays : 0;
  if (inv <= 0) {
    return { dailyRate, daysLeft: 0, runOutAt: now, level: "out" };
  }
  if (dailyRate <= 0) {
    return { dailyRate: 0, daysLeft: null, runOutAt: null, level: "unknown" };
  }
  const daysLeft = Math.floor(inv / dailyRate);
  const runOutAt = new Date(now.getTime() + daysLeft * 86_400_000);
  const level = daysLeft <= 7 ? "critical" : daysLeft <= 21 ? "warning" : "ok";
  return { dailyRate, daysLeft, runOutAt, level };
}
