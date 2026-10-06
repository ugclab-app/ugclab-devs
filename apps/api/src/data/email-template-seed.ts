import {
  OUTREACH_BRAND_HTML,
  OUTREACH_CREATOR_HTML,
  OUTREACH_LEGACY_HTML,
  OUTREACH_SHORT_HTML,
  OUTREACH_WELCOME_HTML,
} from "./outreach-email-html.js";

export const EMAIL_TEMPLATE_SEED = [
  {
    key: "domain_reminder",
    label: "Domain verification reminder",
    subject: "Verify your custom domain: {{domain}}",
    html: "<p>Hi,</p><p>Add TXT record for <strong>{{domain}}</strong>:</p><p><code>{{txtValue}}</code></p>",
    text: "Verify {{domain}} — TXT: {{txtValue}}",
  },
  {
    key: "payout_approved",
    label: "Payout approved",
    subject: "Your payout was approved",
    html: "<p>Your payout of <strong>{{amount}}</strong> has been approved.</p>",
    text: "Payout approved: {{amount}}",
  },
  {
    key: "order_confirmation",
    label: "Order confirmation (sample)",
    subject: "Order {{orderNumber}} confirmed",
    html: "<p>Thank you for your order <strong>{{orderNumber}}</strong>.</p>",
    text: "Order {{orderNumber}} confirmed",
  },
  {
    key: "outreach_welcome",
    label: "Welcome — full magazine",
    subject: "{{name}}, launch your store on {{platformName}}",
    html: OUTREACH_WELCOME_HTML,
    text: "Hi {{name}},\n\nLaunch your online store on {{platformName}} — themes, Stripe checkout, orders, and custom domains.\n\nStart free: {{signupUrl}}\n\n— The {{platformName}} team",
  },
  {
    key: "outreach_short",
    label: "Short — visual invite",
    subject: "{{platformName}} — your store live in 10 minutes",
    html: OUTREACH_SHORT_HTML,
    text: "Hi {{name}}, start free on {{platformName}}: {{signupUrl}}",
  },
  {
    key: "outreach_creator",
    label: "Creator — UGC & merch",
    subject: "{{name}}, turn your audience into revenue",
    html: OUTREACH_CREATOR_HTML,
    text: "Hi {{name}}, monetize your audience on {{platformName}}: {{signupUrl}}",
  },
  {
    key: "outreach_brand",
    label: "Brand — DTC scale",
    subject: "{{name}}, your DTC stack on {{platformName}}",
    html: OUTREACH_BRAND_HTML,
    text: "Hi {{name}}, launch your brand on {{platformName}}: {{signupUrl}}",
  },
  {
    key: "merchant_outreach",
    label: "Legacy — welcome layout",
    subject: "Launch your store on {{platformName}}",
    html: OUTREACH_LEGACY_HTML,
    text: "Hi {{name}}, launch on {{platformName}}: {{signupUrl}}",
  },
] as const;
