import { prisma } from "@ugclab/database";
import { sendEmail, type SendEmailParams } from "./email.js";

function defaultFromAddress(): string {
  const raw = process.env.EMAIL_FROM ?? "orders@ugclab.store";
  const match = raw.match(/<([^>]+)>/);
  return match?.[1] ?? raw;
}

export function formatEmailFrom(displayName: string, fromAddress?: string) {
  const addr = fromAddress ?? defaultFromAddress();
  const safeName = displayName.replace(/"/g, "'");
  return `${safeName} <${addr}>`;
}

export async function resolveTenantEmailOptions(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      settings: {
        select: { emailFromName: true, emailReplyTo: true, emailDomain: true },
      },
    },
  });
  const displayName =
    tenant?.settings?.emailFromName?.trim() || tenant?.name || "Store";
  const domain = tenant?.settings?.emailDomain as
    | { status?: string; fromAddress?: string }
    | null
    | undefined;
  const verifiedFrom =
    domain?.status?.toLowerCase() === "verified" && domain.fromAddress
      ? domain.fromAddress
      : undefined;
  const from = formatEmailFrom(displayName, verifiedFrom);
  const replyTo = tenant?.settings?.emailReplyTo?.trim() || undefined;
  return { from, replyTo, displayName };
}

/** Transactional email to customers on behalf of a store. */
export async function sendStoreEmail(
  tenantId: string,
  params: SendEmailParams & { template?: string }
) {
  const { from, replyTo } = await resolveTenantEmailOptions(tenantId);
  await sendEmail({
    ...params,
    from,
    ...(replyTo ? { replyTo } : {}),
  });
}
