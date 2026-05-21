export type CampaignTemplate = {
  id: string;
  label: string;
  subject: string;
  bodyHtml: string;
};

export const EMAIL_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "sale",
    label: "Flash sale",
    subject: "{{store_name}} — limited-time offer",
    bodyHtml: `<p>Hi {{name}},</p>
<p>Enjoy <strong>20% off</strong> this week at {{store_name}}.</p>
<p>Use code <strong>{{discount_code}}</strong> at checkout.</p>
<p><a href="{{store_url}}?utm_source=email&utm_campaign={{utm_campaign}}">Shop now</a></p>`,
  },
  {
    id: "new_arrivals",
    label: "New arrivals",
    subject: "New at {{store_name}}",
    bodyHtml: `<p>Hi {{name}},</p>
<p>Fresh products just dropped. Be the first to explore the latest from {{store_name}}.</p>
<p><a href="{{store_url}}?utm_source=email&utm_campaign={{utm_campaign}}">View collection</a></p>`,
  },
  {
    id: "winback",
    label: "Win-back",
    subject: "We miss you at {{store_name}}",
    bodyHtml: `<p>Hi {{name}},</p>
<p>It's been a while since your last order{{last_order_date}}. Here's something special to welcome you back.</p>
<p><a href="{{store_url}}?utm_source=email&utm_campaign={{utm_campaign}}">Return to store</a></p>`,
  },
  {
    id: "abandoned",
    label: "Cart reminder",
    subject: "You left something behind",
    bodyHtml: `<p>Hi {{name}},</p>
<p>Your cart at {{store_name}} is waiting. Complete checkout before items sell out.</p>
<p><a href="{{store_url}}/cart?utm_source=email&utm_campaign={{utm_campaign}}">Finish checkout</a></p>`,
  },
];

export function getTemplate(id: string): CampaignTemplate | undefined {
  return EMAIL_CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}
