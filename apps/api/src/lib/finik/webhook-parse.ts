export type FinikWebhookPayload = {
  id?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  fields?: {
    paymentId?: string;
    orderId?: string;
    amount?: number;
    [key: string]: unknown;
  };
  data?: {
    accountId?: string;
    webhookUrl?: string;
    name_en?: string;
  };
};

export function parseFinikWebhook(rawBody: string): FinikWebhookPayload {
  return JSON.parse(rawBody) as FinikWebhookPayload;
}

export function isFinikSuccessStatus(status: string | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "success" || s === "succeeded" || s === "ok";
}

export function finikWebhookEventId(payload: FinikWebhookPayload): string {
  return (
    payload.transactionId ||
    payload.id ||
    payload.fields?.paymentId ||
    `finik-${Date.now()}`
  );
}

export function extractFinikPaymentIds(payload: FinikWebhookPayload): {
  paymentId?: string;
  orderIdFromFields?: string;
  amountMajor?: number;
} {
  const paymentId =
    (typeof payload.fields?.paymentId === "string"
      ? payload.fields.paymentId
      : undefined) ??
    (typeof payload.transactionId === "string"
      ? payload.transactionId
      : undefined);

  const orderIdFromFields =
    typeof payload.fields?.orderId === "string"
      ? payload.fields.orderId
      : undefined;

  const amountMajor =
    typeof payload.amount === "number"
      ? payload.amount
      : typeof payload.fields?.amount === "number"
        ? payload.fields.amount
        : undefined;

  return { paymentId, orderIdFromFields, amountMajor };
}
