import { emailMerchantAboutOrder } from "./transactional-email.js";
import { notifyTelegramNewOrder } from "./telegram-bot.js";

export async function notifyMerchantNewOrder(orderId: string) {
  await emailMerchantAboutOrder(orderId, "merchantPaid");
  await notifyTelegramNewOrder(orderId).catch(() => {});
}

export async function notifyMerchantPendingOrder(orderId: string) {
  await emailMerchantAboutOrder(orderId, "merchantPending");
}
