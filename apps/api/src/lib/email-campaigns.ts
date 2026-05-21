import { EmailCampaignStatus, prisma } from "@ugclab/database";
import { sendEmail } from "./email.js";
import {
  buildCampaignEmail,
  buildPersonalizeContext,
  htmlToPlain,
} from "./campaign-personalize.js";
import { getSegmentRecipients, type CampaignSegment } from "./email-segments.js";
import { getStorefrontUrl } from "./storefront.js";

const DAILY_CAP = Number(process.env.MARKETING_DAILY_CAP_PER_TENANT ?? "2000");
const BULK_CONFIRM_THRESHOLD = 500;

function wrapShell(storeName: string, inner: string, storeUrl: string) {
  return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #18181b; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 12px; color: #71717a;">From ${storeName}</p>
  <div>${inner}</div>
  <p style="margin-top: 32px; font-size: 12px; color: #71717a;">
    <a href="${storeUrl}">Visit our store</a>
  </p>
</body>
</html>`;
}

export async function countSentToday(tenantId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const agg = await prisma.emailCampaign.aggregate({
    where: { tenantId, sentAt: { gte: start }, status: EmailCampaignStatus.SENT },
    _sum: { sentCount: true },
  });
  return agg._sum.sentCount ?? 0;
}

export async function sendEmailCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { tenant: true },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === EmailCampaignStatus.SENT) {
    throw new Error("Campaign already sent");
  }
  if (campaign.status === EmailCampaignStatus.SENDING) {
    throw new Error("Send in progress");
  }

  const sentToday = await countSentToday(campaign.tenantId);
  const recipients = await getSegmentRecipients(
    campaign.tenantId,
    campaign.segment as CampaignSegment,
    {
      collectionSlug: campaign.collectionSlug,
      productId: campaign.productId,
    }
  );

  if (recipients.length === 0) {
    throw new Error("No recipients in this segment");
  }
  if (recipients.length > BULK_CONFIRM_THRESHOLD) {
    /* UI should confirm; server allows if under daily cap */
  }
  if (sentToday + recipients.length > DAILY_CAP) {
    throw new Error(
      `Daily send limit (${DAILY_CAP}) would be exceeded. Sent today: ${sentToday}`
    );
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: EmailCampaignStatus.SENDING,
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
    },
  });

  const storeUrl = getStorefrontUrl(campaign.tenant.slug);
  const abPct = Math.min(50, Math.max(0, campaign.abTestPercent ?? 0));
  const abCount =
    campaign.subjectB && abPct > 0
      ? Math.floor((recipients.length * abPct) / 100)
      : 0;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]!;
    const useB = campaign.subjectB && i < abCount;
    const subject = useB ? campaign.subjectB! : campaign.subject;

    try {
      const ctx = await buildPersonalizeContext(
        campaign.tenantId,
        r.email,
        r.name,
        {
          discountCode: campaign.discountCode,
          utmCampaign: campaign.utmCampaign ?? campaign.id.slice(0, 8),
          campaignId: campaign.id,
        }
      );
      const { subject: subj, html, text } = await buildCampaignEmail(
        ctx,
        subject,
        campaign.bodyHtml,
        campaign.plainText
      );
      const fullHtml = wrapShell(campaign.tenant.name, html, storeUrl);
      await sendEmail({ to: r.email, subject: subj, html: fullHtml, text });
      sent += 1;
    } catch {
      failed += 1;
      await prisma.customer
        .updateMany({
          where: { tenantId: campaign.tenantId, email: r.email },
          data: { emailBounced: true },
        })
        .catch(() => {});
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status:
        failed === recipients.length && recipients.length > 0
          ? EmailCampaignStatus.FAILED
          : EmailCampaignStatus.SENT,
      sentCount: sent,
      failedCount: failed,
      sentAt: new Date(),
      scheduledAt: null,
    },
  });

  return { sent, failed, total: recipients.length, abSplit: abCount };
}

export async function sendTestCampaignEmail(
  campaignId: string,
  toEmail: string
) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { tenant: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  const ctx = await buildPersonalizeContext(campaign.tenantId, toEmail, "Test User", {
    discountCode: campaign.discountCode,
    utmCampaign: campaign.utmCampaign ?? "test",
    campaignId: campaign.id,
  });
  const { subject, html, text } = await buildCampaignEmail(
    ctx,
    campaign.subject,
    campaign.bodyHtml,
    campaign.plainText ?? htmlToPlain(campaign.bodyHtml)
  );
  const storeUrl = getStorefrontUrl(campaign.tenant.slug);
  await sendEmail({
    to: toEmail,
    subject: `[TEST] ${subject}`,
    html: wrapShell(campaign.tenant.name, html, storeUrl),
    text,
  });
}

export async function processScheduledCampaigns() {
  const due = await prisma.emailCampaign.findMany({
    where: {
      status: EmailCampaignStatus.SCHEDULED,
      scheduledAt: { lte: new Date() },
    },
    take: 10,
  });
  for (const c of due) {
    try {
      await sendEmailCampaign(c.id);
    } catch (e) {
      console.error("[cron] scheduled campaign", c.id, e);
      await prisma.emailCampaign.update({
        where: { id: c.id },
        data: { status: EmailCampaignStatus.FAILED },
      });
    }
  }
}
