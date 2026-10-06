import type { Locale } from "./index.js";

type BlockCopy = {
  title?: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
  features?: { title: string; text: string }[];
};

type ThemeLocalePack = {
  announcementByExact?: Record<string, string>;
  defaultAnnouncement?: string;
  navLabels: Record<string, string>;
  blocksById?: Record<string, BlockCopy>;
  blocksByTitle: Record<string, BlockCopy>;
};

/** Russian (and regional) copy for default Tescommerce/demo theme blocks. */
const PACKS: Partial<Record<Locale, ThemeLocalePack>> = {
  ru: {
    defaultAnnouncement:
      "Бесплатная доставка от $75 — промокод SHIP75 при оформлении",
    announcementByExact: {
      "Free shipping on orders over $75 — use code SHIP75 at checkout":
        "Бесплатная доставка от $75 — промокод SHIP75 при оформлении",
    },
    navLabels: {
      Shop: "Магазин",
      "New arrivals": "Новинки",
      Sale: "Скидки",
      Contact: "Контакты",
    },
    blocksById: {
      blk_tes_hero: {
        title: "Покупайте умнее с Tescommerce",
        subtitle: "Подборка товаров, быстрая доставка и надёжная оплата.",
        ctaLabel: "В магазин",
      },
      blk_tes_features: {
        title: "Почему выбирают нас",
        features: [
          { title: "Быстрая доставка", text: "Большинство заказов отправляем в течение 24 часов." },
          { title: "Безопасная оплата", text: "Защищённый checkout (Stripe / GoPay)." },
          { title: "Простой возврат", text: "Возврат в течение 30 дней без лишней бюрократии." },
        ],
      },
      blk_tes_products: { title: "Хиты продаж" },
      blk_tes_banner: {
        title: "Весенняя коллекция — скидки до 25% на выбранные товары",
        ctaLabel: "Смотреть скидки",
      },
      blk_tes_reviews: { title: "Отзывы покупателей" },
      blk_tes_newsletter: {
        title: "Подпишитесь на рассылку Tescommerce",
        subtitle: "Новинки и акции — без спама.",
      },
      blk_tes_contact: {
        title: "Связаться с нами",
        subtitle: "Отвечаем в течение одного рабочего дня.",
        body: "Вопросы по заказам, товарам и партнёрству.",
      },
    },
    blocksByTitle: {
      "Shop smarter with Tescommerce": {
        title: "Покупайте умнее с Tescommerce",
        subtitle: "Подборка товаров, быстрая доставка и надёжная оплата.",
        ctaLabel: "В магазин",
      },
      "Why shoppers choose us": {
        title: "Почему выбирают нас",
        features: [
          { title: "Быстрая доставка", text: "Большинство заказов отправляем в течение 24 часов." },
          { title: "Безопасная оплата", text: "Защищённый checkout (Stripe / GoPay)." },
          { title: "Простой возврат", text: "Возврат в течение 30 дней без лишней бюрократии." },
        ],
      },
      Bestsellers: { title: "Хиты продаж" },
      "Spring collection is live — up to 25% off selected items": {
        title: "Весенняя коллекция — скидки до 25% на выбранные товары",
        ctaLabel: "Смотреть скидки",
      },
      "What customers say": { title: "Отзывы покупателей" },
      "Join the Tescommerce list": {
        title: "Подпишитесь на рассылку Tescommerce",
        subtitle: "Новинки и акции — без спама.",
      },
      "Contact us": {
        title: "Связаться с нами",
        subtitle: "Отвечаем в течение одного рабочего дня.",
        body: "Вопросы по заказам, товарам и партнёрству.",
      },
    },
  },
  ky: {
    defaultAnnouncement: "$75 дан жогору заказдарга акысыз жеткирүү — SHIP75",
    navLabels: {
      Shop: "Дүкөн",
      "New arrivals": "Жаңылар",
      Sale: "Арзандатуу",
      Contact: "Байланыш",
    },
    blocksByTitle: {
      "Shop smarter with Tescommerce": {
        title: "Tescommerce менен акылдуу сатып алыңыз",
        subtitle: "Тандалган товарлар, тез жеткирүү жана ишенимдүү төлөм.",
        ctaLabel: "Дүкөнгө",
      },
      "Why shoppers choose us": {
        title: "Эмне үчүн бизди тандашат",
        features: [
          { title: "Тез жеткирүү", text: "Көп заказдар 24 саат ичинде жөнөтүлөт." },
          { title: "Коопсуз төлөм", text: "Stripe / GoPay аркылуу корголгон төлөм." },
          { title: "Оңой кайтаруу", text: "30 күндүн ичинде кайтаруу." },
        ],
      },
    },
  },
  kk: {
    defaultAnnouncement: "$75-тен жоғары тапсырыстарға тегін жеткізу — SHIP75",
    navLabels: {
      Shop: "Дүкен",
      "New arrivals": "Жаңа",
      Sale: "Жеңілдік",
      Contact: "Байланыс",
    },
    blocksByTitle: {
      "Shop smarter with Tescommerce": {
        title: "Tescommerce-пен ақылды сатып алыңыз",
        subtitle: "Таңдаулы өнімдер, жылдам жеткізу және сенімді төлем.",
        ctaLabel: "Дүкенге",
      },
      "Why shoppers choose us": {
        title: "Неге бізді таңдайды",
        features: [
          { title: "Жылдам жеткізу", text: "Көптеген тапсырыстар 24 сағат ішінде жіберіледі." },
          { title: "Қауіпсіз төлем", text: "Stripe / GoPay арқылы қорғалған төлем." },
          { title: "Оңай қайтару", text: "30 күн ішінде қайтару." },
        ],
      },
    },
  },
  uz: {
    defaultAnnouncement: "$75 dan yuqori buyurtmalarga bepul yetkazish — SHIP75",
    navLabels: {
      Shop: "Do'kon",
      "New arrivals": "Yangiliklar",
      Sale: "Chegirma",
      Contact: "Aloqa",
    },
    blocksByTitle: {
      "Shop smarter with Tescommerce": {
        title: "Tescommerce bilan aqlli xarid qiling",
        subtitle: "Tanlangan mahsulotlar, tez yetkazish va ishonchli to'lov.",
        ctaLabel: "Do'konga",
      },
      "Why shoppers choose us": {
        title: "Nima uchun bizni tanlashadi",
        features: [
          { title: "Tez yetkazish", text: "Ko'p buyurtmalar 24 soat ichida jo'natiladi." },
          { title: "Xavfsiz to'lov", text: "Stripe / GoPay orqali himoyalangan to'lov." },
          { title: "Oson qaytarish", text: "30 kun ichida qaytarish." },
        ],
      },
    },
  },
};

function applyBlockCopy(
  block: Record<string, unknown>,
  copy: BlockCopy
): void {
  if (copy.title) block.title = copy.title;
  if (copy.subtitle) block.subtitle = copy.subtitle;
  if (copy.body) block.body = copy.body;
  if (copy.ctaLabel) block.ctaLabel = copy.ctaLabel;
  if (copy.features) block.features = copy.features;
}

function localizeBlock(
  block: Record<string, unknown>,
  pack: ThemeLocalePack
): void {
  const id = typeof block.id === "string" ? block.id : "";
  const title = typeof block.title === "string" ? block.title : "";
  const byId = id && pack.blocksById ? pack.blocksById[id] : undefined;
  const byTitle = title ? pack.blocksByTitle[title] : undefined;
  const copy = byId ?? byTitle;
  if (copy) applyBlockCopy(block, copy);
}

/** Apply locale-specific copy to parsed store theme (nav, blocks, announcement). */
export function localizeStoreTheme<T extends Record<string, unknown>>(
  theme: T,
  locale?: string
): T {
  if (!locale || locale === "en") return theme;
  const pack = PACKS[locale as Locale];
  if (!pack) return theme;

  const out = structuredClone(theme) as T & {
    announcementText?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    navLinks?: { label: string; path: string; header?: boolean; footer?: boolean }[];
    homeBlocks?: Record<string, unknown>[];
    globalBlocks?: Record<string, unknown>[];
  };

  const ann = out.announcementText;
  if (ann) {
    out.announcementText =
      pack.announcementByExact?.[ann] ??
      (pack.defaultAnnouncement && ann.includes("SHIP75")
        ? pack.defaultAnnouncement
        : ann);
  }

  const heroCopy: BlockCopy | undefined =
    (out.heroTitle ? pack.blocksByTitle[out.heroTitle] : undefined) ??
    pack.blocksByTitle["Shop smarter with Tescommerce"];
  if (heroCopy?.title && out.heroTitle) out.heroTitle = heroCopy.title;
  if (heroCopy?.subtitle && out.heroSubtitle) out.heroSubtitle = heroCopy.subtitle;

  for (const block of out.homeBlocks ?? []) localizeBlock(block, pack);
  for (const block of out.globalBlocks ?? []) localizeBlock(block, pack);

  if (out.navLinks?.length) {
    out.navLinks = out.navLinks.map((link) => ({
      ...link,
      label: pack.navLabels[link.label] ?? link.label,
    }));
  }

  return out as T;
}
