import { OrderStatus, prisma } from "@ugclab/database";
import { MERCHANT_WEB_URL } from "../env.js";
import { ensureEmailTemplates, sendTemplatedEmail } from "./email-templates.js";

const DAY = 24 * 60 * 60 * 1000;
let lastNudgeDay = "";

/** One email to stores that signed up recently and still have no product and no paid order. */
export async function processActivationNudges() {
  const day = new Date().toISOString().slice(0, 10);
  if (lastNudgeDay === day) return { sent: 0 };
  lastNudgeDay = day;

  const now = Date.now();
  const tenants = await prisma.tenant.findMany({
    where: {
      activationNudgeSentAt: null,
      createdAt: { lte: new Date(now - 3 * DAY), gte: new Date(now - 14 * DAY) },
      products: { none: {} },
      orders: { none: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } } },
    },
    include: { owner: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  await ensureEmailTemplates();
  let sent = 0;
  for (const tenant of tenants) {
    const to = tenant.owner.email;
    if (!to) continue;
    try {
      await sendTemplatedEmail({
        key: "merchant_activation_nudge",
        to,
        vars: {
          name: tenant.owner.name || "there",
          storeName: tenant.name,
          adminUrl: MERCHANT_WEB_URL,
        },
      });
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { activationNudgeSentAt: new Date() },
      });
      sent += 1;
    } catch (err) {
      console.error("[activation-nudge]", tenant.id, err);
    }
  }
  return { sent };
}
