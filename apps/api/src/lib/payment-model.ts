/** Platform payment model: connect (Stripe Connect per merchant) or mor (platform collects all). */
export type PaymentModel = "connect" | "mor";

export function getPaymentModel(): PaymentModel {
  const raw = (process.env.PAYMENT_MODEL ?? "mor").toLowerCase().trim();
  return raw === "connect" ? "connect" : "mor";
}

export function isMorPaymentModel(): boolean {
  return getPaymentModel() === "mor";
}

export function isConnectPaymentModel(): boolean {
  return getPaymentModel() === "connect";
}
