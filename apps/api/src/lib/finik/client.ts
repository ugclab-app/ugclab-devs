import { randomUUID } from "node:crypto";
import { Signer } from "@mancho.devs/authorizer";
import {
  getFinikApiBase,
  getFinikPrivatePem,
  isFinikConfigured,
} from "./config.js";

export type FinikCreatePaymentInput = {
  /** Unique payment id ≤ 36 chars (UUID). */
  paymentId: string;
  /** Amount in major units (soms), not tyiyn. */
  amountMajor: number;
  redirectUrl: string;
  webhookUrl: string;
  accountId: string;
  nameEn: string;
  description?: string;
  lang?: "ky" | "ru" | "en";
  additionalData?: Array<{
    fieldId: string;
    name: string;
    value?: string;
    isHidden?: boolean;
  }>;
};

export function newFinikPaymentId(): string {
  return randomUUID();
}

export async function createFinikPayment(
  input: FinikCreatePaymentInput
): Promise<{ paymentUrl: string; paymentId: string }> {
  if (!isFinikConfigured()) {
    throw new Error("Finik is not configured");
  }
  const apiKey = process.env.FINIK_API_KEY!.trim();
  const privateKey = getFinikPrivatePem()!;
  const baseUrl = getFinikApiBase();
  const host = new URL(baseUrl).host;
  const path = "/v1/payment";
  const timestamp = Date.now().toString();

  if (input.paymentId.length > 36) {
    throw new Error("Finik PaymentId must be ≤ 36 characters");
  }
  if (!(input.amountMajor > 0)) {
    throw new Error("Finik Amount must be greater than 0");
  }

  const body: Record<string, unknown> = {
    Amount: Math.round(input.amountMajor * 100) / 100,
    CardType: "FINIK_QR",
    PaymentId: input.paymentId,
    RedirectUrl: input.redirectUrl,
    Currency: "KGS",
    Data: {
      accountId: input.accountId,
      name_en: input.nameEn.slice(0, 120),
      webhookUrl: input.webhookUrl,
      ...(input.description
        ? { description: input.description.slice(0, 500) }
        : {}),
      ...(input.additionalData?.length
        ? { additionalData: input.additionalData }
        : {}),
    },
  };
  if (input.lang) body.Lang = input.lang;

  const requestData = {
    httpMethod: "POST",
    path,
    headers: {
      Host: host,
      "x-api-key": apiKey,
      "x-api-timestamp": timestamp,
    },
    queryStringParameters: null as null,
    body,
  };

  const signature = await new Signer(requestData).sign(privateKey);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-api-timestamp": timestamp,
      signature,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });

  if (res.status === 302 || res.status === 301 || res.status === 303) {
    const paymentUrl = res.headers.get("location");
    if (!paymentUrl) {
      throw new Error("Finik redirect missing Location header");
    }
    return { paymentUrl, paymentId: input.paymentId };
  }

  const text = await res.text();
  let message = text.slice(0, 300);
  try {
    const err = JSON.parse(text) as { ErrorMessage?: string; StatusCode?: number };
    if (err.ErrorMessage) message = err.ErrorMessage;
  } catch {
    /* keep text */
  }
  throw new Error(`Finik create payment failed (${res.status}): ${message}`);
}
