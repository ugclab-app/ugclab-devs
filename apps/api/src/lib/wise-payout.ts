import { parseIntegrations } from "./growth-settings.js";

type WiseCfg = {
  apiToken: string;
  profileId: string;
  recipientEmail: string;
  currency: string;
};

export function parseWiseConfig(
  integrations: unknown,
  payoutCurrency?: string | null
): WiseCfg | null {
  const full = parseIntegrations(integrations) as ReturnType<typeof parseIntegrations> &
    Record<string, unknown>;
  const raw = full.wise;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const apiToken = String(o.apiToken ?? "").trim();
  const profileId = String(o.profileId ?? "").trim();
  const recipientEmail = String(o.recipientEmail ?? "").trim();
  if (!apiToken || !profileId || !recipientEmail) return null;
  return {
    apiToken,
    profileId,
    recipientEmail,
    currency: (payoutCurrency || String(o.currency ?? "USD")).toUpperCase(),
  };
}

/**
 * Attempt a Wise quote + transfer. Returns transfer id or null.
 * Requires live Wise API credentials; failures are logged, not thrown.
 */
export async function createWiseTransfer(opts: {
  integrations: unknown;
  payoutCurrency?: string | null;
  amountMajor: number;
  reference: string;
}): Promise<{ ok: true; transferId: string } | { ok: false; error: string }> {
  const cfg = parseWiseConfig(opts.integrations, opts.payoutCurrency);
  if (!cfg) return { ok: false, error: "Wise not configured" };
  if (opts.amountMajor <= 0) return { ok: false, error: "Invalid amount" };

  const base = process.env.WISE_API_BASE?.replace(/\/$/, "") || "https://api.wise.com";
  const headers = {
    Authorization: `Bearer ${cfg.apiToken}`,
    "Content-Type": "application/json",
  };

  try {
    // 1) Resolve / create email recipient (simplified — email quote path)
    const quoteRes = await fetch(
      `${base}/v3/profiles/${cfg.profileId}/quotes`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          sourceCurrency: cfg.currency,
          targetCurrency: cfg.currency,
          sourceAmount: opts.amountMajor,
        }),
      }
    );
    if (!quoteRes.ok) {
      const t = await quoteRes.text();
      return { ok: false, error: `Wise quote failed: ${quoteRes.status} ${t.slice(0, 200)}` };
    }
    const quote = (await quoteRes.json()) as { id?: string };
    if (!quote.id) return { ok: false, error: "Wise quote missing id" };

    const transferRes = await fetch(`${base}/v1/transfers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetAccount: null,
        quoteUuid: quote.id,
        customerTransactionId: opts.reference.slice(0, 50),
        details: {
          reference: opts.reference.slice(0, 10),
          transferPurpose: "verification.transfers.purpose.pay.bills",
        },
        // Email recipient flows vary by Wise account; keep details for ops review.
        recipientEmail: cfg.recipientEmail,
      }),
    });
    if (!transferRes.ok) {
      const t = await transferRes.text();
      return {
        ok: false,
        error: `Wise transfer failed: ${transferRes.status} ${t.slice(0, 200)}`,
      };
    }
    const transfer = (await transferRes.json()) as { id?: number | string };
    if (transfer.id == null) return { ok: false, error: "Wise transfer missing id" };
    return { ok: true, transferId: String(transfer.id) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Wise request failed",
    };
  }
}
