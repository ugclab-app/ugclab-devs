import { createHash } from "node:crypto";
import { prisma } from "@ugclab/database";
import { sendEmail } from "./email.js";

function card(title: string, inner: string) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f3fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3fb;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td style="background:#5b21b6;padding:28px 32px;">
<p style="margin:0;font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#ffffff;">${title}</p>
</td></tr>
<tr><td style="padding:28px 32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3f3f46;">
${inner}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function ownerOf(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { owner: { select: { email: true, name: true } } },
  });
  if (!tenant?.owner?.email) return null;
  return tenant;
}

export async function notifyStoreSuspended(tenantId: string) {
  const tenant = await ownerOf(tenantId);
  if (!tenant) return;
  const name = tenant.owner.name?.trim() || "there";
  await sendEmail({
    to: tenant.owner.email,
    subject: `${tenant.name} is paused`,
    html: card(
      "Your store is paused",
      `<p style="margin:0 0 12px;">Hi ${name},</p>
       <p style="margin:0 0 12px;"><strong>${tenant.name}</strong> is paused. The storefront is hidden until it is opened again.</p>
       <p style="margin:0;">Your products, orders, and balance are still there. Reply to this email if you did not expect this.</p>`
    ),
    text: `${tenant.name} is paused. The storefront is hidden. Your products, orders, and balance are still there.`,
  });
}

export async function notifyDomainConnected(tenantId: string, domain: string) {
  const tenant = await ownerOf(tenantId);
  if (!tenant) return;
  await sendEmail({
    to: tenant.owner.email,
    subject: `${domain} is connected`,
    html: card(
      "Your domain is connected",
      `<p style="margin:0 0 12px;"><strong>${domain}</strong> now opens <strong>${tenant.name}</strong>.</p>
       <p style="margin:0;">Give DNS a few minutes if the address does not load on the first try.</p>`
    ),
    text: `${domain} is connected to ${tenant.name}.`,
  });
}

export async function notifyDomainCheckFailed(tenantId: string, domain: string) {
  const tenant = await ownerOf(tenantId);
  if (!tenant) return;
  await sendEmail({
    to: tenant.owner.email,
    subject: `${domain} is not verified yet`,
    html: card(
      "Domain check did not pass",
      `<p style="margin:0 0 12px;">We looked up the TXT record for <strong>${domain}</strong> and it does not match yet.</p>
       <p style="margin:0;">Add the record at your registrar, wait a few minutes, and check again from the dashboard. We will not send this again for 24 hours.</p>`
    ),
    text: `The TXT record for ${domain} does not match yet. Add it at your registrar and check again.`,
  });
}

export async function notifyOwnerOrderCancelled(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, tenantId: true, totalAmount: true, currency: true },
  });
  if (!order) return;
  const tenant = await ownerOf(order.tenantId);
  if (!tenant) return;
  const amount = (order.totalAmount / 100).toFixed(2);
  await sendEmail({
    to: tenant.owner.email,
    subject: `Order #${order.orderNumber} was cancelled`,
    html: card(
      "An order was cancelled",
      `<p style="margin:0;">Order <strong>#${order.orderNumber}</strong> for ${tenant.name} was cancelled (${amount} ${order.currency}). Reserved stock is released.</p>`
    ),
    text: `Order #${order.orderNumber} for ${tenant.name} was cancelled (${amount} ${order.currency}).`,
  });
}

export async function notifyProductSoldOut(tenantId: string, productTitle: string) {
  const tenant = await ownerOf(tenantId);
  if (!tenant) return;
  await sendEmail({
    to: tenant.owner.email,
    subject: `${productTitle} is sold out`,
    html: card(
      "A product just sold out",
      `<p style="margin:0 0 12px;"><strong>${productTitle}</strong> in ${tenant.name} is now at zero.</p>
       <p style="margin:0;">Buyers can still see it, but they cannot buy it until you add stock.</p>`
    ),
    text: `${productTitle} in ${tenant.name} is sold out.`,
  });
}

export async function noticeNewOwnerDevice(userId: string, userAgent: string | null) {
  const owns = await prisma.tenant.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (!owns) return;

  const raw = (userAgent ?? "unknown").slice(0, 300);
  const fingerprint = createHash("sha256").update(raw).digest("hex").slice(0, 32);
  const seen = await prisma.userKnownDevice.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
  });
  if (seen) return;

  const prior = await prisma.userKnownDevice.count({ where: { userId } });
  await prisma.userKnownDevice.create({
    data: { userId, fingerprint, userAgent: raw },
  });
  if (prior === 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return;
  await sendEmail({
    to: user.email,
    subject: "New sign-in to your store",
    html: card(
      "New browser signed in",
      `<p style="margin:0 0 12px;">Someone signed in to the merchant admin from a browser we have not seen on this account.</p>
       <p style="margin:0;">If this was you, you can ignore this email. If it was not, reset your password.</p>`
    ),
    text: "Someone signed in to the merchant admin from a new browser. If it was not you, reset your password.",
  });
}

export async function notifyStaffJoined(
  tenantId: string,
  staffEmail: string,
  staffName: string | null
) {
  const tenant = await ownerOf(tenantId);
  if (!tenant) return;
  if (tenant.owner.email.toLowerCase() === staffEmail.toLowerCase()) return;
  const who = staffName?.trim() || staffEmail;
  await sendEmail({
    to: tenant.owner.email,
    subject: `${who} joined ${tenant.name}`,
    html: card(
      "A teammate joined your store",
      `<p style="margin:0;">${who} (${staffEmail}) accepted the invite and can open the admin for <strong>${tenant.name}</strong>.</p>`
    ),
    text: `${who} (${staffEmail}) accepted the invite for ${tenant.name}.`,
  });
}

export async function notifyPasswordChanged(email: string) {
  await sendEmail({
    to: email,
    subject: "Your password was changed",
    html: card(
      "Password changed",
      `<p style="margin:0 0 12px;">The password for <strong>${email}</strong> was just changed.</p>
       <p style="margin:0;">If this was you, you can ignore this email. If it was not, reset the password again and reply to us.</p>`
    ),
    text: `The password for ${email} was just changed. If this was not you, reset it again.`,
  });
}
