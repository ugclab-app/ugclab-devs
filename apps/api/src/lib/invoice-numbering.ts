import type { prisma } from "@ugclab/database";

export const INVOICE_PAD = 6;

/** "INV-" + 42 → "INV-000042". Prefix may be empty. */
export function formatInvoiceNumber(prefix: string | null | undefined, n: number): string {
  return `${(prefix ?? "").trim()}${String(Math.max(1, Math.trunc(n))).padStart(INVOICE_PAD, "0")}`;
}

type Tx = Pick<typeof prisma, "storeSettings" | "order">;

/**
 * Assign the next sequential number to a paid order. Atomic via the single-row
 * increment on StoreSettings, so concurrent payments never share a number.
 * No-op when the merchant has not configured a prefix or the order already has one.
 */
export async function assignInvoiceNumber(
  tx: Tx,
  order: { id: string; tenantId: string; invoiceNumber: string | null }
): Promise<string | null> {
  if (order.invoiceNumber) return order.invoiceNumber;
  const settings = await tx.storeSettings.findUnique({
    where: { tenantId: order.tenantId },
    select: { invoicePrefix: true },
  });
  if (settings?.invoicePrefix == null) return null;
  const bumped = await tx.storeSettings.update({
    where: { tenantId: order.tenantId },
    data: { invoiceNextNumber: { increment: 1 } },
    select: { invoiceNextNumber: true },
  });
  const number = formatInvoiceNumber(settings.invoicePrefix, bumped.invoiceNextNumber - 1);
  await tx.order.update({ where: { id: order.id }, data: { invoiceNumber: number } });
  return number;
}
