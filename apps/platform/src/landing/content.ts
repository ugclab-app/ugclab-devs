/** All landing copy. `ru` and `tr` (content-tr.ts) must mirror the shape of `en`. */
import { tr } from "./content-tr";
import { extraCompareFor, extraCountryFor } from "./seo-expand";

type Cell = boolean | string;

const en = {
  meta: {
    home: {
      title: "Tescommerce — online store platform for sellers Shopify can't pay",
      description:
        "Open an online store, sell to 230+ countries and get paid in 12 currencies — even where Shopify Payments and Stripe don't work. Merchant of Record, local payments, dropshipping.",
    },
  },
  nav: {
    check: "Your country",
    features: "Features",
    savings: "Savings",
    pricing: "Pricing",
    faq: "FAQ",
    signIn: "Sign in",
    getStarted: "Start free",
    menu: "Menu",
    close: "Close",
    language: "Language",
  },
  hero: {
    badge: "Merchant of Record · payouts in 12 currencies",
    titleStart: "Sell worldwide.",
    titleAccent: "Get paid where you live.",
    subtitle:
      "Shopify Payments and Stripe don't work in most countries. Tescommerce is the seller at checkout, so you can open a store, take card payments from 230+ countries and get paid in your currency.",
    emailLabel: "Your email",
    emailPlaceholder: "you@example.com",
    emailCta: "Start free",
    demo: "Open demo store",
    note: "No credit card required · Starter is free forever",
    previewNote: "This is the live demo store, not a mockup.",
  },
  integrations: { title: "Works with" },
  checker: {
    eyebrow: "Your country",
    title: "Can I sell from my country?",
    subtitle: "Pick where you live and see how you get paid and how your buyers pay.",
    label: "Where do you live?",
    other: "Another country",
    payout: "Payout currency",
    buyers: "Your buyers pay with",
    buyerMethods: "Cards, Apple Pay, Google Pay, PayPal",
    local: "Local payment methods",
    noLocal: "Not yet — cards and wallets work",
    mor: "Merchant of Record",
    morValue: "Yes — Tescommerce is the seller at checkout",
    shipping: "You can ship to",
    shippingValue: "230+ countries and territories",
    cta: "Open a store",
  },
  payouts: {
    eyebrow: "Payouts",
    title: "Open a store even if Shopify will not pay you",
    subtitle:
      "Shopify Payments only works in some countries. If yours is not on that list, you can still launch on Tescommerce and get paid from your dashboard.",
    steps: [
      {
        title: "Buyer pays by card",
        desc: "The order shows up in your dashboard. Your country does not have to be on the Shopify Payments list.",
      },
      {
        title: "It lands in your balance",
        desc: "Paid orders add to the amount you can request, net of the platform fee for your plan.",
      },
      {
        title: "You request a payout",
        desc: "Choose one of 12 payout currencies. Payouts usually arrive within 3–7 business days after approval. Minimum is $50.",
      },
    ],
  },
  features: {
    eyebrow: "Features",
    title: "Everything you need to sell across borders",
    subtitle: "Payments, payouts, shipping and marketing in one place — without hiring developers.",
    items: [
      {
        title: "Merchant of Record",
        desc: "Tescommerce is the seller at checkout and handles tax collection in many regions, so you receive net payouts.",
      },
      {
        title: "Payouts in 12 currencies",
        desc: "USD, EUR, GBP, KGS, KZT, UZS and more. Your country does not have to be on the Shopify Payments list.",
      },
      {
        title: "Local payments",
        desc: "Finik and GoPay QR in Kyrgyzstan, next to cards, Apple Pay and Google Pay via Stripe, and PayPal.",
      },
      {
        title: "Sell worldwide",
        desc: "Ship to 230+ countries, set prices by country, and use your own domain.",
      },
      {
        title: "Dropshipping & shipping",
        desc: "Connect CJ Dropshipping, Printful or Printify. Buy labels with Shippo or use flat rates by zone.",
      },
      {
        title: "Digital & physical",
        desc: "Files, courses and presets with signed download links, plus physical products with variants.",
      },
    ],
  },
  useCases: {
    eyebrow: "Who it's for",
    title: "Built for the way you sell",
    tabs: [
      {
        label: "Creators",
        title: "Sell files, courses and subscriptions",
        desc: "Upload a file once and every buyer gets a secure link right after payment.",
        points: [
          "Signed download links with limits and expiry",
          "Monthly or yearly subscriptions",
          "Email campaigns to your buyers",
          "Prices in your buyers' currencies",
        ],
      },
      {
        label: "Brands",
        title: "Run a physical product brand",
        desc: "Everything a small brand needs after the first sale, without a stack of paid apps.",
        points: [
          "Variants, inventory and low-stock alerts",
          "Shipping zones and Shippo labels",
          "Reviews, wishlist and back-in-stock alerts",
          "Bundles, quantity offers and gift wrap",
        ],
      },
      {
        label: "Dropshippers",
        title: "Launch without holding stock",
        desc: "Import products from suppliers and let them ship straight to your buyers.",
        points: [
          "CJ Dropshipping, Printful and Printify",
          "Prices by country with Markets",
          "Meta and TikTok Conversions API",
          "Order alerts in Telegram",
        ],
      },
    ],
  },
  demo: {
    eyebrow: "Live demo",
    title: "See a real storefront — not just a mockup",
    desc: "Browse the Tescommerce demo shop: collections, product pages, and checkout — exactly what your buyers will see.",
    cta: "Open demo store →",
  },
  builder: {
    eyebrow: "Site builder",
    title: "Design your store without a developer",
    subtitle: "Drag-and-drop sections, preset themes, and a live preview. Publish when you are ready.",
    cards: [
      { title: "Themes & presets", desc: "Start from curated layouts or save your own brand preset." },
      {
        title: "Blocks library",
        desc: "Hero, products, FAQ, newsletter, pricing, tabs, contact — mix and match.",
      },
      { title: "Mobile & tablet", desc: "Preview every breakpoint before you publish to your live store." },
    ],
    editor: "Storefront editor",
    devices: ["Desktop", "Tablet", "Mobile"],
    blocksTitle: "Blocks",
    blocks: ["Hero", "Featured products", "Trust strip", "Newsletter", "FAQ"],
    heroTitle: "Your brand, one store",
    shopNow: "Shop now",
    products: ["Product A", "Product B", "Product C"],
    addBlock: "+ Add block",
  },
  facts: {
    eyebrow: "Early access",
    title: "Built for sellers the payment map left out",
    subtitle: "We just launched. Every early store gets direct support from the founder.",
    items: [
      { value: "230+", label: "countries your buyers can order from" },
      { value: "12", label: "payout currencies, incl. KGS, KZT and UZS" },
      { value: "MoR", label: "Tescommerce is the seller at checkout" },
      { value: "40+", label: "dashboard sections, from orders to cohorts" },
    ],
  },
  savings: {
    eyebrow: "Savings",
    title: "What you pay on Shopify vs Tescommerce",
    subtitle:
      "Shopify charges an extra 2% when you can't use Shopify Payments, and most stores add paid apps on top.",
    salesLabel: "Your sales per month",
    appsLabel: "Shopify apps you would need",
    apps: [
      { id: "email", label: "Email marketing (Klaviyo)", price: 30 },
      { id: "reviews", label: "Product reviews (Judge.me)", price: 15 },
      { id: "digital", label: "Digital downloads (Sky Pilot)", price: 12.99 },
    ],
    shopifyTitle: "Shopify Basic",
    shopifyPlan: "Plan",
    shopifyApps: "Apps",
    shopifyFee: "2% third-party payment fee",
    tesTitle: "Tescommerce",
    starter: "Starter: 5% platform fee",
    growth: "Growth: $29 + 4% platform fee",
    total: "Total per month",
    save: "You save {month} a month — {year} a year",
    moreExpensive:
      "At this volume Shopify costs less — if Shopify Payments works in your country. If it doesn't, Shopify can't pay you out at all.",
    footnote:
      "Card processing fees apply on both platforms and are left out. Shopify and app prices from their public pricing pages, 2026.",
  },
  how: {
    eyebrow: "How it works",
    title: "Launch your store in 3 steps",
    steps: [
      { title: "Create your store", desc: "Sign up, pick a name, and get a subdomain in a couple of minutes." },
      { title: "Add products", desc: "Upload a digital file or list a physical product with variants." },
      {
        title: "Get paid",
        desc: "Share the link. When a buyer pays, request a payout from your dashboard.",
      },
    ],
  },
  compare: {
    eyebrow: "Compare",
    title: "How Tescommerce stacks up",
    subtitle:
      "One platform for storefront, checkout, digital delivery, and global selling — without stacking four tools.",
    vs: "vs",
    rows: [
      { label: "Starting price", values: ["Free + 5% fee", "$39/mo", "$29/mo", "10% fee"] as Cell[] },
      { label: "Payouts outside Shopify Payments countries", values: ["Yes", "No", "—", "Yes"] as Cell[] },
      { label: "Merchant of Record (MoR)", values: [true, false, false, true] as Cell[] },
      { label: "Local payments (QR, bank apps)", values: [true, false, false, false] as Cell[] },
      { label: "Visual site builder", values: [true, true, true, false] as Cell[] },
      {
        label: "Physical + digital products",
        values: [true, true, "Digital focus", "Digital only"] as Cell[],
      },
      { label: "Custom domain", values: [true, true, true, false] as Cell[] },
      { label: "Staff accounts", values: [true, true, false, false] as Cell[] },
    ],
  },
  security: {
    eyebrow: "Trust & security",
    title: "Built to handle other people's money",
    subtitle: "Card data never touches our servers: checkout runs on Stripe, which is PCI DSS Level 1 certified.",
    items: [
      { title: "Fraud scoring", desc: "Every order gets a risk score from 0 to 100 before you ship." },
      { title: "Buyer protection reserve", desc: "A reserve covers refunds and disputes, so buyers trust your store." },
      { title: "Seller verification", desc: "KYC checks before payouts keep scammers off the platform." },
      { title: "2FA and staff roles", desc: "Two-factor sign-in and role-based access for your team." },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Simple pricing that grows with you",
    mostPopular: "Most popular",
    breakEven: "Growth costs less than Starter once you sell more than $2,900 a month.",
    plans: [
      {
        name: "Starter",
        price: "Free",
        period: "forever",
        desc: "Perfect to validate your idea",
        features: ["Up to 50 products", "Subdomain store", "5% platform fee", "Email support"],
        cta: "Start free",
        highlighted: false,
      },
      {
        name: "Growth",
        price: "$29",
        period: "/month",
        desc: "For growing brands",
        features: ["Unlimited products", "Custom domain", "4% platform fee", "Stripe Tax ready", "Priority support"],
        cta: "Start trial",
        highlighted: true,
      },
      {
        name: "Pro",
        price: "$79",
        period: "/month",
        desc: "Teams & power sellers",
        features: ["Everything in Growth", "Staff accounts", "API access", "Advanced analytics"],
        cta: "Get started",
        highlighted: false,
      },
    ],
  },
  founder: {
    eyebrow: "Who is behind it",
    title: "Talk to the founder, not a ticket queue",
    name: "Mustafa Sadyrov",
    role: "Founder & CEO, Tescommerce",
    quote:
      "I built Tescommerce because sellers in my region could build a great product but had no way to get paid online. Every early store gets my personal help with launch.",
    telegram: "Message me on Telegram",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Common questions",
    items: [
      {
        q: "Shopify Payments is not available in my country. Can I still get paid?",
        a: "Yes. Open the store, take the order, and request a payout from your dashboard in one of 12 currencies, including USD, EUR, KGS, KZT and UZS. Payouts usually arrive within 3–7 business days after approval. The minimum is $50.",
      },
      {
        q: "What fees does Tescommerce charge?",
        a: "Starter is free with a 5% platform fee on sales. Growth is $29 a month with a 4% fee. Card processing is charged at standard Stripe rates.",
      },
      {
        q: "What is Merchant of Record (MoR)?",
        a: "Tescommerce acts as the seller at checkout: we take the payment, handle tax collection in many regions and pay you the net amount, so you don't have to register for taxes country by country.",
      },
      {
        q: "Can I use my own domain?",
        a: "Yes. Connect a custom domain on Growth and Pro. Until then, your store is available on a branded subdomain instantly after signup.",
      },
      {
        q: "Do you support digital downloads?",
        a: "Yes — sell files, courses, and presets with secure signed download links, expiry, and download limits. Physical products and shipping zones are supported too.",
      },
      {
        q: "Can I dropship?",
        a: "Yes. Connect CJ Dropshipping, Printful or Printify, import products, and orders are sent to the supplier who ships to your buyer.",
      },
      {
        q: "How does Stripe fit in?",
        a: "Checkout runs on Stripe (cards, Apple Pay, Google Pay where available). We never store raw card numbers.",
      },
      {
        q: "Is Tescommerce GDPR-ready?",
        a: "We provide privacy controls, consent-friendly checkout, and data export patterns suitable for EU buyers. You remain responsible for your store policies and lawful basis.",
      },
      {
        q: "How is this different from Shopify?",
        a: "Shopify is a full ecosystem with apps and themes, but it can only pay sellers in Shopify Payments countries. Tescommerce is Merchant of Record, pays out in 12 currencies and includes email, reviews and digital delivery without extra apps.",
      },
    ],
  },
  finalCta: {
    title: "Open your store and get paid",
    desc: "Starter is free forever. Launch on Tescommerce and upgrade when your sales grow.",
    cta: "Start free",
  },
  footer: {
    rights: "All rights reserved.",
    product: "Product",
    compare: "Compare",
    countries: "Sell from",
    company: "Company",
    partners: "Partners",
    status: "Status",
    privacy: "Privacy",
    terms: "Terms",
    login: "Merchant login",
    pricing: "Pricing",
    guides: "Guides",
    glossary: "Glossary",
    tools: "Free tools",
    savingsTool: "Fee calculator",
  },
  sticky: "Start free",
  backHome: "← Tescommerce home",
  comparePages: {
    shopify: {
      name: "Shopify",
      title: "Tescommerce vs Shopify",
      description:
        "A Shopify alternative for sellers outside Shopify Payments countries: Merchant of Record, payouts in 12 currencies, email and reviews built in.",
      eyebrow: "Shopify alternative",
      heading: "The Shopify alternative that can actually pay you",
      intro:
        "Shopify is a great platform — if you live in a Shopify Payments country. Everywhere else you pay an extra 2% on every sale, or can't get paid at all.",
      rows: [
        { label: "Starting price", tes: "Free + 5% fee", other: "$39/mo" },
        { label: "Payouts outside Shopify Payments countries", tes: "Yes, 12 currencies", other: "No" },
        { label: "Fee with a third-party payment provider", tes: "None", other: "+2% per sale" },
        { label: "Merchant of Record", tes: "Yes", other: "No" },
        { label: "Email marketing", tes: "Built in", other: "Paid app" },
        { label: "Product reviews", tes: "Built in", other: "Paid app" },
        { label: "Digital downloads", tes: "Built in", other: "Paid app" },
        { label: "App store and themes", tes: "Focused set", other: "Thousands" },
      ],
      chooseOther: {
        title: "When Shopify is the better choice",
        points: [
          "You live in a Shopify Payments country and sell over ~$7,000 a month",
          "You need a niche app only the Shopify App Store has",
          "You run a large team that already knows Shopify",
        ],
      },
      chooseUs: {
        title: "When Tescommerce is the better choice",
        points: [
          "Shopify Payments or Stripe don't work in your country",
          "You don't want to register for sales tax in every country",
          "You want email, reviews and digital delivery without paying for apps",
        ],
      },
      showSavings: true,
    },
    gumroad: {
      name: "Gumroad",
      title: "Tescommerce vs Gumroad",
      description:
        "A Gumroad alternative with lower fees, your own branded store, custom domain and physical products — and payouts in 12 currencies.",
      eyebrow: "Gumroad alternative",
      heading: "Keep more of every sale than on Gumroad",
      intro:
        "Gumroad is easy, but it takes 10% of every sale and gives you a profile page, not a store. Tescommerce is also Merchant of Record — at 5% or 4%.",
      rows: [
        { label: "Platform fee", tes: "5% (Starter) or 4% (Growth)", other: "10%" },
        { label: "Merchant of Record", tes: "Yes", other: "Yes" },
        { label: "Your own branded store", tes: "Yes, with site builder", other: "Profile page" },
        { label: "Custom domain", tes: "Yes", other: "No" },
        { label: "Physical products and shipping", tes: "Yes", other: "Digital only" },
        { label: "Payout currencies", tes: "12, incl. KGS, KZT, UZS", other: "Limited" },
        { label: "Local payments (QR, bank apps)", tes: "Yes", other: "No" },
      ],
      chooseOther: {
        title: "When Gumroad is the better choice",
        points: [
          "You sell one digital product and want zero setup",
          "You rely on Gumroad Discover for traffic",
        ],
      },
      chooseUs: {
        title: "When Tescommerce is the better choice",
        points: [
          "You want a real store with your brand and domain",
          "You sell regularly — even Starter at 5% takes half of what Gumroad takes",
          "You sell physical products too",
        ],
      },
      showSavings: false,
    },
    ...extraCompareFor("en"),
  },
  countryPages: {
    kyrgyzstan: {
      code: "KG",
      title: "Sell online from Kyrgyzstan",
      description:
        "Open an online store from Kyrgyzstan: accept Finik and GoPay QR locally and cards from 230+ countries, get paid in KGS or USD.",
      eyebrow: "Kyrgyzstan",
      heading: "Your online store from Kyrgyzstan — paid in som or dollars",
      intro:
        "Stripe and Shopify Payments don't onboard sellers from Kyrgyzstan. Tescommerce is the seller at checkout, so you can sell abroad and still get paid at home.",
      points: [
        { title: "Local payments", desc: "Buyers in Kyrgyzstan pay with Finik and GoPay QR." },
        { title: "Buyers abroad", desc: "Cards, Apple Pay, Google Pay and PayPal from 230+ countries." },
        { title: "Payouts in KGS or USD", desc: "Request a payout from your dashboard. Minimum is $50." },
        { title: "Russian and Kyrgyz", desc: "Your storefront can speak your buyers' language." },
      ],
    },
    kazakhstan: {
      code: "KZ",
      title: "Sell online from Kazakhstan",
      description:
        "Open an online store from Kazakhstan: take card payments from 230+ countries and get paid in KZT or USD with Tescommerce as Merchant of Record.",
      eyebrow: "Kazakhstan",
      heading: "Your own online store from Kazakhstan, beyond the marketplaces",
      intro:
        "Most online sales in Kazakhstan go through marketplaces that own the customer. With your own store you keep the buyer, the brand and the margin.",
      points: [
        { title: "Buyers worldwide", desc: "Cards, Apple Pay, Google Pay and PayPal from 230+ countries." },
        { title: "Payouts in KZT or USD", desc: "Request a payout from your dashboard. Minimum is $50." },
        { title: "Merchant of Record", desc: "Tescommerce is the seller at checkout and handles cross-border tax." },
        { title: "Russian and Kazakh", desc: "Your storefront can speak your buyers' language." },
      ],
    },
    uzbekistan: {
      code: "UZ",
      title: "Sell online from Uzbekistan",
      description:
        "Open an online store from Uzbekistan: take card payments from 230+ countries and get paid in UZS or USD with Tescommerce as Merchant of Record.",
      eyebrow: "Uzbekistan",
      heading: "Turn your Instagram shop into a real online store",
      intro:
        "Many sellers in Uzbekistan sell through Instagram DMs. A store with checkout takes orders while you sleep and accepts payments from abroad.",
      points: [
        { title: "Buyers worldwide", desc: "Cards, Apple Pay, Google Pay and PayPal from 230+ countries." },
        { title: "Payouts in UZS or USD", desc: "Request a payout from your dashboard. Minimum is $50." },
        { title: "Meta Conversions API", desc: "Track Instagram ad sales accurately, even with blocked cookies." },
        { title: "Russian and Uzbek", desc: "Your storefront can speak your buyers' language." },
      ],
    },
    ...extraCountryFor("en"),
  },
};

export type LandingContent = typeof en;

const ru: LandingContent = {
  meta: {
    home: {
      title: "Tescommerce — платформа интернет-магазинов для тех, кому не платит Shopify",
      description:
        "Откройте интернет-магазин, продавайте в 230+ стран и получайте выплаты в 12 валютах — даже там, где не работают Shopify Payments и Stripe. Merchant of Record, локальные платежи, дропшиппинг.",
    },
  },
  nav: {
    check: "Ваша страна",
    features: "Возможности",
    savings: "Экономия",
    pricing: "Тарифы",
    faq: "Вопросы",
    signIn: "Войти",
    getStarted: "Начать бесплатно",
    menu: "Меню",
    close: "Закрыть",
    language: "Язык",
  },
  hero: {
    badge: "Merchant of Record · выплаты в 12 валютах",
    titleStart: "Продавайте по всему миру.",
    titleAccent: "Получайте деньги дома.",
    subtitle:
      "Shopify Payments и Stripe не работают в большинстве стран. Tescommerce выступает продавцом при оплате, поэтому вы открываете магазин, принимаете карты из 230+ стран и получаете выплаты в своей валюте.",
    emailLabel: "Ваш email",
    emailPlaceholder: "you@example.com",
    emailCta: "Начать бесплатно",
    demo: "Открыть демо-магазин",
    note: "Без банковской карты · Тариф Starter бесплатный навсегда",
    previewNote: "Это живой демо-магазин, а не макет.",
  },
  integrations: { title: "Интеграции" },
  checker: {
    eyebrow: "Ваша страна",
    title: "Можно ли продавать из моей страны?",
    subtitle: "Выберите, где вы живёте, и посмотрите, как вы получите деньги и как будут платить покупатели.",
    label: "Где вы живёте?",
    other: "Другая страна",
    payout: "Валюта выплат",
    buyers: "Покупатели платят",
    buyerMethods: "Картами, Apple Pay, Google Pay, PayPal",
    local: "Локальные способы оплаты",
    noLocal: "Пока нет — работают карты и кошельки",
    mor: "Merchant of Record",
    morValue: "Да — продавцом при оплате выступает Tescommerce",
    shipping: "Доставка в",
    shippingValue: "230+ стран и территорий",
    cta: "Открыть магазин",
  },
  payouts: {
    eyebrow: "Выплаты",
    title: "Откройте магазин, даже если Shopify вам не платит",
    subtitle:
      "Shopify Payments работает только в части стран. Если вашей страны нет в списке, вы всё равно можете запуститься на Tescommerce и выводить деньги из личного кабинета.",
    steps: [
      {
        title: "Покупатель платит картой",
        desc: "Заказ появляется в кабинете. Вашей стране не нужно быть в списке Shopify Payments.",
      },
      {
        title: "Деньги попадают на баланс",
        desc: "Оплаченные заказы пополняют сумму к выводу за вычетом комиссии вашего тарифа.",
      },
      {
        title: "Вы запрашиваете выплату",
        desc: "Выберите одну из 12 валют. Выплата обычно приходит за 3–7 рабочих дней после одобрения. Минимум — $50.",
      },
    ],
  },
  features: {
    eyebrow: "Возможности",
    title: "Всё, чтобы продавать за границу",
    subtitle: "Платежи, выплаты, доставка и маркетинг в одном месте — без разработчиков.",
    items: [
      {
        title: "Merchant of Record",
        desc: "Tescommerce выступает продавцом при оплате и собирает налоги во многих регионах, а вы получаете чистую выплату.",
      },
      {
        title: "Выплаты в 12 валютах",
        desc: "USD, EUR, GBP, KGS, KZT, UZS и другие. Вашей стране не нужно быть в списке Shopify Payments.",
      },
      {
        title: "Локальные платежи",
        desc: "Finik и GoPay QR в Кыргызстане, а также карты, Apple Pay и Google Pay через Stripe и PayPal.",
      },
      {
        title: "Продажи по всему миру",
        desc: "Доставка в 230+ стран, цены по странам и собственный домен.",
      },
      {
        title: "Дропшиппинг и доставка",
        desc: "Подключите CJ Dropshipping, Printful или Printify. Покупайте этикетки в Shippo или задайте тарифы по зонам.",
      },
      {
        title: "Цифровые и физические товары",
        desc: "Файлы, курсы и пресеты с защищёнными ссылками на скачивание, а также физические товары с вариантами.",
      },
    ],
  },
  useCases: {
    eyebrow: "Для кого",
    title: "Под ваш способ продавать",
    tabs: [
      {
        label: "Авторы",
        title: "Продавайте файлы, курсы и подписки",
        desc: "Загрузите файл один раз — каждый покупатель получит защищённую ссылку сразу после оплаты.",
        points: [
          "Подписанные ссылки с лимитом и сроком действия",
          "Подписки помесячно или на год",
          "Email-рассылки по вашим покупателям",
          "Цены в валютах покупателей",
        ],
      },
      {
        label: "Бренды",
        title: "Ведите бренд физических товаров",
        desc: "Всё, что нужно небольшому бренду после первой продажи, без кучи платных приложений.",
        points: [
          "Варианты, остатки и уведомления о низком запасе",
          "Зоны доставки и этикетки Shippo",
          "Отзывы, избранное и «сообщить о поступлении»",
          "Наборы, скидки за количество и подарочная упаковка",
        ],
      },
      {
        label: "Дропшипперы",
        title: "Запуститесь без своего склада",
        desc: "Импортируйте товары поставщиков — они отправят заказ прямо покупателю.",
        points: [
          "CJ Dropshipping, Printful и Printify",
          "Цены по странам через Markets",
          "Meta и TikTok Conversions API",
          "Уведомления о заказах в Telegram",
        ],
      },
    ],
  },
  demo: {
    eyebrow: "Живое демо",
    title: "Посмотрите настоящую витрину, а не макет",
    desc: "Откройте демо-магазин Tescommerce: коллекции, страницы товаров и оформление заказа — ровно то, что увидят ваши покупатели.",
    cta: "Открыть демо-магазин →",
  },
  builder: {
    eyebrow: "Конструктор",
    title: "Оформите магазин без разработчика",
    subtitle: "Секции перетаскиванием, готовые темы и живой предпросмотр. Публикуйте, когда будете готовы.",
    cards: [
      { title: "Темы и пресеты", desc: "Начните с готового шаблона или сохраните пресет своего бренда." },
      {
        title: "Библиотека блоков",
        desc: "Баннер, товары, FAQ, подписка, тарифы, вкладки, контакты — комбинируйте как угодно.",
      },
      { title: "Телефон и планшет", desc: "Проверьте каждый размер экрана до публикации." },
    ],
    editor: "Редактор витрины",
    devices: ["Компьютер", "Планшет", "Телефон"],
    blocksTitle: "Блоки",
    blocks: ["Баннер", "Избранные товары", "Полоса доверия", "Подписка", "FAQ"],
    heroTitle: "Ваш бренд, один магазин",
    shopNow: "В магазин",
    products: ["Товар A", "Товар B", "Товар C"],
    addBlock: "+ Добавить блок",
  },
  facts: {
    eyebrow: "Ранний доступ",
    title: "Для продавцов, которых обошла карта платежей",
    subtitle: "Мы только запустились. Каждому раннему магазину помогает лично основатель.",
    items: [
      { value: "230+", label: "стран, откуда покупатели могут заказать" },
      { value: "12", label: "валют выплат, включая KGS, KZT и UZS" },
      { value: "MoR", label: "продавцом при оплате выступает Tescommerce" },
      { value: "40+", label: "разделов кабинета — от заказов до когорт" },
    ],
  },
  savings: {
    eyebrow: "Экономия",
    title: "Сколько вы платите в Shopify и в Tescommerce",
    subtitle:
      "Shopify берёт дополнительные 2%, если вы не можете подключить Shopify Payments, а большинство магазинов докупают платные приложения.",
    salesLabel: "Ваши продажи в месяц",
    appsLabel: "Приложения Shopify, которые понадобятся",
    apps: [
      { id: "email", label: "Email-рассылки (Klaviyo)", price: 30 },
      { id: "reviews", label: "Отзывы о товарах (Judge.me)", price: 15 },
      { id: "digital", label: "Цифровые товары (Sky Pilot)", price: 12.99 },
    ],
    shopifyTitle: "Shopify Basic",
    shopifyPlan: "Тариф",
    shopifyApps: "Приложения",
    shopifyFee: "2% за сторонний платёжный сервис",
    tesTitle: "Tescommerce",
    starter: "Starter: комиссия 5%",
    growth: "Growth: $29 + комиссия 4%",
    total: "Итого в месяц",
    save: "Экономия {month} в месяц — {year} в год",
    moreExpensive:
      "При таком объёме Shopify дешевле — если в вашей стране работает Shopify Payments. Если нет, Shopify вообще не сможет вам выплатить.",
    footnote:
      "Комиссия за обработку карт есть на обеих платформах и в расчёт не входит. Цены Shopify и приложений — с их публичных страниц тарифов, 2026.",
  },
  how: {
    eyebrow: "Как это работает",
    title: "Запуск магазина за 3 шага",
    steps: [
      { title: "Создайте магазин", desc: "Зарегистрируйтесь, выберите название и получите поддомен за пару минут." },
      { title: "Добавьте товары", desc: "Загрузите цифровой файл или добавьте физический товар с вариантами." },
      {
        title: "Получайте деньги",
        desc: "Поделитесь ссылкой. Когда покупатель оплатит, запросите выплату в кабинете.",
      },
    ],
  },
  compare: {
    eyebrow: "Сравнение",
    title: "Tescommerce против других платформ",
    subtitle: "Одна платформа для витрины, оплаты, цифровой доставки и продаж по миру — вместо четырёх сервисов.",
    vs: "против",
    rows: [
      { label: "Стартовая цена", values: ["Бесплатно + 5%", "$39/мес", "$29/мес", "10% комиссии"] },
      { label: "Выплаты вне стран Shopify Payments", values: ["Да", "Нет", "—", "Да"] },
      { label: "Merchant of Record (MoR)", values: [true, false, false, true] },
      { label: "Локальные платежи (QR, банковские приложения)", values: [true, false, false, false] },
      { label: "Визуальный конструктор", values: [true, true, true, false] },
      {
        label: "Физические и цифровые товары",
        values: [true, true, "В основном цифровые", "Только цифровые"],
      },
      { label: "Свой домен", values: [true, true, true, false] },
      { label: "Аккаунты сотрудников", values: [true, true, false, false] },
    ],
  },
  security: {
    eyebrow: "Надёжность",
    title: "Создано, чтобы работать с чужими деньгами",
    subtitle:
      "Данные карт не попадают на наши серверы: оплата идёт через Stripe с сертификатом PCI DSS Level 1.",
    items: [
      { title: "Оценка мошенничества", desc: "Каждый заказ получает оценку риска от 0 до 100 до отправки." },
      { title: "Резерв защиты покупателя", desc: "Резерв покрывает возвраты и споры, поэтому покупатели доверяют магазину." },
      { title: "Проверка продавцов", desc: "KYC перед выплатами не пускает мошенников на платформу." },
      { title: "2FA и роли", desc: "Двухфакторный вход и доступ по ролям для вашей команды." },
    ],
  },
  pricing: {
    eyebrow: "Тарифы",
    title: "Простые тарифы, которые растут вместе с вами",
    mostPopular: "Популярный",
    breakEven: "Growth выгоднее Starter, когда вы продаёте больше чем на $2 900 в месяц.",
    plans: [
      {
        name: "Starter",
        price: "Бесплатно",
        period: "навсегда",
        desc: "Чтобы проверить идею",
        features: ["До 50 товаров", "Магазин на поддомене", "Комиссия 5%", "Поддержка по email"],
        cta: "Начать бесплатно",
        highlighted: false,
      },
      {
        name: "Growth",
        price: "$29",
        period: "/мес",
        desc: "Для растущих брендов",
        features: ["Без лимита товаров", "Свой домен", "Комиссия 4%", "Готов к Stripe Tax", "Приоритетная поддержка"],
        cta: "Попробовать",
        highlighted: true,
      },
      {
        name: "Pro",
        price: "$79",
        period: "/мес",
        desc: "Для команд и крупных продавцов",
        features: ["Всё из Growth", "Аккаунты сотрудников", "Доступ к API", "Расширенная аналитика"],
        cta: "Начать",
        highlighted: false,
      },
    ],
  },
  founder: {
    eyebrow: "Кто за этим стоит",
    title: "Пишите основателю, а не в очередь тикетов",
    name: "Мустафа Садыров",
    role: "Основатель и CEO Tescommerce",
    quote:
      "Я создал Tescommerce, потому что продавцы в моём регионе делают отличные товары, но не могут получать деньги онлайн. Каждому раннему магазину я лично помогаю с запуском.",
    telegram: "Написать в Telegram",
  },
  faq: {
    eyebrow: "Вопросы",
    title: "Частые вопросы",
    items: [
      {
        q: "В моей стране нет Shopify Payments. Смогу ли я получать деньги?",
        a: "Да. Откройте магазин, примите заказ и запросите выплату в кабинете в одной из 12 валют, включая USD, EUR, KGS, KZT и UZS. Выплата обычно приходит за 3–7 рабочих дней после одобрения. Минимум — $50.",
      },
      {
        q: "Какие комиссии у Tescommerce?",
        a: "Starter бесплатный с комиссией 5% с продаж. Growth — $29 в месяц и комиссия 4%. Обработка карт оплачивается по стандартным тарифам Stripe.",
      },
      {
        q: "Что такое Merchant of Record (MoR)?",
        a: "Tescommerce выступает продавцом при оплате: принимает платёж, собирает налоги во многих регионах и выплачивает вам чистую сумму. Вам не нужно регистрироваться как плательщику налогов в каждой стране.",
      },
      {
        q: "Можно ли подключить свой домен?",
        a: "Да, на тарифах Growth и Pro. До этого магазин доступен на фирменном поддомене сразу после регистрации.",
      },
      {
        q: "Можно ли продавать цифровые товары?",
        a: "Да — файлы, курсы и пресеты с защищёнными ссылками, сроком действия и лимитом скачиваний. Физические товары и зоны доставки тоже поддерживаются.",
      },
      {
        q: "Можно ли заниматься дропшиппингом?",
        a: "Да. Подключите CJ Dropshipping, Printful или Printify, импортируйте товары — заказы уйдут поставщику, и он отправит их покупателю.",
      },
      {
        q: "Как устроена оплата через Stripe?",
        a: "Оформление заказа работает на Stripe (карты, Apple Pay, Google Pay, где доступны). Мы никогда не храним номера карт.",
      },
      {
        q: "Соответствует ли Tescommerce GDPR?",
        a: "Мы даём настройки приватности, оформление заказа с согласиями и экспорт данных для покупателей из ЕС. За политики магазина и правовое основание отвечаете вы.",
      },
      {
        q: "Чем Tescommerce отличается от Shopify?",
        a: "Shopify — большая экосистема приложений и тем, но выплачивает только продавцам из стран Shopify Payments. Tescommerce — Merchant of Record, платит в 12 валютах, а рассылки, отзывы и цифровая доставка встроены без доплат.",
      },
    ],
  },
  finalCta: {
    title: "Откройте магазин и получайте деньги",
    desc: "Тариф Starter бесплатный навсегда. Запуститесь на Tescommerce и переходите на старший тариф, когда вырастут продажи.",
    cta: "Начать бесплатно",
  },
  footer: {
    rights: "Все права защищены.",
    product: "Продукт",
    compare: "Сравнение",
    countries: "Продавать из",
    company: "Компания",
    partners: "Партнёрам",
    status: "Статус",
    privacy: "Конфиденциальность",
    terms: "Условия",
    login: "Вход для продавцов",
    pricing: "Тарифы",
    guides: "Гайды",
    glossary: "Глоссарий",
    tools: "Бесплатные инструменты",
    savingsTool: "Калькулятор комиссий",
  },
  sticky: "Начать бесплатно",
  backHome: "← На главную Tescommerce",
  comparePages: {
    shopify: {
      name: "Shopify",
      title: "Tescommerce или Shopify",
      description:
        "Альтернатива Shopify для продавцов вне стран Shopify Payments: Merchant of Record, выплаты в 12 валютах, встроенные рассылки и отзывы.",
      eyebrow: "Альтернатива Shopify",
      heading: "Альтернатива Shopify, которая действительно вам заплатит",
      intro:
        "Shopify — отличная платформа, если вы живёте в стране Shopify Payments. Во всех остальных странах вы платите дополнительные 2% с каждой продажи или не можете получить деньги вовсе.",
      rows: [
        { label: "Стартовая цена", tes: "Бесплатно + 5%", other: "$39/мес" },
        { label: "Выплаты вне стран Shopify Payments", tes: "Да, 12 валют", other: "Нет" },
        { label: "Комиссия при стороннем платёжном сервисе", tes: "Нет", other: "+2% с продажи" },
        { label: "Merchant of Record", tes: "Да", other: "Нет" },
        { label: "Email-рассылки", tes: "Встроены", other: "Платное приложение" },
        { label: "Отзывы о товарах", tes: "Встроены", other: "Платное приложение" },
        { label: "Цифровые товары", tes: "Встроены", other: "Платное приложение" },
        { label: "Магазин приложений и тем", tes: "Основной набор", other: "Тысячи" },
      ],
      chooseOther: {
        title: "Когда лучше выбрать Shopify",
        points: [
          "Вы живёте в стране Shopify Payments и продаёте больше чем на ~$7 000 в месяц",
          "Вам нужно нишевое приложение, которое есть только в Shopify App Store",
          "У вас большая команда, которая уже работает в Shopify",
        ],
      },
      chooseUs: {
        title: "Когда лучше выбрать Tescommerce",
        points: [
          "В вашей стране не работают Shopify Payments или Stripe",
          "Вы не хотите регистрироваться плательщиком налогов в каждой стране",
          "Вам нужны рассылки, отзывы и цифровые товары без оплаты приложений",
        ],
      },
      showSavings: true,
    },
    gumroad: {
      name: "Gumroad",
      title: "Tescommerce или Gumroad",
      description:
        "Альтернатива Gumroad с меньшей комиссией, собственным магазином, своим доменом и физическими товарами — и выплатами в 12 валютах.",
      eyebrow: "Альтернатива Gumroad",
      heading: "Оставляйте себе больше с каждой продажи, чем на Gumroad",
      intro:
        "Gumroad простой, но забирает 10% каждой продажи и даёт страницу профиля, а не магазин. Tescommerce тоже Merchant of Record — за 5% или 4%.",
      rows: [
        { label: "Комиссия платформы", tes: "5% (Starter) или 4% (Growth)", other: "10%" },
        { label: "Merchant of Record", tes: "Да", other: "Да" },
        { label: "Свой магазин с брендом", tes: "Да, с конструктором", other: "Страница профиля" },
        { label: "Свой домен", tes: "Да", other: "Нет" },
        { label: "Физические товары и доставка", tes: "Да", other: "Только цифровые" },
        { label: "Валюты выплат", tes: "12, включая KGS, KZT, UZS", other: "Ограничены" },
        { label: "Локальные платежи (QR, банковские приложения)", tes: "Да", other: "Нет" },
      ],
      chooseOther: {
        title: "Когда лучше выбрать Gumroad",
        points: [
          "Вы продаёте один цифровой продукт и не хотите ничего настраивать",
          "Вы получаете трафик из Gumroad Discover",
        ],
      },
      chooseUs: {
        title: "Когда лучше выбрать Tescommerce",
        points: [
          "Вам нужен настоящий магазин со своим брендом и доменом",
          "Вы продаёте регулярно — даже Starter с комиссией 5% берёт вдвое меньше Gumroad",
          "Вы продаёте ещё и физические товары",
        ],
      },
      showSavings: false,
    },
    ...extraCompareFor("ru"),
  },
  countryPages: {
    kyrgyzstan: {
      code: "KG",
      title: "Интернет-магазин из Кыргызстана",
      description:
        "Откройте интернет-магазин из Кыргызстана: принимайте Finik и GoPay QR внутри страны и карты из 230+ стран, получайте выплаты в сомах или долларах.",
      eyebrow: "Кыргызстан",
      heading: "Ваш интернет-магазин из Кыргызстана — с выплатами в сомах или долларах",
      intro:
        "Stripe и Shopify Payments не подключают продавцов из Кыргызстана. Tescommerce выступает продавцом при оплате, поэтому вы продаёте за границу и получаете деньги дома.",
      points: [
        { title: "Локальные платежи", desc: "Покупатели в Кыргызстане платят через Finik и GoPay QR." },
        { title: "Покупатели за рубежом", desc: "Карты, Apple Pay, Google Pay и PayPal из 230+ стран." },
        { title: "Выплаты в KGS или USD", desc: "Запросите выплату в кабинете. Минимум — $50." },
        { title: "Русский и кыргызский", desc: "Витрина может говорить на языке ваших покупателей." },
      ],
    },
    kazakhstan: {
      code: "KZ",
      title: "Интернет-магазин из Казахстана",
      description:
        "Откройте интернет-магазин из Казахстана: принимайте карты из 230+ стран и получайте выплаты в тенге или долларах. Tescommerce — Merchant of Record.",
      eyebrow: "Казахстан",
      heading: "Свой интернет-магазин из Казахстана — не только маркетплейсы",
      intro:
        "Большая часть онлайн-продаж в Казахстане идёт через маркетплейсы, которым принадлежит покупатель. Со своим магазином покупатель, бренд и маржа остаются у вас.",
      points: [
        { title: "Покупатели по всему миру", desc: "Карты, Apple Pay, Google Pay и PayPal из 230+ стран." },
        { title: "Выплаты в KZT или USD", desc: "Запросите выплату в кабинете. Минимум — $50." },
        { title: "Merchant of Record", desc: "Tescommerce выступает продавцом при оплате и берёт на себя трансграничные налоги." },
        { title: "Русский и казахский", desc: "Витрина может говорить на языке ваших покупателей." },
      ],
    },
    uzbekistan: {
      code: "UZ",
      title: "Интернет-магазин из Узбекистана",
      description:
        "Откройте интернет-магазин из Узбекистана: принимайте карты из 230+ стран и получайте выплаты в сумах или долларах. Tescommerce — Merchant of Record.",
      eyebrow: "Узбекистан",
      heading: "Превратите Instagram-магазин в настоящий интернет-магазин",
      intro:
        "Многие продавцы в Узбекистане продают через директ Instagram. Магазин с оформлением заказа принимает заказы, пока вы спите, и принимает оплату из-за границы.",
      points: [
        { title: "Покупатели по всему миру", desc: "Карты, Apple Pay, Google Pay и PayPal из 230+ стран." },
        { title: "Выплаты в UZS или USD", desc: "Запросите выплату в кабинете. Минимум — $50." },
        { title: "Meta Conversions API", desc: "Точный учёт продаж с рекламы в Instagram, даже при заблокированных cookies." },
        { title: "Русский и узбекский", desc: "Витрина может говорить на языке ваших покупателей." },
      ],
    },
    ...extraCountryFor("ru"),
  },
};

export const landingLocales = ["en", "ru", "tr"] as const;
export type LandingLocale = (typeof landingLocales)[number];

export const landingContent: Record<LandingLocale, LandingContent> = { en, ru, tr };

/** Matches a locale prefix like `/ru` or `/tr` at the start of a pathname. */
export const localePrefixRe = /^\/(ru|tr)(?=\/|$)/;

export const landingIntlLocale: Record<LandingLocale, string> = { en: "en-US", ru: "ru-RU", tr: "tr-TR" };
export const landingOgLocale: Record<LandingLocale, string> = { en: "en_US", ru: "ru_RU", tr: "tr_TR" };

export type CompareSlug = keyof LandingContent["comparePages"];
export type CountrySlug = keyof LandingContent["countryPages"];
export const compareSlugs = Object.keys(en.comparePages) as CompareSlug[];
export const countrySlugs = Object.keys(en.countryPages) as CountrySlug[];

export const integrationNames = [
  "Stripe",
  "PayPal",
  "Wise",
  "Finik",
  "GoPay",
  "CJ Dropshipping",
  "Printful",
  "Printify",
  "Shippo",
  "Meta",
  "TikTok",
  "Telegram",
];

/** Fill `{name}` placeholders. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}
