/** GoPay KG — https://doc.gopay.kg/v1/ */
export function getGoPayApiBase(): string {
  return (process.env.GOPAY_API_BASE ?? "https://api.gopay.kg").replace(/\/$/, "");
}

export function isGoPayConfigured(): boolean {
  return Boolean(
    process.env.GOPAY_API_KEY?.trim() && process.env.GOPAY_SECRET_KEY?.trim()
  );
}

export function getGoPayWebhookSecret(): string | null {
  const s = process.env.GOPAY_WEBHOOK_SECRET?.trim();
  return s || process.env.GOPAY_SECRET_KEY?.trim() || null;
}

export function isGoPayTestingMode(): boolean {
  return process.env.GOPAY_TESTING_MODE === "true" || process.env.GOPAY_TESTING_MODE === "1";
}

/** Use GoPay when store currency is KGS and keys are set. */
export function shouldUseGoPayCheckout(currency: string): boolean {
  return isGoPayConfigured() && currency.toUpperCase() === "KGS";
}
