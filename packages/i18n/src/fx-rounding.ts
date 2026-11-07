export type FxRoundingRules = {
  /** round = Math.round; floor/ceil; nearest = round to step. */
  mode?: "round" | "floor" | "ceil" | "nearest";
  /** Used with nearest (e.g. 5 → 99 from 97). Defaults to 1. */
  step?: number;
};

export function parseFxRounding(raw: unknown): FxRoundingRules | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const mode = o.mode;
  if (mode !== "round" && mode !== "floor" && mode !== "ceil" && mode !== "nearest") {
    return null;
  }
  const step =
    typeof o.step === "number" && Number.isFinite(o.step) && o.step > 0
      ? Math.trunc(o.step)
      : undefined;
  return { mode, step };
}

/** Apply merchant FX rounding to a converted minor-unit amount. */
export function applyFxRounding(amountMinor: number, rules?: FxRoundingRules | null): number {
  if (!Number.isFinite(amountMinor)) return 0;
  if (!rules?.mode || rules.mode === "round") return Math.round(amountMinor);
  if (rules.mode === "floor") return Math.floor(amountMinor);
  if (rules.mode === "ceil") return Math.ceil(amountMinor);
  const step = Math.max(1, rules.step ?? 1);
  return Math.round(amountMinor / step) * step;
}
