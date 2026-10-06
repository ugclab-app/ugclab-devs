/** Lightweight heuristic risk score (0–100). Stripe Radar can override later. */
export function computeOrderRiskScore(input: {
  email: string;
  totalAmount: number;
  country: string;
  hasPhysical: boolean;
  shippingPostal?: string | null;
  billingMatchesShipping?: boolean;
  isNewCustomer?: boolean;
  isB2b?: boolean;
}): { score: number; level: "low" | "medium" | "high"; hold: boolean } {
  let score = 5;
  const email = input.email.toLowerCase();

  if (/@(mailinator|guerrillamail|tempmail|10minutemail)\./i.test(email)) score += 40;
  const localPart = email.split("@")[0] ?? "";
  if (!email.includes("@") || localPart.length < 2) score += 20;
  if (input.totalAmount >= 50_000) score += 25;
  else if (input.totalAmount >= 20_000) score += 12;
  if (input.isNewCustomer) score += 8;
  if (input.hasPhysical && !input.shippingPostal) score += 15;
  if (input.billingMatchesShipping === false) score += 10;
  if (["NG", "GH", "PK"].includes(input.country)) score += 5;
  if (input.isB2b) score = Math.max(0, score - 15);

  score = Math.min(100, Math.max(0, score));
  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  const hold = level === "high";
  return { score, level, hold };
}
