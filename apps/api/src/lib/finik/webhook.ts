import { Signer } from "@mancho.devs/authorizer";
import { prisma } from "@ugclab/database";
import { fulfillPaidOrder } from "../fulfill-order.js";
import { orderAmountMatchesFinik } from "./amount.js";
import { getFinikWebhookPublicPems } from "./config.js";
import { resolveWebhookHostCandidates } from "./webhook-host.js";
import {
  extractFinikPaymentIds,
  isFinikSuccessStatus,
  parseFinikWebhook,
  type FinikWebhookPayload,
} from "./webhook-parse.js";

export type { FinikWebhookPayload };
export {
  extractFinikPaymentIds,
  finikWebhookEventId,
  isFinikSuccessStatus,
  parseFinikWebhook,
} from "./webhook-parse.js";

async function verifyWithKey(
  requestData: {
    body: Record<string, unknown>;
    httpMethod: string;
    path: string;
    headers: Record<string, string>;
    queryStringParameters: null;
  },
  publicKey: string,
  signature: string
): Promise<boolean> {
  try {
    return await new Signer(requestData).verify(publicKey, signature);
  } catch {
    return false;
  }
}

export async function verifyFinikWebhookSignature(opts: {
  rawBody: string;
  signature: string | undefined;
  timestamp: string | undefined;
  path: string;
  host?: string | null;
  forwardedHost?: string | null;
  originalHost?: string | null;
}): Promise<boolean> {
  if (!opts.signature) return false;
  const keys = getFinikWebhookPublicPems();
  if (!keys.length) return false;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(opts.rawBody) as Record<string, unknown>;
  } catch {
    return false;
  }

  const hosts = resolveWebhookHostCandidates({
    host: opts.host,
    forwardedHost: opts.forwardedHost,
    originalHost: opts.originalHost,
    publicApiUrl: process.env.API_PUBLIC_URL ?? process.env.API_URL,
  });
  if (!hosts.length) return false;

  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;

  for (const host of hosts) {
    const headers: Record<string, string> = { Host: host };
    if (opts.timestamp) {
      headers["x-api-timestamp"] = opts.timestamp;
    }
    const requestData = {
      body,
      httpMethod: "POST",
      path,
      headers,
      queryStringParameters: null as null,
    };
    for (const key of keys) {
      if (await verifyWithKey(requestData, key, opts.signature)) {
        return true;
      }
    }
  }

  return false;
}

export async function handleFinikWebhook(rawBody: string): Promise<void> {
  const payload = parseFinikWebhook(rawBody);
  if (!isFinikSuccessStatus(payload.status)) {
    return;
  }

  const { paymentId, orderIdFromFields, amountMajor } =
    extractFinikPaymentIds(payload);

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(paymentId ? [{ finikPaymentId: paymentId }] : []),
        ...(orderIdFromFields ? [{ id: orderIdFromFields }] : []),
      ],
    },
  });

  if (!order) {
    console.warn("[finik webhook] order not found", {
      paymentId,
      orderIdFromFields,
      transactionId: payload.transactionId,
    });
    return;
  }

  if (
    !orderAmountMatchesFinik({
      orderTotalMinor: order.totalAmount,
      finikAmountMajor: amountMajor,
    })
  ) {
    console.error("[finik webhook] amount mismatch", {
      orderId: order.id,
      orderTotalMinor: order.totalAmount,
      finikAmountMajor: amountMajor,
    });
    throw new Error("Finik webhook amount mismatch");
  }

  await fulfillPaidOrder(order.id, {
    platformFeeAmount: order.platformFeeAmount,
  });

  if (payload.transactionId && !order.finikTransactionId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { finikTransactionId: payload.transactionId },
    });
  }

  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: "Payment received via Finik",
      meta: {
        finikPaymentId: paymentId ?? order.finikPaymentId,
        finikTransactionId: payload.transactionId ?? null,
        amountMajor: amountMajor ?? null,
      },
    },
  });
}
