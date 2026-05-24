export type PageTemplate = {
  id: string;
  label: string;
  title: string;
  slug: string;
  pageType: "PAGE" | "BLOG";
  body: string;
  excerpt?: string;
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "about",
    label: "About us",
    title: "About us",
    slug: "about",
    pageType: "PAGE",
    body: `<h2>Our story</h2><p>Tell customers who you are and why you started this brand.</p><h2>What we believe</h2><p>Share your values and what makes your products different.</p>`,
    excerpt: "Learn about our brand and mission.",
  },
  {
    id: "faq",
    label: "FAQ",
    title: "FAQ",
    slug: "faq",
    pageType: "PAGE",
    body: `<h2>Shipping</h2><p>How long does delivery take? Add your typical timelines here.</p><h2>Returns</h2><p>Describe your return window and process.</p><h2>Orders</h2><p>How can customers track or change an order?</p>`,
    excerpt: "Frequently asked questions about orders and shipping.",
  },
  {
    id: "contact",
    label: "Contact",
    title: "Contact",
    slug: "contact",
    pageType: "PAGE",
    body: `<h2>Get in touch</h2><p>Email: <a href="mailto:hello@example.com">hello@example.com</a></p><p>We usually reply within one business day.</p>`,
    excerpt: "Contact our team.",
  },
];
