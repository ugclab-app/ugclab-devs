import { getGoPayApiBase, isGoPayTestingMode } from "./config.js";
import { newGoPayNonce, signGoPayPayload } from "./sign.js";

export type GoPayCreatePaymentInput = {
  orderId: string;
  amountMinor: number;
  description?: string;
  successUrl: string;
  failureUrl: string;
  callbackUrl?: string;
  lifetimeSeconds?: number;
  buyerEmail?: string;
};

export type GoPayPaymentData = {
  payment_id: string;
  order_id: string;
  amount: string;
  status: string;
  checkout_url: string;
  qr_url?: string;
  qr_data?: string;
  expires_at?: string;
};

type GoPayApiResponse<T> = {
  status: "OK" | "FAIL";
  code: string;
  error_message?: string;
  data?: T;
};

function formatGoPayAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function compactJson(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}

async function gopayRequest<T>(
  path: string,
  bodyObj: Record<string, unknown>
): Promise<T> {
  const apiKey = process.env.GOPAY_API_KEY?.trim();
  const secretKey = process.env.GOPAY_SECRET_KEY?.trim();
  if (!apiKey || !secretKey) {
    throw new Error("GoPay is not configured");
  }

  const body = compactJson(bodyObj);
  const nonce = newGoPayNonce();
  const signature = signGoPayPayload(body, nonce, secretKey);

  const res = await fetch(`${getGoPayApiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "GoPay-Api-Key": apiKey,
      "GoPay-Nonce": nonce,
      "GoPay-Signature": signature,
    },
    body,
  });

  const text = await res.text();
  let parsed: GoPayApiResponse<T>;
  try {
    parsed = JSON.parse(text) as GoPayApiResponse<T>;
  } catch {
    throw new Error(`GoPay invalid response (${res.status})`);
  }

  if (parsed.status !== "OK" || parsed.code !== "0000" || !parsed.data) {
    throw new Error(
      parsed.error_message ?? `GoPay error ${parsed.code ?? "unknown"}`
    );
  }

  return parsed.data;
}

export async function createGoPayPayment(
  input: GoPayCreatePaymentInput
): Promise<GoPayPaymentData> {
  if (input.orderId.length > 32) {
    throw new Error("GoPay order_id must be ≤ 32 characters");
  }

  const payload: Record<string, unknown> = {
    order_id: input.orderId,
    amount: formatGoPayAmount(input.amountMinor),
    description: (input.description ?? `Order ${input.orderId}`).slice(0, 255),
    success_url: input.successUrl,
    failure_url: input.failureUrl,
    lifetime: input.lifetimeSeconds ?? 3600,
  };

  if (input.callbackUrl) {
    payload.callback_url = input.callbackUrl;
  }
  if (input.buyerEmail) {
    payload.buyer = { email: input.buyerEmail };
  }
  if (isGoPayTestingMode()) {
    payload.testing_mode = true;
  }

  return gopayRequest<GoPayPaymentData>("/v1/payments", payload);
}

export async function queryGoPayPayment(opts: {
  paymentId?: string;
  orderId?: string;
}): Promise<GoPayPaymentData> {
  const body: Record<string, unknown> = {};
  if (opts.paymentId) body.payment_id = opts.paymentId;
  if (opts.orderId) body.order_id = opts.orderId;
  if (!opts.paymentId && !opts.orderId) {
    throw new Error("payment_id or order_id required");
  }
  return gopayRequest<GoPayPaymentData>("/v1/payments/query", body);
}
