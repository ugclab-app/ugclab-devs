/** Finik amounts are in major units (soms); Order.totalAmount is minor (tyiyn). */

export function finikAmountToMinor(amountMajor: number): number {
  return Math.round(Number(amountMajor) * 100);
}

export function orderAmountMatchesFinik(opts: {
  orderTotalMinor: number;
  finikAmountMajor: number | undefined | null;
  /** Allowed difference in tyiyn (default 1). */
  toleranceMinor?: number;
}): boolean {
  if (
    opts.finikAmountMajor === undefined ||
    opts.finikAmountMajor === null ||
    Number.isNaN(Number(opts.finikAmountMajor))
  ) {
    return false;
  }
  const expected = finikAmountToMinor(Number(opts.finikAmountMajor));
  const tol = opts.toleranceMinor ?? 1;
  return Math.abs(expected - opts.orderTotalMinor) <= tol;
}
