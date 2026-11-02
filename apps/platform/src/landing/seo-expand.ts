/** Extra SEO landing pages (compare / countries / guides / glossary / tools). Merged into locale content. */

export type ComparePage = {
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  rows: { label: string; tes: string; other: string }[];
  chooseOther: { title: string; points: string[] };
  chooseUs: { title: string; points: string[] };
  showSavings: boolean;
};

export type CountryPage = {
  code: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  points: { title: string; desc: string }[];
};

export type GuidePage = {
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export type GlossaryPage = {
  title: string;
  description: string;
  term: string;
  definition: string;
  sections: { heading: string; body: string }[];
};

type L<T> = { en: T; ru: T; tr: T };

function pickLocale<T extends Record<string, L<unknown>>>(
  bag: T,
  locale: keyof L<unknown>
): { [K in keyof T]: T[K][typeof locale] } {
  const out = {} as { [K in keyof T]: T[K][typeof locale] };
  for (const key of Object.keys(bag) as (keyof T)[]) {
    const entry = bag[key];
    if (!entry) continue;
    out[key] = entry[locale] as T[typeof key][typeof locale];
  }
  return out;
}

const compareExtras = {
  woocommerce: {
    en: {
      name: "WooCommerce",
      title: "Tescommerce vs WooCommerce",
      description:
        "WooCommerce alternative without hosting, plugins, or Stripe country limits — Merchant of Record and payouts in 12 currencies.",
      eyebrow: "WooCommerce alternative",
      heading: "Sell without running WordPress infrastructure",
      intro:
        "WooCommerce is powerful if you want to own the stack. Tescommerce is for sellers who need payments and payouts working on day one — especially where Stripe onboarding is blocked.",
      rows: [
        { label: "Hosting & security", tes: "Included", other: "You manage" },
        { label: "Payment setup", tes: "MoR + Stripe built in", other: "Plugins + Stripe account" },
        { label: "Payouts where Stripe is limited", tes: "Yes, 12 currencies", other: "Depends on Stripe" },
        { label: "Maintenance", tes: "None", other: "Updates, backups, plugins" },
        { label: "Site builder", tes: "Visual sections", other: "Themes + page builders" },
      ],
      chooseOther: {
        title: "When WooCommerce is better",
        points: ["You need deep WordPress customization", "You already have a DevOps team"],
      },
      chooseUs: {
        title: "When Tescommerce is better",
        points: [
          "You want checkout and payouts without plugins",
          "Stripe or Shopify Payments don't work in your country",
        ],
      },
      showSavings: false,
    },
    ru: {
      name: "WooCommerce",
      title: "Tescommerce vs WooCommerce",
      description:
        "Альтернатива WooCommerce без хостинга и плагинов: Merchant of Record и выплаты в 12 валютах, даже где Stripe ограничен.",
      eyebrow: "Альтернатива WooCommerce",
      heading: "Продавайте без обслуживания WordPress",
      intro:
        "WooCommerce силён, если вы хотите владеть стеком. Tescommerce — для тех, кому платежи и выплаты нужны в первый день, особенно где Stripe не подключает продавцов.",
      rows: [
        { label: "Хостинг и безопасность", tes: "Включено", other: "На вас" },
        { label: "Платежи", tes: "MoR + Stripe", other: "Плагины + аккаунт Stripe" },
        { label: "Выплаты где Stripe ограничен", tes: "Да, 12 валют", other: "Зависит от Stripe" },
        { label: "Обслуживание", tes: "Нет", other: "Обновления, бэкапы, плагины" },
        { label: "Конструктор", tes: "Визуальные секции", other: "Темы + page builders" },
      ],
      chooseOther: {
        title: "Когда лучше WooCommerce",
        points: ["Нужна глубокая кастомизация WordPress", "Уже есть DevOps-команда"],
      },
      chooseUs: {
        title: "Когда лучше Tescommerce",
        points: ["Нужен checkout без плагинов", "Stripe или Shopify Payments не работают в вашей стране"],
      },
      showSavings: false,
    },
    tr: {
      name: "WooCommerce",
      title: "Tescommerce vs WooCommerce",
      description:
        "Hosting ve eklenti derdi olmadan WooCommerce alternatifi: Merchant of Record ve 12 para biriminde ödeme.",
      eyebrow: "WooCommerce alternatifi",
      heading: "WordPress altyapısı işletmeden sat",
      intro:
        "WooCommerce stack'e sahipsen güçlüdür. Tescommerce, özellikle Stripe'ın satıcı kabul etmediği yerlerde ödemelerin ilk günden çalışmasını ister.",
      rows: [
        { label: "Hosting ve güvenlik", tes: "Dahil", other: "Sen yönetirsin" },
        { label: "Ödeme kurulumu", tes: "MoR + Stripe", other: "Eklentiler + Stripe hesabı" },
        { label: "Stripe kısıtlıyken ödeme", tes: "Evet, 12 para birimi", other: "Stripe'a bağlı" },
        { label: "Bakım", tes: "Yok", other: "Güncelleme, yedek, eklenti" },
        { label: "Site oluşturucu", tes: "Görsel bölümler", other: "Tema + page builder" },
      ],
      chooseOther: {
        title: "WooCommerce ne zaman daha iyi",
        points: ["Derin WordPress özelleştirmesi lazım", "DevOps ekibin var"],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: ["Eklentisiz checkout istiyorsun", "Ülkende Stripe / Shopify Payments yok"],
      },
      showSavings: false,
    },
  },
  etsy: {
    en: {
      name: "Etsy",
      title: "Tescommerce vs Etsy",
      description:
        "Own your brand and customers instead of renting an Etsy listing — with global card checkout and payouts in 12 currencies.",
      eyebrow: "Etsy alternative",
      heading: "Keep the customer after the first sale",
      intro:
        "Etsy brings discovery, but fees and marketplace rules stack up. Tescommerce gives you your own store so email, brand and repeat buyers stay yours.",
      rows: [
        { label: "Customer ownership", tes: "Yours", other: "Marketplace owns traffic" },
        { label: "Brand & domain", tes: "Your store + domain", other: "Etsy shop" },
        { label: "Fees", tes: "5% or 3% platform", other: "Listing + transaction + ads" },
        { label: "Payout flexibility", tes: "12 currencies", other: "Etsy payout rules" },
        { label: "Digital + physical", tes: "Yes", other: "Yes" },
      ],
      chooseOther: {
        title: "When Etsy is better",
        points: ["You need Etsy search traffic to find buyers", "You sell one-off handmade items casually"],
      },
      chooseUs: {
        title: "When Tescommerce is better",
        points: ["You already have Instagram / TikTok traffic", "You want brand, email list and lower long-term fees"],
      },
      showSavings: false,
    },
    ru: {
      name: "Etsy",
      title: "Tescommerce vs Etsy",
      description:
        "Свой бренд и покупатели вместо аренды витрины на Etsy — глобальный checkout и выплаты в 12 валютах.",
      eyebrow: "Альтернатива Etsy",
      heading: "Оставьте покупателя после первой продажи",
      intro:
        "Etsy даёт трафик, но комиссии и правила маркетплейса растут. Tescommerce — свой магазин: email, бренд и повторные покупки остаются у вас.",
      rows: [
        { label: "Покупатель", tes: "Ваш", other: "Трафик у маркетплейса" },
        { label: "Бренд и домен", tes: "Свой магазин", other: "Магазин Etsy" },
        { label: "Комиссии", tes: "5% или 3%", other: "Листинг + транзакция + реклама" },
        { label: "Выплаты", tes: "12 валют", other: "Правила Etsy" },
        { label: "Цифра + физика", tes: "Да", other: "Да" },
      ],
      chooseOther: {
        title: "Когда лучше Etsy",
        points: ["Нужен поиск Etsy для первых покупателей", "Продаёте handmade эпизодически"],
      },
      chooseUs: {
        title: "Когда лучше Tescommerce",
        points: ["Уже есть трафик из Instagram / TikTok", "Нужны бренд, email и ниже комиссии вдолгую"],
      },
      showSavings: false,
    },
    tr: {
      name: "Etsy",
      title: "Tescommerce vs Etsy",
      description:
        "Etsy vitrini kiralamak yerine kendi markanı ve müşterini tut — küresel kart ödemesi ve 12 para biriminde ödeme.",
      eyebrow: "Etsy alternatifi",
      heading: "İlk satıştan sonra müşteriyi sende tut",
      intro:
        "Etsy keşif getirir ama ücretler ve kurallar birikir. Tescommerce kendi mağazanı verir; e-posta, marka ve tekrar satış sende kalır.",
      rows: [
        { label: "Müşteri sahipliği", tes: "Senin", other: "Trafik pazaryerinde" },
        { label: "Marka ve alan adı", tes: "Kendi mağaza", other: "Etsy shop" },
        { label: "Ücretler", tes: "%5 veya %3", other: "Listeleme + işlem + reklam" },
        { label: "Ödeme esnekliği", tes: "12 para birimi", other: "Etsy kuralları" },
        { label: "Dijital + fiziksel", tes: "Evet", other: "Evet" },
      ],
      chooseOther: {
        title: "Etsy ne zaman daha iyi",
        points: ["Alıcı bulmak için Etsy aramasına ihtiyacın var", "Ara sıra handmade satıyorsun"],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: ["Instagram / TikTok trafiğin var", "Marka, e-posta listesi ve uzun vadede daha düşük ücret istiyorsun"],
      },
      showSavings: false,
    },
  },
  wix: {
    en: {
      name: "Wix",
      title: "Tescommerce vs Wix",
      description:
        "Wix alternative focused on cross-border selling: Merchant of Record, local payouts, and checkout that works where Stripe seller accounts don't.",
      eyebrow: "Wix alternative",
      heading: "Built for getting paid — not only for pretty pages",
      intro:
        "Wix is strong at design. Tescommerce is built for sellers outside Shopify Payments / easy Stripe countries who still need a real store and payouts.",
      rows: [
        { label: "Merchant of Record", tes: "Yes", other: "No" },
        { label: "Payouts in KGS / KZT / UZS", tes: "Yes", other: "Limited" },
        { label: "Local QR payments (KG)", tes: "Finik, GoPay", other: "No" },
        { label: "Design flexibility", tes: "Focused templates", other: "Very high" },
        { label: "Apps stack for commerce", tes: "Built in", other: "Add-ons" },
      ],
      chooseOther: {
        title: "When Wix is better",
        points: ["You mainly need a brochure site", "Design freedom matters more than MoR payouts"],
      },
      chooseUs: {
        title: "When Tescommerce is better",
        points: ["You sell abroad and need payouts at home", "You want commerce features without app hopping"],
      },
      showSavings: false,
    },
    ru: {
      name: "Wix",
      title: "Tescommerce vs Wix",
      description:
        "Альтернатива Wix для трансграничных продаж: Merchant of Record, локальные выплаты и checkout там, где Stripe не даёт seller-аккаунт.",
      eyebrow: "Альтернатива Wix",
      heading: "Сделано чтобы получать деньги — не только красивые страницы",
      intro:
        "Wix силён в дизайне. Tescommerce — для продавцов вне стран Shopify Payments / простого Stripe, которым нужен магазин и выплаты.",
      rows: [
        { label: "Merchant of Record", tes: "Да", other: "Нет" },
        { label: "Выплаты в KGS / KZT / UZS", tes: "Да", other: "Ограничено" },
        { label: "Локальный QR (KG)", tes: "Finik, GoPay", other: "Нет" },
        { label: "Гибкость дизайна", tes: "Фокусные шаблоны", other: "Очень высокая" },
        { label: "Коммерция", tes: "Встроено", other: "Дополнения" },
      ],
      chooseOther: {
        title: "Когда лучше Wix",
        points: ["Нужен в основном сайт-визитка", "Дизайн важнее MoR и выплат"],
      },
      chooseUs: {
        title: "Когда лучше Tescommerce",
        points: ["Продаёте за рубеж и нужны выплаты дома", "Коммерция без зоопарка приложений"],
      },
      showSavings: false,
    },
    tr: {
      name: "Wix",
      title: "Tescommerce vs Wix",
      description:
        "Sınır ötesi satış odaklı Wix alternatifi: Merchant of Record, yerel ödemeler ve Stripe satıcı hesabının olmadığı yerlerde çalışan checkout.",
      eyebrow: "Wix alternatifi",
      heading: "Sadece güzel sayfa değil — ödeme almak için",
      intro:
        "Wix tasarımda güçlüdür. Tescommerce, Shopify Payments / kolay Stripe ülkeleri dışındaki satıcılar için mağaza ve ödeme sunar.",
      rows: [
        { label: "Merchant of Record", tes: "Evet", other: "Hayır" },
        { label: "KGS / KZT / UZS ödeme", tes: "Evet", other: "Sınırlı" },
        { label: "Yerel QR (KG)", tes: "Finik, GoPay", other: "Hayır" },
        { label: "Tasarım esnekliği", tes: "Odaklı şablonlar", other: "Çok yüksek" },
        { label: "Ticaret özellikleri", tes: "Yerleşik", other: "Eklentiler" },
      ],
      chooseOther: {
        title: "Wix ne zaman daha iyi",
        points: ["Asıl ihtiyacın tanıtım sitesi", "MoR ödemelerinden çok tasarım önemli"],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: ["Yurt dışına satıp evinde ödeme almak istiyorsun", "Uygulama labirentinden kaçınmak istiyorsun"],
      },
      showSavings: false,
    },
  },
  tilda: {
    en: {
      name: "Tilda",
      title: "Tescommerce vs Tilda",
      description:
        "Tilda alternative with real checkout, Merchant of Record, and payouts for CIS sellers who need more than landing pages.",
      eyebrow: "Tilda alternative",
      heading: "From landing page to orders you can fulfill",
      intro:
        "Tilda is excellent for marketing pages. Tescommerce is a commerce platform: catalog, checkout, payouts, digital delivery and shipping.",
      rows: [
        { label: "Full catalog & variants", tes: "Yes", other: "Limited / blocks" },
        { label: "Merchant of Record", tes: "Yes", other: "No" },
        { label: "Multi-currency payouts", tes: "12 currencies", other: "Depends on payment module" },
        { label: "Orders & inventory", tes: "Dashboard", other: "Basic / integrations" },
        { label: "Page design blocks", tes: "Focused", other: "Very strong" },
      ],
      chooseOther: {
        title: "When Tilda is better",
        points: ["You need a campaign landing, not a store", "Design blocks are the main job"],
      },
      chooseUs: {
        title: "When Tescommerce is better",
        points: ["You take repeat orders and need payouts", "You sell digital files or ship physical goods"],
      },
      showSavings: false,
    },
    ru: {
      name: "Tilda",
      title: "Tescommerce vs Tilda",
      description:
        "Альтернатива Tilda с полноценным checkout, Merchant of Record и выплатами для продавцов из СНГ — больше, чем лендинг.",
      eyebrow: "Альтернатива Tilda",
      heading: "От лендинга к заказам, которые можно выполнить",
      intro:
        "Tilda отлична для маркетинговых страниц. Tescommerce — коммерция: каталог, checkout, выплаты, цифровые файлы и доставка.",
      rows: [
        { label: "Каталог и варианты", tes: "Да", other: "Ограничено / блоки" },
        { label: "Merchant of Record", tes: "Да", other: "Нет" },
        { label: "Выплаты в валютах", tes: "12 валют", other: "Зависит от модуля оплаты" },
        { label: "Заказы и склад", tes: "Кабинет", other: "Базово / интеграции" },
        { label: "Дизайн-блоки", tes: "Фокусный набор", other: "Очень сильные" },
      ],
      chooseOther: {
        title: "Когда лучше Tilda",
        points: ["Нужен рекламный лендинг, не магазин", "Главное — дизайн-блоки"],
      },
      chooseUs: {
        title: "Когда лучше Tescommerce",
        points: ["Повторные заказы и выплаты", "Цифровые файлы или физическая доставка"],
      },
      showSavings: false,
    },
    tr: {
      name: "Tilda",
      title: "Tescommerce vs Tilda",
      description:
        "Gerçek checkout, Merchant of Record ve BDT satıcıları için ödemelerle Tilda alternatifi — landing'den fazlası.",
      eyebrow: "Tilda alternatifi",
      heading: "Landing'den yerine getirilebilir siparişlere",
      intro:
        "Tilda pazarlama sayfalarında mükemmel. Tescommerce ticaret platformu: katalog, checkout, ödeme, dijital teslimat ve kargo.",
      rows: [
        { label: "Katalog ve varyantlar", tes: "Evet", other: "Sınırlı / bloklar" },
        { label: "Merchant of Record", tes: "Evet", other: "Hayır" },
        { label: "Çok para birimli ödeme", tes: "12 para birimi", other: "Ödeme modülüne bağlı" },
        { label: "Sipariş ve stok", tes: "Panel", other: "Temel / entegrasyon" },
        { label: "Tasarım blokları", tes: "Odaklı", other: "Çok güçlü" },
      ],
      chooseOther: {
        title: "Tilda ne zaman daha iyi",
        points: ["Mağaza değil kampanya landing'i lazım", "Asıl iş tasarım blokları"],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: ["Tekrar sipariş ve ödeme almak istiyorsun", "Dijital dosya veya fiziksel kargo satıyorsun"],
      },
      showSavings: false,
    },
  },
  ecwid: {
    en: {
      name: "Ecwid",
      title: "Tescommerce vs Ecwid",
      description:
        "Ecwid alternative with Merchant of Record and payouts for sellers Shopify Payments and Stripe leave out.",
      eyebrow: "Ecwid alternative",
      heading: "A store that can pay you where you live",
      intro:
        "Ecwid embeds a shop into existing sites. Tescommerce is a full storefront plus MoR checkout aimed at cross-border sellers in underserved payout markets.",
      rows: [
        { label: "Merchant of Record", tes: "Yes", other: "No" },
        { label: "Standalone storefront", tes: "Yes", other: "Often embedded" },
        { label: "Regional payouts (CIS)", tes: "Yes", other: "Via connected processors" },
        { label: "Digital delivery", tes: "Built in", other: "Plan / apps" },
        { label: "Local QR (KG)", tes: "Yes", other: "No" },
      ],
      chooseOther: {
        title: "When Ecwid is better",
        points: ["You only need a widget on an existing site", "Your payment stack already works"],
      },
      chooseUs: {
        title: "When Tescommerce is better",
        points: ["You need MoR and home-currency payouts", "You want a branded store, not only a widget"],
      },
      showSavings: false,
    },
    ru: {
      name: "Ecwid",
      title: "Tescommerce vs Ecwid",
      description:
        "Альтернатива Ecwid с Merchant of Record и выплатами для продавцов, которых обходят Shopify Payments и Stripe.",
      eyebrow: "Альтернатива Ecwid",
      heading: "Магазин, который может платить вам там, где вы живёте",
      intro:
        "Ecwid встраивает витрину в существующий сайт. Tescommerce — полноценный магазин и MoR-checkout для трансграничных продавцов.",
      rows: [
        { label: "Merchant of Record", tes: "Да", other: "Нет" },
        { label: "Отдельная витрина", tes: "Да", other: "Часто виджет" },
        { label: "Выплаты в СНГ", tes: "Да", other: "Через подключённые процессоры" },
        { label: "Цифровая доставка", tes: "Встроено", other: "Тариф / приложения" },
        { label: "Локальный QR (KG)", tes: "Да", other: "Нет" },
      ],
      chooseOther: {
        title: "Когда лучше Ecwid",
        points: ["Нужен только виджет на готовом сайте", "Платёжный стек уже работает"],
      },
      chooseUs: {
        title: "Когда лучше Tescommerce",
        points: ["Нужны MoR и выплаты в домашней валюте", "Нужен бренд-магазин, не только виджет"],
      },
      showSavings: false,
    },
    tr: {
      name: "Ecwid",
      title: "Tescommerce vs Ecwid",
      description:
        "Shopify Payments ve Stripe'ın dışarıda bıraktığı satıcılar için Merchant of Record ve ödemelerle Ecwid alternatifi.",
      eyebrow: "Ecwid alternatifi",
      heading: "Yaşadığın yerde sana ödeme yapabilen mağaza",
      intro:
        "Ecwid mevcut sitelere mağaza gömer. Tescommerce, sınır ötesi satıcılar için tam vitrin + MoR checkout'tur.",
      rows: [
        { label: "Merchant of Record", tes: "Evet", other: "Hayır" },
        { label: "Bağımsız vitrin", tes: "Evet", other: "Çoğunlukla gömülü" },
        { label: "BDT ödemeleri", tes: "Evet", other: "Bağlı işlemcilere bağlı" },
        { label: "Dijital teslimat", tes: "Yerleşik", other: "Plan / uygulamalar" },
        { label: "Yerel QR (KG)", tes: "Evet", other: "Hayır" },
      ],
      chooseOther: {
        title: "Ecwid ne zaman daha iyi",
        points: ["Hazır sitede yalnızca widget lazım", "Ödeme yığınınız zaten çalışıyor"],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: ["MoR ve yerel para biriminde ödeme lazım", "Widget değil markalı mağaza istiyorsun"],
      },
      showSavings: false,
    },
  },
  insales: {
    en: {
      name: "InSales",
      title: "Tescommerce vs InSales",
      description:
        "InSales alternative for sellers who need global card payments and multi-currency payouts beyond a single regional market.",
      eyebrow: "InSales alternative",
      heading: "Sell past one regional ecommerce stack",
      intro:
        "InSales serves many CIS merchants well locally. Tescommerce focuses on MoR checkout for buyers worldwide and payouts in 12 currencies.",
      rows: [
        { label: "Global card buyers", tes: "230+ countries", other: "Strong regionally" },
        { label: "Merchant of Record", tes: "Yes", other: "Typically no" },
        { label: "Payout currencies", tes: "12 incl. KGS/KZT/UZS", other: "Local focus" },
        { label: "Digital products", tes: "Built in", other: "Available" },
        { label: "EN / RU / TR marketing site", tes: "Yes", other: "RU-first" },
      ],
      chooseOther: {
        title: "When InSales is better",
        points: ["Your buyers are mostly one local market", "You rely on InSales-specific apps"],
      },
      chooseUs: {
        title: "When Tescommerce is better",
        points: ["You sell to international card buyers", "You need MoR and multi-currency payouts"],
      },
      showSavings: false,
    },
    ru: {
      name: "InSales",
      title: "Tescommerce vs InSales",
      description:
        "Альтернатива InSales для тех, кому нужны глобальные карточные платежи и выплаты в нескольких валютах — не только один региональный рынок.",
      eyebrow: "Альтернатива InSales",
      heading: "Продавайте шире одного регионального стека",
      intro:
        "InSales хорошо закрывает локальный рынок СНГ. Tescommerce — MoR-checkout для покупателей по миру и выплаты в 12 валютах.",
      rows: [
        { label: "Карточные покупатели", tes: "230+ стран", other: "Сильно в регионе" },
        { label: "Merchant of Record", tes: "Да", other: "Обычно нет" },
        { label: "Валюты выплат", tes: "12, вкл. KGS/KZT/UZS", other: "Локальный фокус" },
        { label: "Цифровые товары", tes: "Встроено", other: "Есть" },
        { label: "Сайт EN / RU / TR", tes: "Да", other: "В первую очередь RU" },
      ],
      chooseOther: {
        title: "Когда лучше InSales",
        points: ["Покупатели в основном на одном локальном рынке", "Нужны приложения именно InSales"],
      },
      chooseUs: {
        title: "Когда лучше Tescommerce",
        points: ["Международные карточные покупатели", "Нужны MoR и мультивалютные выплаты"],
      },
      showSavings: false,
    },
    tr: {
      name: "InSales",
      title: "Tescommerce vs InSales",
      description:
        "Tek bir bölgesel pazarın ötesinde küresel kart ödemeleri ve çok para birimli ödemeler isteyenler için InSales alternatifi.",
      eyebrow: "InSales alternatifi",
      heading: "Tek bölgesel e-ticaret yığınının ötesine sat",
      intro:
        "InSales birçok BDT satıcısına yerelde iyi hizmet eder. Tescommerce dünya çapında alıcılar için MoR checkout ve 12 para biriminde ödeme odaklıdır.",
      rows: [
        { label: "Küresel kart alıcıları", tes: "230+ ülke", other: "Bölgeselde güçlü" },
        { label: "Merchant of Record", tes: "Evet", other: "Genelde hayır" },
        { label: "Ödeme para birimleri", tes: "12, KGS/KZT/UZS dahil", other: "Yerel odak" },
        { label: "Dijital ürünler", tes: "Yerleşik", other: "Var" },
        { label: "EN / RU / TR pazarlama", tes: "Evet", other: "Önce RU" },
      ],
      chooseOther: {
        title: "InSales ne zaman daha iyi",
        points: ["Alıcıların çoğu tek yerel pazarda", "InSales uygulamalarına bağımlısın"],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: ["Uluslararası kart alıcılarına satıyorsun", "MoR ve çok para birimli ödeme lazım"],
      },
      showSavings: false,
    },
  },
} as const satisfies Record<string, L<ComparePage>>;

const countryExtras = {
  tajikistan: {
    en: {
      code: "TJ",
      title: "Sell online from Tajikistan",
      description:
        "Open an online store from Tajikistan: accept cards from 230+ countries and get paid in USD or EUR with Tescommerce as Merchant of Record.",
      eyebrow: "Tajikistan",
      heading: "Online store from Tajikistan — paid even without local Stripe",
      intro:
        "Stripe and Shopify Payments do not onboard most Tajik sellers. Tescommerce is the seller at checkout so you can sell abroad and request payouts home.",
      points: [
        { title: "Buyers worldwide", desc: "Cards, Apple Pay, Google Pay and PayPal from 230+ countries." },
        { title: "Payouts in USD or EUR", desc: "Request a payout from your dashboard. Minimum is $50." },
        { title: "Merchant of Record", desc: "Tescommerce takes the payment and pays you the net amount." },
        { title: "Your brand", desc: "Subdomain instantly; custom domain on Growth and Pro." },
      ],
    },
    ru: {
      code: "TJ",
      title: "Интернет-магазин из Таджикистана",
      description:
        "Откройте магазин из Таджикистана: карты из 230+ стран и выплаты в USD или EUR. Tescommerce — Merchant of Record.",
      eyebrow: "Таджикистан",
      heading: "Магазин из Таджикистана — выплаты даже без локального Stripe",
      intro:
        "Stripe и Shopify Payments почти не подключают продавцов из Таджикистана. Tescommerce — продавец при оплате: продаёте за рубеж и запрашиваете выплату домой.",
      points: [
        { title: "Покупатели по миру", desc: "Карты, Apple Pay, Google Pay и PayPal из 230+ стран." },
        { title: "Выплаты в USD или EUR", desc: "Запрос в кабинете. Минимум $50." },
        { title: "Merchant of Record", desc: "Tescommerce принимает оплату и переводит вам net." },
        { title: "Свой бренд", desc: "Поддомен сразу; свой домен на Growth и Pro." },
      ],
    },
    tr: {
      code: "TJ",
      title: "Tacikistan'dan online sat",
      description:
        "Tacikistan'dan mağaza aç: 230+ ülkeden kart kabul et, Merchant of Record Tescommerce ile USD veya EUR ödeme al.",
      eyebrow: "Tacikistan",
      heading: "Tacikistan'dan online mağaza — yerel Stripe olmadan ödeme",
      intro:
        "Stripe ve Shopify Payments çoğu Tacik satıcıyı kabul etmez. Ödeme adımında satıcı Tescommerce'tir; yurt dışına satar, ödeme talep edersin.",
      points: [
        { title: "Dünya çapında alıcılar", desc: "230+ ülkeden kart, Apple Pay, Google Pay ve PayPal." },
        { title: "USD veya EUR ödeme", desc: "Panelinden talep et. Minimum 50 $." },
        { title: "Merchant of Record", desc: "Tescommerce ödemeyi alır, sana net tutarı öder." },
        { title: "Kendi markan", desc: "Hemen alt alan adı; Growth ve Pro'da özel alan adı." },
      ],
    },
  },
  armenia: {
    en: {
      code: "AM",
      title: "Sell online from Armenia",
      description:
        "Open an online store from Armenia with global card checkout and multi-currency payouts via Tescommerce Merchant of Record.",
      eyebrow: "Armenia",
      heading: "Sell from Armenia to card buyers worldwide",
      intro:
        "Build a branded store, take international cards, and request payouts without relying on Shopify Payments availability in your country.",
      points: [
        { title: "Global checkout", desc: "Cards and wallets for buyers in 230+ countries." },
        { title: "Payouts", desc: "USD or EUR from your dashboard (minimum $50)." },
        { title: "MoR", desc: "Tescommerce is the seller at checkout." },
        { title: "Digital & physical", desc: "Files, courses and shippable products in one store." },
      ],
    },
    ru: {
      code: "AM",
      title: "Интернет-магазин из Армении",
      description:
        "Магазин из Армении с глобальным карточным checkout и мультивалютными выплатами через Merchant of Record Tescommerce.",
      eyebrow: "Армения",
      heading: "Продавайте из Армении карточным покупателям по миру",
      intro:
        "Свой бренд-магазин, международные карты и выплаты — без зависимости от доступности Shopify Payments.",
      points: [
        { title: "Глобальный checkout", desc: "Карты и кошельки для 230+ стран." },
        { title: "Выплаты", desc: "USD или EUR из кабинета (минимум $50)." },
        { title: "MoR", desc: "Tescommerce — продавец при оплате." },
        { title: "Цифра и физика", desc: "Файлы, курсы и доставка в одном магазине." },
      ],
    },
    tr: {
      code: "AM",
      title: "Ermenistan'dan online sat",
      description:
        "Tescommerce Merchant of Record ile Ermenistan'dan küresel kart checkout ve çok para birimli ödeme.",
      eyebrow: "Ermenistan",
      heading: "Ermenistan'dan dünya çapında kart alıcılarına sat",
      intro:
        "Markalı mağaza kur, uluslararası kart kabul et, Shopify Payments'a bağlı kalmadan ödeme talep et.",
      points: [
        { title: "Küresel checkout", desc: "230+ ülke için kart ve cüzdanlar." },
        { title: "Ödemeler", desc: "Panelden USD veya EUR (minimum 50 $)." },
        { title: "MoR", desc: "Ödeme adımında satıcı Tescommerce'tir." },
        { title: "Dijital ve fiziksel", desc: "Dosya, kurs ve kargolanabilir ürünler tek mağazada." },
      ],
    },
  },
  georgia: {
    en: {
      code: "GE",
      title: "Sell online from Georgia",
      description:
        "Launch a store from Georgia: accept international cards and get paid via Tescommerce Merchant of Record.",
      eyebrow: "Georgia",
      heading: "Your store from Georgia for international buyers",
      intro:
        "Take orders from abroad while you keep a branded storefront and request payouts in supported currencies.",
      points: [
        { title: "International cards", desc: "Checkout for buyers across 230+ countries." },
        { title: "Payouts", desc: "Request USD or EUR from the dashboard." },
        { title: "MoR tax handling", desc: "Tescommerce acts as seller at checkout in many regions." },
        { title: "Builder", desc: "Themes and sections without hiring a developer." },
      ],
    },
    ru: {
      code: "GE",
      title: "Интернет-магазин из Грузии",
      description:
        "Запустите магазин из Грузии: международные карты и выплаты через Merchant of Record Tescommerce.",
      eyebrow: "Грузия",
      heading: "Магазин из Грузии для международных покупателей",
      intro:
        "Принимайте заказы из-за рубежа со своей витриной и запрашивайте выплаты в поддерживаемых валютах.",
      points: [
        { title: "Международные карты", desc: "Checkout для покупателей из 230+ стран." },
        { title: "Выплаты", desc: "USD или EUR из кабинета." },
        { title: "MoR", desc: "Tescommerce — продавец при оплате во многих регионах." },
        { title: "Конструктор", desc: "Темы и секции без разработчика." },
      ],
    },
    tr: {
      code: "GE",
      title: "Gürcistan'dan online sat",
      description:
        "Gürcistan'dan mağaza aç: uluslararası kart kabul et, Tescommerce Merchant of Record ile ödeme al.",
      eyebrow: "Gürcistan",
      heading: "Uluslararası alıcılar için Gürcistan'dan mağazan",
      intro:
        "Yurt dışından sipariş al, markalı vitrinini koru, desteklenen para birimlerinde ödeme talep et.",
      points: [
        { title: "Uluslararası kartlar", desc: "230+ ülke için checkout." },
        { title: "Ödemeler", desc: "Panelden USD veya EUR." },
        { title: "MoR", desc: "Birçok bölgede ödeme adımında satıcı Tescommerce'tir." },
        { title: "Oluşturucu", desc: "Geliştirici olmadan tema ve bölümler." },
      ],
    },
  },
  azerbaijan: {
    en: {
      code: "AZ",
      title: "Sell online from Azerbaijan",
      description:
        "Open an online store from Azerbaijan with global checkout and Tescommerce Merchant of Record payouts.",
      eyebrow: "Azerbaijan",
      heading: "Sell from Azerbaijan beyond local marketplaces",
      intro:
        "Keep your brand and customer list on your own store while accepting cards from buyers worldwide.",
      points: [
        { title: "Own the customer", desc: "Email and repeat sales stay on your domain." },
        { title: "Global cards", desc: "230+ countries at checkout." },
        { title: "Payouts", desc: "USD or EUR, minimum $50." },
        { title: "MoR", desc: "Tescommerce is the seller at checkout." },
      ],
    },
    ru: {
      code: "AZ",
      title: "Интернет-магазин из Азербайджана",
      description:
        "Магазин из Азербайджана с глобальным checkout и выплатами через Merchant of Record Tescommerce.",
      eyebrow: "Азербайджан",
      heading: "Продавайте из Азербайджана шире локальных маркетплейсов",
      intro:
        "Бренд и база покупателей на своём магазине — с приёмом карт от покупателей по всему миру.",
      points: [
        { title: "Свой покупатель", desc: "Email и повторные продажи на вашем домене." },
        { title: "Глобальные карты", desc: "230+ стран на checkout." },
        { title: "Выплаты", desc: "USD или EUR, минимум $50." },
        { title: "MoR", desc: "Tescommerce — продавец при оплате." },
      ],
    },
    tr: {
      code: "AZ",
      title: "Azerbaycan'dan online sat",
      description:
        "Tescommerce Merchant of Record ile Azerbaycan'dan küresel checkout ve ödeme.",
      eyebrow: "Azerbaycan",
      heading: "Yerel pazaryerlerinin ötesinde Azerbaycan'dan sat",
      intro:
        "Markanı ve müşteri listeni kendi mağazanda tut; dünya çapında kart kabul et.",
      points: [
        { title: "Müşteri sende", desc: "E-posta ve tekrar satış kendi alan adında." },
        { title: "Küresel kartlar", desc: "Checkout'ta 230+ ülke." },
        { title: "Ödemeler", desc: "USD veya EUR, minimum 50 $." },
        { title: "MoR", desc: "Ödeme adımında satıcı Tescommerce'tir." },
      ],
    },
  },
  turkey: {
    en: {
      code: "TR",
      title: "Sell online from Turkey",
      description:
        "Open an online store from Turkey: sell to 230+ countries and get paid in TRY or USD with Tescommerce.",
      eyebrow: "Turkey",
      heading: "Turkish sellers — global checkout, local payout currency",
      intro:
        "Run a branded storefront, accept international cards, and request payouts including TRY where supported.",
      points: [
        { title: "Payouts in TRY or USD", desc: "Request from the dashboard after sales clear." },
        { title: "Buyers abroad", desc: "Cards and wallets from 230+ countries." },
        { title: "TR locale", desc: "Marketing site and storefront language options." },
        { title: "MoR", desc: "Tescommerce is the seller at checkout." },
      ],
    },
    ru: {
      code: "TR",
      title: "Интернет-магазин из Турции",
      description:
        "Магазин из Турции: продажи в 230+ стран и выплаты в TRY или USD через Tescommerce.",
      eyebrow: "Турция",
      heading: "Продавцы из Турции — глобальный checkout и локальная валюта выплат",
      intro:
        "Своя витрина, международные карты и запрос выплат, включая TRY где поддерживается.",
      points: [
        { title: "Выплаты в TRY или USD", desc: "Запрос в кабинете после зачисления продаж." },
        { title: "Покупатели за рубежом", desc: "Карты и кошельки из 230+ стран." },
        { title: "Турецкая локаль", desc: "Маркетинг-сайт и языки витрины." },
        { title: "MoR", desc: "Tescommerce — продавец при оплате." },
      ],
    },
    tr: {
      code: "TR",
      title: "Türkiye'den online sat",
      description:
        "Türkiye'den mağaza aç: 230+ ülkeye sat, Tescommerce ile TRY veya USD ödeme al.",
      eyebrow: "Türkiye",
      heading: "Türk satıcılar — küresel checkout, yerel ödeme para birimi",
      intro:
        "Markalı vitrin çalıştır, uluslararası kart kabul et, desteklenen yerlerde TRY dahil ödeme talep et.",
      points: [
        { title: "TRY veya USD ödeme", desc: "Satışlar netleşince panelden talep et." },
        { title: "Yurt dışı alıcılar", desc: "230+ ülkeden kart ve cüzdan." },
        { title: "TR dil desteği", desc: "Pazarlama sitesi ve vitrin dil seçenekleri." },
        { title: "MoR", desc: "Ödeme adımında satıcı Tescommerce'tir." },
      ],
    },
  },
  mongolia: {
    en: {
      code: "MN",
      title: "Sell online from Mongolia",
      description:
        "Online store from Mongolia with international card checkout and Tescommerce Merchant of Record payouts.",
      eyebrow: "Mongolia",
      heading: "Sell from Mongolia to the world",
      intro:
        "When local Stripe seller onboarding is hard, MoR checkout lets you take global cards and request USD/EUR payouts.",
      points: [
        { title: "Global cards", desc: "Buyers in 230+ countries." },
        { title: "Payouts", desc: "USD or EUR, minimum $50." },
        { title: "MoR", desc: "Tescommerce is the merchant of record." },
        { title: "Store builder", desc: "Launch without a custom engineering team." },
      ],
    },
    ru: {
      code: "MN",
      title: "Интернет-магазин из Монголии",
      description:
        "Магазин из Монголии с международным карточным checkout и выплатами через Merchant of Record Tescommerce.",
      eyebrow: "Монголия",
      heading: "Продавайте из Монголии на весь мир",
      intro:
        "Если локальный Stripe seller сложно подключить, MoR-checkout принимает глобальные карты и выплаты в USD/EUR.",
      points: [
        { title: "Глобальные карты", desc: "Покупатели из 230+ стран." },
        { title: "Выплаты", desc: "USD или EUR, минимум $50." },
        { title: "MoR", desc: "Tescommerce — merchant of record." },
        { title: "Конструктор", desc: "Запуск без своей engineering-команды." },
      ],
    },
    tr: {
      code: "MN",
      title: "Moğolistan'dan online sat",
      description:
        "Uluslararası kart checkout ve Tescommerce Merchant of Record ödemeleriyle Moğolistan'dan online mağaza.",
      eyebrow: "Moğolistan",
      heading: "Moğolistan'dan dünyaya sat",
      intro:
        "Yerel Stripe satıcı onboarding'i zorsa, MoR checkout küresel kart alır; USD/EUR ödeme talep edersin.",
      points: [
        { title: "Küresel kartlar", desc: "230+ ülkede alıcılar." },
        { title: "Ödemeler", desc: "USD veya EUR, minimum 50 $." },
        { title: "MoR", desc: "Tescommerce merchant of record'dur." },
        { title: "Mağaza oluşturucu", desc: "Özel engineering ekibi olmadan aç." },
      ],
    },
  },
  egypt: {
    en: {
      code: "EG",
      title: "Sell online from Egypt",
      description:
        "Open a store from Egypt: accept international cards and get paid with Tescommerce Merchant of Record.",
      eyebrow: "Egypt",
      heading: "Egyptian sellers — checkout that reaches global buyers",
      intro:
        "Run your own storefront for creators and brands selling abroad when local payment options alone are not enough.",
      points: [
        { title: "Worldwide buyers", desc: "Cards and wallets across 230+ countries." },
        { title: "Payouts", desc: "USD or EUR from the dashboard." },
        { title: "Digital goods", desc: "Signed download links built in." },
        { title: "MoR", desc: "Tescommerce is the seller at checkout." },
      ],
    },
    ru: {
      code: "EG",
      title: "Интернет-магазин из Египта",
      description:
        "Магазин из Египта: международные карты и выплаты через Merchant of Record Tescommerce.",
      eyebrow: "Египет",
      heading: "Продавцы из Египта — checkout для глобальных покупателей",
      intro:
        "Своя витрина для креаторов и брендов, продающих за рубеж, когда одних локальных платежей мало.",
      points: [
        { title: "Покупатели по миру", desc: "Карты и кошельки в 230+ странах." },
        { title: "Выплаты", desc: "USD или EUR из кабинета." },
        { title: "Цифровые товары", desc: "Подписанные ссылки на скачивание." },
        { title: "MoR", desc: "Tescommerce — продавец при оплате." },
      ],
    },
    tr: {
      code: "EG",
      title: "Mısır'dan online sat",
      description:
        "Mısır'dan mağaza aç: uluslararası kart kabul et, Tescommerce Merchant of Record ile ödeme al.",
      eyebrow: "Mısır",
      heading: "Mısırlı satıcılar — küresel alıcılara ulaşan checkout",
      intro:
        "Yalnızca yerel ödemeler yetmediğinde yurt dışına satan yaratıcılar ve markalar için kendi vitrinin.",
      points: [
        { title: "Dünya çapında alıcılar", desc: "230+ ülkede kart ve cüzdan." },
        { title: "Ödemeler", desc: "Panelden USD veya EUR." },
        { title: "Dijital ürünler", desc: "İmzalı indirme linkleri yerleşik." },
        { title: "MoR", desc: "Ödeme adımında satıcı Tescommerce'tir." },
      ],
    },
  },
  pakistan: {
    en: {
      code: "PK",
      title: "Sell online from Pakistan",
      description:
        "Online store from Pakistan with global card payments and Tescommerce Merchant of Record payouts.",
      eyebrow: "Pakistan",
      heading: "Pakistani sellers — get paid for international orders",
      intro:
        "Take card payments from buyers worldwide and request payouts when Stripe seller coverage does not match your needs.",
      points: [
        { title: "Global cards", desc: "Checkout in 230+ countries." },
        { title: "Payouts", desc: "USD or EUR, minimum $50." },
        { title: "MoR", desc: "Tescommerce handles the sale at checkout." },
        { title: "Creators & physical", desc: "Files, courses and shipped goods." },
      ],
    },
    ru: {
      code: "PK",
      title: "Интернет-магазин из Пакистана",
      description:
        "Магазин из Пакистана с глобальными карточными платежами и выплатами через Merchant of Record Tescommerce.",
      eyebrow: "Пакистан",
      heading: "Продавцы из Пакистана — оплата за международные заказы",
      intro:
        "Принимайте карты покупателей по миру и запрашивайте выплаты, когда покрытие Stripe seller вам не подходит.",
      points: [
        { title: "Глобальные карты", desc: "Checkout в 230+ странах." },
        { title: "Выплаты", desc: "USD или EUR, минимум $50." },
        { title: "MoR", desc: "Tescommerce проводит продажу на checkout." },
        { title: "Креаторы и физика", desc: "Файлы, курсы и доставка." },
      ],
    },
    tr: {
      code: "PK",
      title: "Pakistan'dan online sat",
      description:
        "Küresel kart ödemeleri ve Tescommerce Merchant of Record ile Pakistan'dan online mağaza.",
      eyebrow: "Pakistan",
      heading: "Pakistanlı satıcılar — uluslararası siparişler için ödeme al",
      intro:
        "Stripe satıcı kapsamı ihtiyacını karşılamadığında dünya çapında kart al; ödeme talep et.",
      points: [
        { title: "Küresel kartlar", desc: "230+ ülkede checkout." },
        { title: "Ödemeler", desc: "USD veya EUR, minimum 50 $." },
        { title: "MoR", desc: "Checkout'ta satışı Tescommerce yürütür." },
        { title: "Yaratıcılar ve fiziksel", desc: "Dosya, kurs ve kargo." },
      ],
    },
  },
  nigeria: {
    en: {
      code: "NG",
      title: "Sell online from Nigeria",
      description:
        "Open an online store from Nigeria: accept international cards and get paid with Tescommerce Merchant of Record.",
      eyebrow: "Nigeria",
      heading: "Nigerian sellers — reach card buyers abroad",
      intro:
        "Build a branded store for international demand and request payouts in supported currencies from your dashboard.",
      points: [
        { title: "International checkout", desc: "Cards and wallets for 230+ countries." },
        { title: "Payouts", desc: "USD or EUR after approval (minimum $50)." },
        { title: "MoR", desc: "Tescommerce is the seller at checkout." },
        { title: "No card storage", desc: "Card data stays with Stripe PCI Level 1." },
      ],
    },
    ru: {
      code: "NG",
      title: "Интернет-магазин из Нигерии",
      description:
        "Магазин из Нигерии: международные карты и выплаты через Merchant of Record Tescommerce.",
      eyebrow: "Нигерия",
      heading: "Продавцы из Нигерии — карточные покупатели за рубежом",
      intro:
        "Свой бренд-магазин под международный спрос и выплаты в поддерживаемых валютах из кабинета.",
      points: [
        { title: "Международный checkout", desc: "Карты и кошельки для 230+ стран." },
        { title: "Выплаты", desc: "USD или EUR после одобрения (минимум $50)." },
        { title: "MoR", desc: "Tescommerce — продавец при оплате." },
        { title: "Карты не у нас", desc: "Данные карт остаются у Stripe PCI Level 1." },
      ],
    },
    tr: {
      code: "NG",
      title: "Nijerya'dan online sat",
      description:
        "Nijerya'dan mağaza aç: uluslararası kart kabul et, Tescommerce Merchant of Record ile ödeme al.",
      eyebrow: "Nijerya",
      heading: "Nijeryalı satıcılar — yurt dışında kart alıcılarına ulaş",
      intro:
        "Uluslararası talep için markalı mağaza kur; panelden desteklenen para birimlerinde ödeme talep et.",
      points: [
        { title: "Uluslararası checkout", desc: "230+ ülke için kart ve cüzdan." },
        { title: "Ödemeler", desc: "Onay sonrası USD veya EUR (minimum 50 $)." },
        { title: "MoR", desc: "Ödeme adımında satıcı Tescommerce'tir." },
        { title: "Kart saklanmaz", desc: "Kart verisi Stripe PCI Level 1'de kalır." },
      ],
    },
  },
} as const satisfies Record<string, L<CountryPage>>;

export const guidePages = {
  "accept-payments-kyrgyzstan": {
    en: {
      title: "How to accept payments from Kyrgyzstan in dollars",
      description:
        "Accept Finik/GoPay locally and international cards, then request USD or KGS payouts with Tescommerce Merchant of Record.",
      eyebrow: "Guide",
      heading: "How to accept payments from Kyrgyzstan in dollars",
      intro:
        "Sellers in Kyrgyzstan often need both local QR for domestic buyers and card checkout for abroad — plus a way to get paid in USD.",
      sections: [
        {
          heading: "Why Stripe alone is not enough",
          body: "Stripe seller accounts are not available for every country. If you cannot open a Stripe account as a Kyrgyz business, you need a Merchant of Record that can take the payment and pay you out.",
        },
        {
          heading: "Local + global in one store",
          body: "On Tescommerce, buyers in Kyrgyzstan can pay with Finik and GoPay QR, while buyers abroad use cards, Apple Pay, Google Pay and PayPal. You manage one catalog and one order list.",
        },
        {
          heading: "Getting dollars (or som)",
          body: "Paid orders add to your balance. Request a payout in KGS or USD from the dashboard (minimum $50). Payouts usually arrive within 3–7 business days after approval.",
        },
      ],
    },
    ru: {
      title: "Как принимать оплату из Кыргызстана в долларах",
      description:
        "Локально Finik/GoPay и карты из-за рубежа, затем выплаты в USD или KGS через Merchant of Record Tescommerce.",
      eyebrow: "Гайд",
      heading: "Как принимать оплату из Кыргызстана в долларах",
      intro:
        "Продавцам в Кыргызстане часто нужны и локальный QR для своих, и карточный checkout для заграницы — плюс способ получить деньги в USD.",
      sections: [
        {
          heading: "Почему одного Stripe мало",
          body: "Seller-аккаунт Stripe доступен не во всех странах. Если вы не можете открыть Stripe как бизнес в КР, нужен Merchant of Record, который примет оплату и выплатит вам.",
        },
        {
          heading: "Локально и глобально в одном магазине",
          body: "В Tescommerce покупатели в Кыргызстане платят через Finik и GoPay QR, а из-за рубежа — картами, Apple Pay, Google Pay и PayPal. Один каталог и один список заказов.",
        },
        {
          heading: "Доллары или сомы",
          body: "Оплаченные заказы попадают на баланс. Запросите выплату в KGS или USD (минимум $50). Обычно 3–7 рабочих дней после одобрения.",
        },
      ],
    },
    tr: {
      title: "Kırgızistan'dan dolar olarak ödeme nasıl alınır",
      description:
        "Yerelde Finik/GoPay ve yurt dışı kartlar; ardından Tescommerce Merchant of Record ile USD veya KGS ödeme.",
      eyebrow: "Rehber",
      heading: "Kırgızistan'dan dolar olarak ödeme nasıl alınır",
      intro:
        "Kırgızistan'daki satıcılar genelde yerli alıcılar için QR ve yurt dışı için kart checkout ister — üstüne USD tahsilat.",
      sections: [
        {
          heading: "Neden yalnızca Stripe yetmez",
          body: "Stripe satıcı hesabı her ülkede yok. Kırgız işletme olarak açamıyorsan, ödemeyi alıp sana ödeyecek bir Merchant of Record gerekir.",
        },
        {
          heading: "Tek mağazada yerel + küresel",
          body: "Tescommerce'te Kırgızistan'daki alıcılar Finik ve GoPay QR ile, yurt dışı kart / Apple Pay / Google Pay / PayPal ile öder. Tek katalog, tek sipariş listesi.",
        },
        {
          heading: "Dolar veya som",
          body: "Ödenen siparişler bakiyene eklenir. Panelden KGS veya USD talep et (minimum 50 $). Onay sonrası genelde 3–7 iş günü.",
        },
      ],
    },
  },
  "stripe-kazakhstan": {
    en: {
      title: "Stripe doesn't work in Kazakhstan — what to do",
      description:
        "If Stripe or Shopify Payments won't onboard you in Kazakhstan, use a Merchant of Record store to sell abroad and get paid in KZT or USD.",
      eyebrow: "Guide",
      heading: "Stripe doesn't work in Kazakhstan — what to do",
      intro:
        "Many Kazakh sellers hit a wall: great product, Instagram traffic, but no way to take international cards under their own Stripe account.",
      sections: [
        {
          heading: "The real blocker",
          body: "Without a usable seller payment account, Shopify Payments and similar stacks cannot pay you out. Marketplaces keep the customer; DMs don't scale.",
        },
        {
          heading: "Merchant of Record path",
          body: "Tescommerce acts as the seller at checkout. Buyers pay by card worldwide; you receive net payouts in KZT or USD from the dashboard.",
        },
        {
          heading: "Keep your brand",
          body: "Unlike pure marketplaces, you run your own storefront, collections and domain (on Growth/Pro) so repeat buyers come back to you.",
        },
      ],
    },
    ru: {
      title: "Stripe не работает в Казахстане — что делать",
      description:
        "Если Stripe или Shopify Payments не подключают вас в Казахстане, откройте магазин с Merchant of Record и получайте выплаты в KZT или USD.",
      eyebrow: "Гайд",
      heading: "Stripe не работает в Казахстане — что делать",
      intro:
        "У многих продавцов в Казахстане стена: хороший продукт и трафик из Instagram, но нет способа принимать международные карты на своём Stripe.",
      sections: [
        {
          heading: "В чём блокер",
          body: "Без рабочего seller-аккаунта Shopify Payments и похожие стеки не могут вам платить. Маркетплейсы забирают покупателя; директ не масштабируется.",
        },
        {
          heading: "Путь через Merchant of Record",
          body: "Tescommerce — продавец на checkout. Покупатели платят картой по миру; вы получаете net в KZT или USD из кабинета.",
        },
        {
          heading: "Свой бренд",
          body: "В отличие от чистых маркетплейсов — своя витрина, коллекции и домен (на Growth/Pro), чтобы покупатели возвращались к вам.",
        },
      ],
    },
    tr: {
      title: "Kazakistan'da Stripe çalışmıyor — ne yapmalı",
      description:
        "Kazakistan'da Stripe veya Shopify Payments seni kabul etmiyorsa Merchant of Record mağaza ile yurt dışına sat, KZT veya USD al.",
      eyebrow: "Rehber",
      heading: "Kazakistan'da Stripe çalışmıyor — ne yapmalı",
      intro:
        "Birçok Kazak satıcı duvara çarpar: iyi ürün, Instagram trafiği, ama kendi Stripe hesabıyla uluslararası kart yok.",
      sections: [
        {
          heading: "Asıl engel",
          body: "Kullanılabilir satıcı ödeme hesabı yoksa Shopify Payments benzeri yığınlar sana ödeme yapamaz. Pazaryerleri müşteriyi tutar; DM ölçeklenmez.",
        },
        {
          heading: "Merchant of Record yolu",
          body: "Ödeme adımında satıcı Tescommerce'tir. Alıcılar dünyanın her yerinden kartla öder; sen panelden KZT veya USD net ödeme alırsın.",
        },
        {
          heading: "Markanı koru",
          body: "Saf pazaryerlerinden farklı olarak kendi vitrin, koleksiyon ve (Growth/Pro'da) alan adın olur; tekrar alıcı sana döner.",
        },
      ],
    },
  },
  "sell-abroad-uzbekistan": {
    en: {
      title: "How to sell abroad from Uzbekistan",
      description:
        "Turn Instagram DM sales into a store: international cards, Meta tracking, and UZS or USD payouts with Tescommerce.",
      eyebrow: "Guide",
      heading: "How to sell abroad from Uzbekistan",
      intro:
        "DM sales work until volume grows. A storefront with checkout takes orders while you sleep and accepts payments from abroad.",
      sections: [
        {
          heading: "From Instagram to checkout",
          body: "List products once, share the link in bio and ads. Buyers pay without chatting for every order.",
        },
        {
          heading: "Ads attribution",
          body: "Meta Conversions API helps track Instagram ad sales even when browser cookies are limited.",
        },
        {
          heading: "Payouts home",
          body: "Request UZS or USD payouts from the Tescommerce dashboard after orders are paid (minimum $50).",
        },
      ],
    },
    ru: {
      title: "Как продавать за границу из Узбекистана",
      description:
        "Из Instagram DM в магазин: международные карты, трекинг Meta и выплаты в UZS или USD через Tescommerce.",
      eyebrow: "Гайд",
      heading: "Как продавать за границу из Узбекистана",
      intro:
        "Продажи в директ работают, пока объём маленький. Витрина с checkout принимает заказы, пока вы спите, и оплату из-за рубежа.",
      sections: [
        {
          heading: "Из Instagram в checkout",
          body: "Один раз заведите товары, дайте ссылку в bio и рекламе. Покупатель платит без переписки по каждому заказу.",
        },
        {
          heading: "Атрибуция рекламы",
          body: "Meta Conversions API помогает учитывать продажи с Instagram даже при ограниченных cookies.",
        },
        {
          heading: "Выплаты домой",
          body: "После оплаты заказов запросите UZS или USD в кабинете Tescommerce (минимум $50).",
        },
      ],
    },
    tr: {
      title: "Özbekistan'dan yurt dışına nasıl satılır",
      description:
        "Instagram DM satışını mağazaya çevir: uluslararası kartlar, Meta takibi, Tescommerce ile UZS veya USD ödeme.",
      eyebrow: "Rehber",
      heading: "Özbekistan'dan yurt dışına nasıl satılır",
      intro:
        "DM satışları hacim artana kadar işe yarar. Checkout'lu vitrin sen uyurken sipariş alır ve yurt dışından ödeme kabul eder.",
      sections: [
        {
          heading: "Instagram'dan checkout'a",
          body: "Ürünleri bir kez listele, bio ve reklamlarda link paylaş. Her sipariş için sohbet etmeden ödeme alınır.",
        },
        {
          heading: "Reklam ölçümü",
          body: "Meta Conversions API, çerezler kısıtlı olsa bile Instagram reklam satışlarını izlemeye yardım eder.",
        },
        {
          heading: "Eve ödeme",
          body: "Siparişler ödendikten sonra Tescommerce panelinden UZS veya USD talep et (minimum 50 $).",
        },
      ],
    },
  },
  "open-store-bishkek": {
    en: {
      title: "How to open an online store in Bishkek",
      description:
        "Step-by-step: create a Tescommerce store in Bishkek, add products, enable Finik/GoPay and international cards, then request payouts.",
      eyebrow: "Guide",
      heading: "How to open an online store in Bishkek",
      intro:
        "You do not need a local acquiring contract on day one. Sign up, publish a subdomain store, and start taking orders.",
      sections: [
        {
          heading: "1. Create the store",
          body: "Sign up at Tescommerce, pick a store name, and get a subdomain in minutes. Starter is free with a platform fee on sales.",
        },
        {
          heading: "2. Add products and payments",
          body: "Upload physical or digital products. Local buyers can use Finik/GoPay; international buyers pay by card. Connect shipping or dropshipping when you are ready.",
        },
        {
          heading: "3. Get paid",
          body: "When orders are paid, request a payout in KGS or USD from the dashboard. Complete verification before the first payout.",
        },
      ],
    },
    ru: {
      title: "Как открыть интернет-магазин в Бишкеке",
      description:
        "По шагам: магазин Tescommerce в Бишкеке, товары, Finik/GoPay и карты, затем выплаты.",
      eyebrow: "Гайд",
      heading: "Как открыть интернет-магазин в Бишкеке",
      intro:
        "В первый день не нужен свой эквайринг. Зарегистрируйтесь, опубликуйте магазин на поддомене и принимайте заказы.",
      sections: [
        {
          heading: "1. Создайте магазин",
          body: "Регистрация в Tescommerce, имя магазина и поддомен за минуты. Starter бесплатен с комиссией с продаж.",
        },
        {
          heading: "2. Товары и платежи",
          body: "Загрузите физические или цифровые товары. Локально — Finik/GoPay, из-за рубежа — карты. Доставку или дропшиппинг подключите когда будете готовы.",
        },
        {
          heading: "3. Получите деньги",
          body: "После оплаты заказов запросите выплату в KGS или USD. Перед первой выплатой пройдите верификацию.",
        },
      ],
    },
    tr: {
      title: "Bişkek'te online mağaza nasıl açılır",
      description:
        "Adım adım: Bişkek'te Tescommerce mağazası, ürünler, Finik/GoPay ve kartlar, sonra ödeme talebi.",
      eyebrow: "Rehber",
      heading: "Bişkek'te online mağaza nasıl açılır",
      intro:
        "İlk gün yerel acquiring sözleşmesi şart değil. Kaydol, alt alan adında yayınla, sipariş almaya başla.",
      sections: [
        {
          heading: "1. Mağazayı oluştur",
          body: "Tescommerce'e kaydol, isim seç, dakikalar içinde alt alan adı al. Starter ücretsiz; satıştan platform ücreti alınır.",
        },
        {
          heading: "2. Ürün ve ödemeler",
          body: "Fiziksel veya dijital ürün yükle. Yerel alıcılar Finik/GoPay, yurt dışı kart ile öder. Hazır olunca kargo veya dropshipping bağla.",
        },
        {
          heading: "3. Ödeme al",
          body: "Siparişler ödenince panelden KGS veya USD talep et. İlk ödemeden önce doğrulamayı tamamla.",
        },
      ],
    },
  },
  "shopify-alternative-kazakhstan": {
    en: {
      title: "Shopify alternative in Kazakhstan",
      description:
        "Shopify Payments is not available for many Kazakh sellers. Tescommerce is a Shopify alternative with MoR checkout and KZT/USD payouts.",
      eyebrow: "Guide",
      heading: "Shopify alternative in Kazakhstan",
      intro:
        "Shopify is excellent when Shopify Payments works. If it does not pay you in Kazakhstan, you need a stack that can still take global cards.",
      sections: [
        {
          heading: "What breaks on Shopify",
          body: "Without Shopify Payments you may pay extra fees or cannot get a workable payout path. Third-party gateways do not fix every country gap.",
        },
        {
          heading: "What Tescommerce replaces",
          body: "Storefront, checkout, email/reviews/digital basics, and MoR payouts in KZT or USD — without assembling four apps first.",
        },
        {
          heading: "When to stay on Shopify",
          body: "If you already operate successfully with Shopify Payments in another country or need a niche App Store only Shopify has, stay. Otherwise compare on /vs/shopify.",
        },
      ],
    },
    ru: {
      title: "Альтернатива Shopify в Казахстане",
      description:
        "Shopify Payments недоступен многим продавцам из Казахстана. Tescommerce — альтернатива с MoR-checkout и выплатами в KZT/USD.",
      eyebrow: "Гайд",
      heading: "Альтернатива Shopify в Казахстане",
      intro:
        "Shopify отличен, когда работает Shopify Payments. Если в Казахстане вам не платят — нужен стек, который всё равно принимает глобальные карты.",
      sections: [
        {
          heading: "Где ломается Shopify",
          body: "Без Shopify Payments часто выше комиссии или нет нормального пути выплат. Сторонний шлюз не закрывает каждый страновой разрыв.",
        },
        {
          heading: "Что закрывает Tescommerce",
          body: "Витрина, checkout, базовые email/отзывы/цифра и MoR-выплаты в KZT или USD — без сборки из четырёх приложений.",
        },
        {
          heading: "Когда остаться на Shopify",
          body: "Если Shopify Payments уже работает в другой стране или нужен нишевый App Store только Shopify — оставайтесь. Иначе сравните на /vs/shopify.",
        },
      ],
    },
    tr: {
      title: "Kazakistan'da Shopify alternatifi",
      description:
        "Birçok Kazak satıcı için Shopify Payments yok. Tescommerce MoR checkout ve KZT/USD ödeme ile Shopify alternatifidir.",
      eyebrow: "Rehber",
      heading: "Kazakistan'da Shopify alternatifi",
      intro:
        "Shopify Payments çalışıyorsa Shopify harikadır. Kazakistan'da sana ödeme yapmıyorsa yine de küresel kart alabilen bir yığın gerekir.",
      sections: [
        {
          heading: "Shopify'da ne bozulur",
          body: "Shopify Payments olmadan ekstra ücret veya workable ödeme yolu olmayabilir. Üçüncü taraf gateway her ülke boşluğunu kapatmaz.",
        },
        {
          heading: "Tescommerce neyi değiştirir",
          body: "Vitrin, checkout, temel e-posta/yorum/dijital ve KZT veya USD MoR ödemeleri — dört uygulama kurmadan.",
        },
        {
          heading: "Ne zaman Shopify'da kal",
          body: "Başka ülkede Shopify Payments ile zaten çalışıyorsan veya yalnızca Shopify'da olan niş App Store lazımsa kal. Değilse /vs/shopify karşılaştır.",
        },
      ],
    },
  },
} as const satisfies Record<string, L<GuidePage>>;

export const glossaryPages = {
  "merchant-of-record": {
    en: {
      title: "What is Merchant of Record (MoR)?",
      description:
        "Merchant of Record means Tescommerce is the seller at checkout: we take payment, handle tax in many regions, and pay you the net amount.",
      term: "Merchant of Record (MoR)",
      definition:
        "The legal seller of record on the buyer's receipt. With Tescommerce MoR, buyers pay Tescommerce; you receive payouts after fees.",
      sections: [
        {
          heading: "Why it matters",
          body: "If you cannot open Stripe or Shopify Payments in your country, MoR is often the only way to accept international cards legally under another entity.",
        },
        {
          heading: "What you still do",
          body: "You fulfill orders, set prices and run the storefront. Tescommerce handles the payment step and many cross-border tax collection cases.",
        },
      ],
    },
    ru: {
      title: "Что такое Merchant of Record (MoR)?",
      description:
        "Merchant of Record значит: Tescommerce — продавец на checkout: принимает оплату, в многих регионах налоги и выплачивает вам net.",
      term: "Merchant of Record (MoR)",
      definition:
        "Юридический продавец в чеке покупателя. При MoR Tescommerce покупатель платит Tescommerce; вы получаете выплаты после комиссий.",
      sections: [
        {
          heading: "Зачем это нужно",
          body: "Если в вашей стране нельзя открыть Stripe или Shopify Payments, MoR часто единственный способ легально принимать международные карты через другую сущность.",
        },
        {
          heading: "Что остаётся на вас",
          body: "Фулфилмент, цены и витрина. Tescommerce закрывает шаг оплаты и многие случаи трансграничного tax collection.",
        },
      ],
    },
    tr: {
      title: "Merchant of Record (MoR) nedir?",
      description:
        "Merchant of Record: ödeme adımında satıcı Tescommerce'tir; ödemeyi alır, birçok bölgede vergiyi üstlenir, sana net öder.",
      term: "Merchant of Record (MoR)",
      definition:
        "Alıcının fişindeki yasal satıcı. Tescommerce MoR'da alıcı Tescommerce'e öder; sen ücretler sonrası ödeme alırsın.",
      sections: [
        {
          heading: "Neden önemli",
          body: "Ülkende Stripe veya Shopify Payments açamıyorsan, uluslararası kartları başka bir tüzel kişi altında almak için MoR çoğu zaman tek yoldur.",
        },
        {
          heading: "Sende kalanlar",
          body: "Siparişi yerine getirmek, fiyat ve vitrin. Ödeme adımı ve birçok sınır ötesi vergi toplama Tescommerce'te.",
        },
      ],
    },
  },
  chargeback: {
    en: {
      title: "What is a chargeback?",
      description:
        "A chargeback is when a cardholder disputes a charge with their bank. Stores need reserves, fraud scoring and clear policies to survive disputes.",
      term: "Chargeback",
      definition:
        "A forced reversal of a card payment initiated by the buyer's bank after a dispute — not the same as a friendly refund you issue yourself.",
      sections: [
        {
          heading: "Why platforms care",
          body: "Too many chargebacks raise processor risk. Tescommerce scores orders and keeps a buyer-protection reserve so legitimate sellers and buyers are covered.",
        },
        {
          heading: "How to reduce them",
          body: "Clear product descriptions, fast fulfillment, tracking numbers and responsive support cut “item not received” and “not as described” disputes.",
        },
      ],
    },
    ru: {
      title: "Что такое chargeback?",
      description:
        "Chargeback — когда держатель карты оспаривает списание в банке. Магазинам нужны резерв, антифрод и понятные политики.",
      term: "Chargeback",
      definition:
        "Принудительный возврат карточного платежа по спору через банк покупателя — это не то же самое, что добровольный refund от продавца.",
      sections: [
        {
          heading: "Почему это важно платформе",
          body: "Много chargeback повышает риск у процессора. Tescommerce скорит заказы и держит резерв защиты покупателя.",
        },
        {
          heading: "Как снизить",
          body: "Понятные описания, быстрая отправка, трек-номера и поддержка режут споры «не получил» и «не как в описании».",
        },
      ],
    },
    tr: {
      title: "Chargeback nedir?",
      description:
        "Chargeback, kart sahibinin bankasıyla ücreti itiraz etmesidir. Mağazalar rezerv, fraud skoru ve net politikalarla ayakta kalır.",
      term: "Chargeback",
      definition:
        "Alıcının bankasının itiraz sonrası kart ödemesini zorunlu geri alması — senin verdiğin dostane iade ile aynı değildir.",
      sections: [
        {
          heading: "Platform neden önemser",
          body: "Çok chargeback işlemci riskini yükseltir. Tescommerce siparişleri skorlar ve alıcı koruma rezervi tutar.",
        },
        {
          heading: "Nasıl azaltılır",
          body: "Net ürün açıklaması, hızlı kargo, takip numarası ve destek; “gelmedi” / “anlatıldığı gibi değil” itirazlarını keser.",
        },
      ],
    },
  },
  "shopify-payments": {
    en: {
      title: "What is Shopify Payments?",
      description:
        "Shopify Payments is Shopify's built-in payment gateway — only available in selected countries. Elsewhere sellers need alternatives or face extra fees.",
      term: "Shopify Payments",
      definition:
        "Shopify's native payments product. Where it is unavailable, many stores cannot get a clean payout path on Shopify alone.",
      sections: [
        {
          heading: "Country availability",
          body: "Availability is published by Shopify and changes over time. If your country is missing, third-party gateways may add fees or still block onboarding.",
        },
        {
          heading: "Tescommerce angle",
          body: "Tescommerce targets sellers outside that map: MoR checkout, 12 payout currencies, and a full store without waiting for Shopify Payments to arrive.",
        },
      ],
    },
    ru: {
      title: "Что такое Shopify Payments?",
      description:
        "Shopify Payments — встроенный платёжный шлюз Shopify, только в отдельных странах. В остальных нужны альтернативы или выше комиссии.",
      term: "Shopify Payments",
      definition:
        "Нативный платёжный продукт Shopify. Где его нет, многим магазинам не хватает чистого пути выплат только на Shopify.",
      sections: [
        {
          heading: "Доступность по странам",
          body: "Список публикует Shopify и он меняется. Если вашей страны нет, сторонние шлюзы могут добавить комиссии или тоже не подключить.",
        },
        {
          heading: "Угол Tescommerce",
          body: "Tescommerce для продавцов вне этой карты: MoR-checkout, 12 валют выплат и магазин без ожидания Shopify Payments.",
        },
      ],
    },
    tr: {
      title: "Shopify Payments nedir?",
      description:
        "Shopify Payments, Shopify'ın yerleşik ödeme geçididir — yalnızca seçili ülkelerde. Diğerlerinde alternatif veya ekstra ücret gerekir.",
      term: "Shopify Payments",
      definition:
        "Shopify'ın yerel ödeme ürünü. Olmadığı yerde birçok mağaza yalnızca Shopify ile temiz ödeme yolu bulamaz.",
      sections: [
        {
          heading: "Ülke uygunluğu",
          body: "Listeyi Shopify yayınlar ve değişir. Ülken yoksa üçüncü taraf gateway ücret ekleyebilir veya yine onboarding engelleyebilir.",
        },
        {
          heading: "Tescommerce açısı",
          body: "Tescommerce bu haritanın dışındaki satıcılar için: MoR checkout, 12 ödeme para birimi, Shopify Payments beklemeden mağaza.",
        },
      ],
    },
  },
} as const satisfies Record<string, L<GlossaryPage>>;

export const seoHubCopy = {
  en: {
    pricingTitle: "Tescommerce pricing",
    pricingDescription:
      "Starter free with 5% fee, Growth $29/mo with 3% fee, Pro $79/mo — simple plans for cross-border sellers.",
    pricingHeading: "Simple pricing that grows with you",
    pricingIntro: "No surprise app stack. Pick a plan, open a store, get paid where you live.",
    savingsTitle: "Shopify vs Tescommerce fee calculator",
    savingsDescription:
      "Estimate monthly cost on Shopify Basic with third-party payment fees versus Tescommerce Starter or Growth.",
    savingsHeading: "Fee calculator: Shopify vs Tescommerce",
    savingsIntro: "Move the sliders to see when Tescommerce costs less — especially if you pay Shopify’s extra 2% without Shopify Payments.",
    guidesTitle: "Guides for sellers Shopify can’t pay",
    guidesDescription: "Practical how-tos: payments from Kyrgyzstan, Stripe in Kazakhstan, selling abroad from Uzbekistan, and more.",
    guidesHeading: "Guides",
    guidesIntro: "Short, practical pages for the search queries our sellers actually type.",
    glossaryTitle: "Ecommerce glossary — MoR, chargebacks, Shopify Payments",
    glossaryDescription: "Plain-language definitions of Merchant of Record, chargebacks and Shopify Payments for cross-border sellers.",
    glossaryHeading: "Glossary",
    glossaryIntro: "Terms you’ll see on this site and in payment docs — without the jargon fog.",
    readMore: "Read guide",
    openTerm: "Open term",
    toolsLabel: "Free tools",
    guidesLabel: "Guides",
    glossaryLabel: "Glossary",
    pricingLabel: "Pricing",
  },
  ru: {
    pricingTitle: "Тарифы Tescommerce",
    pricingDescription:
      "Starter бесплатно с комиссией 5%, Growth $29/мес с 3%, Pro $79/мес — простые планы для трансграничных продавцов.",
    pricingHeading: "Простые тарифы, которые растут вместе с вами",
    pricingIntro: "Без зоопарка приложений. Выберите план, откройте магазин, получайте выплаты дома.",
    savingsTitle: "Калькулятор комиссий Shopify vs Tescommerce",
    savingsDescription:
      "Оцените месячные затраты на Shopify Basic с доп. комиссией сторонних платежей против Tescommerce Starter или Growth.",
    savingsHeading: "Калькулятор: Shopify vs Tescommerce",
    savingsIntro: "Двигайте ползунки и смотрите, когда Tescommerce выгоднее — особенно если платите лишние 2% без Shopify Payments.",
    guidesTitle: "Гайды для продавцов, которым не платит Shopify",
    guidesDescription: "Практика: оплата из Кыргызстана, Stripe в Казахстане, продажи за рубеж из Узбекистана и другое.",
    guidesHeading: "Гайды",
    guidesIntro: "Короткие страницы под запросы, которые реально ищут наши продавцы.",
    glossaryTitle: "Глоссарий ecommerce — MoR, chargeback, Shopify Payments",
    glossaryDescription: "Простые определения Merchant of Record, chargeback и Shopify Payments для трансграничных продавцов.",
    glossaryHeading: "Глоссарий",
    glossaryIntro: "Термины с этого сайта и из платёжной документации — без тумана жаргона.",
    readMore: "Читать гайд",
    openTerm: "Открыть термин",
    toolsLabel: "Бесплатные инструменты",
    guidesLabel: "Гайды",
    glossaryLabel: "Глоссарий",
    pricingLabel: "Тарифы",
  },
  tr: {
    pricingTitle: "Tescommerce fiyatlandırma",
    pricingDescription:
      "Starter ücretsiz %5, Growth 29 $/ay %3, Pro 79 $/ay — sınır ötesi satıcılar için sade planlar.",
    pricingHeading: "Seninle birlikte büyüyen sade fiyatlar",
    pricingIntro: "Sürpriz uygulama yığını yok. Plan seç, mağaza aç, yaşadığın yerde ödeme al.",
    savingsTitle: "Shopify vs Tescommerce ücret hesaplayıcı",
    savingsDescription:
      "Shopify Basic + üçüncü taraf ödeme ücretini Tescommerce Starter veya Growth ile aylık karşılaştır.",
    savingsHeading: "Ücret hesaplayıcı: Shopify vs Tescommerce",
    savingsIntro: "Kaydırıcıları hareket ettir; özellikle Shopify Payments olmadan ekstra %2 ödüyorsan Tescommerce ne zaman daha ucuz gör.",
    guidesTitle: "Shopify'ın ödeme yapamadığı satıcılar için rehberler",
    guidesDescription: "Pratik: Kırgızistan'dan ödeme, Kazakistan'da Stripe, Özbekistan'dan yurt dışı satış ve daha fazlası.",
    guidesHeading: "Rehberler",
    guidesIntro: "Satıcılarımızın gerçekten aradığı sorgular için kısa sayfalar.",
    glossaryTitle: "E-ticaret sözlüğü — MoR, chargeback, Shopify Payments",
    glossaryDescription: "Sınır ötesi satıcılar için Merchant of Record, chargeback ve Shopify Payments'ın sade tanımları.",
    glossaryHeading: "Sözlük",
    glossaryIntro: "Bu sitede ve ödeme dokümanlarında göreceğin terimler — jargon sisinden uzak.",
    readMore: "Rehberi oku",
    openTerm: "Terimi aç",
    toolsLabel: "Ücretsiz araçlar",
    guidesLabel: "Rehberler",
    glossaryLabel: "Sözlük",
    pricingLabel: "Fiyatlar",
  },
} as const;

export type ExtraCompareSlug = keyof typeof compareExtras;
export type ExtraCountrySlug = keyof typeof countryExtras;
export type GuideSlug = keyof typeof guidePages;
export type GlossarySlug = keyof typeof glossaryPages;

export const guideSlugs = Object.keys(guidePages) as GuideSlug[];
export const glossarySlugs = Object.keys(glossaryPages) as GlossarySlug[];

export function extraCompareFor(locale: "en" | "ru" | "tr") {
  return pickLocale(compareExtras, locale);
}

export function extraCountryFor(locale: "en" | "ru" | "tr") {
  return pickLocale(countryExtras, locale);
}

export const seoContentPaths = [
  "/pricing",
  "/tools/savings",
  "/guides",
  ...guideSlugs.map((s) => `/guides/${s}`),
  "/glossary",
  ...glossarySlugs.map((s) => `/glossary/${s}`),
] as const;
