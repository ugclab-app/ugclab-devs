import type { LandingContent } from "./content";
import { extraCompareFor, extraCountryFor } from "./seo-expand";

/** Turkish landing copy. Mirrors the shape of `en` in content.ts. */
export const tr: LandingContent = {
  meta: {
    home: {
      title: "Tescommerce — Shopify'ın ödeme yapamadığı satıcılar için e-ticaret platformu",
      description:
        "Online mağaza aç, 230+ ülkeye sat ve 12 para biriminde ödeme al — Shopify Payments ve Stripe'ın çalışmadığı yerlerde bile. Merchant of Record, yerel ödemeler, dropshipping.",
    },
  },
  nav: {
    check: "Ülken",
    features: "Özellikler",
    savings: "Tasarruf",
    pricing: "Fiyatlar",
    faq: "SSS",
    signIn: "Giriş yap",
    getStarted: "Ücretsiz başla",
    menu: "Menü",
    close: "Kapat",
    language: "Dil",
  },
  hero: {
    badge: "Merchant of Record · 12 para biriminde ödeme",
    titleStart: "Dünyaya sat.",
    titleAccent: "Paranı yaşadığın yerde al.",
    subtitle:
      "Shopify Payments ve Stripe çoğu ülkede çalışmaz. Ödeme adımında satıcı Tescommerce'tir; böylece mağaza açar, 230+ ülkeden kart ödemesi alır ve paranı kendi para biriminde çekersin.",
    emailLabel: "E-posta adresin",
    emailPlaceholder: "sen@ornek.com",
    emailCta: "Ücretsiz başla",
    demo: "Demo mağazayı aç",
    note: "Kredi kartı gerekmez · Starter sonsuza kadar ücretsiz",
    previewNote: "Bu canlı demo mağaza, taslak değil.",
  },
  integrations: { title: "Birlikte çalıştıkları" },
  checker: {
    eyebrow: "Ülken",
    title: "Kendi ülkemden satabilir miyim?",
    subtitle: "Yaşadığın yeri seç; paranı nasıl alacağını ve alıcıların nasıl ödeyeceğini gör.",
    label: "Nerede yaşıyorsun?",
    other: "Başka bir ülke",
    payout: "Ödeme para birimi",
    buyers: "Alıcıların şununla öder",
    buyerMethods: "Kart, Apple Pay, Google Pay, PayPal",
    local: "Yerel ödeme yöntemleri",
    noLocal: "Henüz yok — kart ve cüzdanlar çalışır",
    mor: "Merchant of Record",
    morValue: "Evet — ödeme adımında satıcı Tescommerce'tir",
    shipping: "Kargo gönderebileceğin yerler",
    shippingValue: "230+ ülke ve bölge",
    cta: "Mağaza aç",
  },
  payouts: {
    eyebrow: "Ödemeler",
    title: "Shopify sana ödeme yapmasa bile mağaza aç",
    subtitle:
      "Shopify Payments yalnızca bazı ülkelerde çalışır. Ülken listede yoksa yine de Tescommerce'te başlayabilir ve paranı panelinden çekebilirsin.",
    steps: [
      {
        title: "Alıcı kartla öder",
        desc: "Sipariş panelinde görünür. Ülkenin Shopify Payments listesinde olması gerekmez.",
      },
      {
        title: "Bakiyene düşer",
        desc: "Ödenen siparişler, planının platform ücreti düşüldükten sonra çekebileceğin tutara eklenir.",
      },
      {
        title: "Ödeme talep edersin",
        desc: "12 para biriminden birini seç. Ödemeler onaydan sonra genellikle 3–7 iş günü içinde ulaşır. Minimum 50 $.",
      },
    ],
  },
  features: {
    eyebrow: "Özellikler",
    title: "Sınır ötesi satış için gereken her şey",
    subtitle: "Ödeme, para çekme, kargo ve pazarlama tek yerde — geliştirici tutmadan.",
    items: [
      {
        title: "Merchant of Record",
        desc: "Ödeme adımında satıcı Tescommerce'tir ve birçok bölgede vergi tahsilatını üstlenir; sen net ödemeni alırsın.",
      },
      {
        title: "12 para biriminde ödeme",
        desc: "USD, EUR, GBP, TRY, KGS, KZT ve daha fazlası. Ülkenin Shopify Payments listesinde olması gerekmez.",
      },
      {
        title: "Yerel ödemeler",
        desc: "Kırgızistan'da Finik ve GoPay QR; yanında Stripe üzerinden kart, Apple Pay, Google Pay ve PayPal.",
      },
      {
        title: "Dünyaya sat",
        desc: "230+ ülkeye kargo gönder, ülkeye göre fiyat belirle ve kendi alan adını kullan.",
      },
      {
        title: "Dropshipping ve kargo",
        desc: "CJ Dropshipping, Printful veya Printify'ı bağla. Shippo ile etiket al ya da bölgeye göre sabit ücret kullan.",
      },
      {
        title: "Dijital ve fiziksel",
        desc: "İmzalı indirme bağlantılarıyla dosya, kurs ve preset; varyantlı fiziksel ürünler.",
      },
    ],
  },
  useCases: {
    eyebrow: "Kimin için",
    title: "Satış şekline göre kuruldu",
    tabs: [
      {
        label: "İçerik üreticileri",
        title: "Dosya, kurs ve abonelik sat",
        desc: "Dosyayı bir kez yükle; her alıcı ödemeden hemen sonra güvenli bir bağlantı alsın.",
        points: [
          "Limitli ve süreli imzalı indirme bağlantıları",
          "Aylık veya yıllık abonelikler",
          "Alıcılarına e-posta kampanyaları",
          "Alıcıların para biriminde fiyatlar",
        ],
      },
      {
        label: "Markalar",
        title: "Fiziksel ürün markası yönet",
        desc: "Küçük bir markanın ilk satıştan sonra ihtiyaç duyduğu her şey, bir yığın ücretli uygulama olmadan.",
        points: [
          "Varyantlar, stok ve azalan stok uyarıları",
          "Kargo bölgeleri ve Shippo etiketleri",
          "Yorumlar, favoriler ve stoğa gelince haber ver",
          "Setler, adet indirimleri ve hediye paketi",
        ],
      },
      {
        label: "Dropshipper'lar",
        title: "Stok tutmadan başla",
        desc: "Tedarikçilerden ürün aktar; siparişi doğrudan alıcına onlar göndersin.",
        points: [
          "CJ Dropshipping, Printful ve Printify",
          "Markets ile ülkeye göre fiyat",
          "Meta ve TikTok Conversions API",
          "Telegram'da sipariş bildirimleri",
        ],
      },
    ],
  },
  demo: {
    eyebrow: "Canlı demo",
    title: "Gerçek bir vitrin gör — taslak değil",
    desc: "Tescommerce demo mağazasını gez: koleksiyonlar, ürün sayfaları ve ödeme — alıcıların göreceğinin aynısı.",
    cta: "Demo mağazayı aç →",
  },
  builder: {
    eyebrow: "Site oluşturucu",
    title: "Mağazanı geliştirici olmadan tasarla",
    subtitle: "Sürükle-bırak bölümler, hazır temalar ve canlı önizleme. Hazır olunca yayınla.",
    cards: [
      { title: "Temalar ve presetler", desc: "Hazır düzenlerden başla ya da kendi marka presetini kaydet." },
      {
        title: "Blok kütüphanesi",
        desc: "Hero, ürünler, SSS, bülten, fiyatlar, sekmeler, iletişim — istediğin gibi birleştir.",
      },
      { title: "Mobil ve tablet", desc: "Yayınlamadan önce her ekran boyutunu önizle." },
    ],
    editor: "Vitrin editörü",
    devices: ["Masaüstü", "Tablet", "Mobil"],
    blocksTitle: "Bloklar",
    blocks: ["Hero", "Öne çıkan ürünler", "Güven şeridi", "Bülten", "SSS"],
    heroTitle: "Markan, tek mağaza",
    shopNow: "Alışverişe başla",
    products: ["Ürün A", "Ürün B", "Ürün C"],
    addBlock: "+ Blok ekle",
  },
  facts: {
    eyebrow: "Erken erişim",
    title: "Ödeme haritasının dışında kalan satıcılar için",
    subtitle: "Yeni başladık. Her erken mağaza doğrudan kurucudan destek alır.",
    items: [
      { value: "230+", label: "alıcılarının sipariş verebileceği ülke" },
      { value: "12", label: "ödeme para birimi, TRY, KGS ve KZT dahil" },
      { value: "MoR", label: "ödeme adımında satıcı Tescommerce'tir" },
      { value: "40+", label: "panel bölümü, siparişlerden kohortlara" },
    ],
  },
  savings: {
    eyebrow: "Tasarruf",
    title: "Shopify'da ve Tescommerce'te ne ödersin",
    subtitle:
      "Shopify Payments kullanamadığında Shopify fazladan %2 alır ve çoğu mağaza üstüne ücretli uygulamalar ekler.",
    salesLabel: "Aylık satışın",
    appsLabel: "İhtiyaç duyacağın Shopify uygulamaları",
    apps: [
      { id: "email", label: "E-posta pazarlama (Klaviyo)", price: 30 },
      { id: "reviews", label: "Ürün yorumları (Judge.me)", price: 15 },
      { id: "digital", label: "Dijital indirmeler (Sky Pilot)", price: 12.99 },
    ],
    shopifyTitle: "Shopify Basic",
    shopifyPlan: "Plan",
    shopifyApps: "Uygulamalar",
    shopifyFee: "%2 üçüncü taraf ödeme ücreti",
    tesTitle: "Tescommerce",
    starter: "Starter: %5 platform ücreti",
    growth: "Growth: 29 $ + %3 platform ücreti",
    total: "Aylık toplam",
    save: "Ayda {month}, yılda {year} tasarruf edersin",
    moreExpensive:
      "Bu hacimde Shopify daha ucuz — eğer ülkende Shopify Payments çalışıyorsa. Çalışmıyorsa Shopify sana hiç ödeme yapamaz.",
    footnote:
      "Kart işlem ücretleri iki platformda da vardır ve hesaba katılmamıştır. Shopify ve uygulama fiyatları 2026 tarihli açık fiyat sayfalarından alınmıştır.",
  },
  how: {
    eyebrow: "Nasıl çalışır",
    title: "Mağazanı 3 adımda aç",
    steps: [
      { title: "Mağazanı oluştur", desc: "Kaydol, bir isim seç ve birkaç dakikada alt alan adını al." },
      { title: "Ürün ekle", desc: "Dijital dosya yükle ya da varyantlı fiziksel ürün ekle." },
      {
        title: "Paranı al",
        desc: "Bağlantıyı paylaş. Alıcı ödediğinde panelinden ödeme talep et.",
      },
    ],
  },
  compare: {
    eyebrow: "Karşılaştır",
    title: "Tescommerce diğerlerine karşı",
    subtitle: "Vitrin, ödeme, dijital teslimat ve global satış için tek platform — dört ayrı araç yerine.",
    vs: "vs",
    rows: [
      { label: "Başlangıç fiyatı", values: ["Ücretsiz + %5", "39 $/ay", "29 $/ay", "%10 ücret"] },
      { label: "Shopify Payments ülkeleri dışında ödeme", values: ["Evet", "Hayır", "—", "Evet"] },
      { label: "Merchant of Record (MoR)", values: [true, false, false, true] },
      { label: "Yerel ödemeler (QR, banka uygulamaları)", values: [true, false, false, false] },
      { label: "Görsel site oluşturucu", values: [true, true, true, false] },
      {
        label: "Fiziksel + dijital ürünler",
        values: [true, true, "Dijital odaklı", "Yalnızca dijital"],
      },
      { label: "Özel alan adı", values: [true, true, true, false] },
      { label: "Personel hesapları", values: [true, true, false, false] },
    ],
  },
  security: {
    eyebrow: "Güven ve güvenlik",
    title: "Başkalarının parasını taşımak için kuruldu",
    subtitle: "Kart verisi sunucularımıza hiç uğramaz: ödeme, PCI DSS Level 1 sertifikalı Stripe üzerinde çalışır.",
    items: [
      { title: "Dolandırıcılık skoru", desc: "Her sipariş kargolamadan önce 0–100 arası risk skoru alır." },
      { title: "Alıcı koruma rezervi", desc: "Rezerv iade ve itirazları karşılar; alıcılar mağazana güvenir." },
      { title: "Satıcı doğrulama", desc: "Ödemelerden önce KYC kontrolü dolandırıcıları platformdan uzak tutar." },
      { title: "2FA ve roller", desc: "İki adımlı giriş ve ekibin için rol bazlı erişim." },
    ],
  },
  pricing: {
    eyebrow: "Fiyatlar",
    title: "Seninle büyüyen basit fiyatlar",
    mostPopular: "En popüler",
    breakEven: "Ayda 1.450 $ üzeri satışta Growth, Starter'dan daha ucuza gelir.",
    plans: [
      {
        name: "Starter",
        price: "Ücretsiz",
        period: "sonsuza kadar",
        desc: "Fikrini test etmek için",
        features: ["50 ürüne kadar", "Alt alan adında mağaza", "%5 platform ücreti", "E-posta desteği"],
        cta: "Ücretsiz başla",
        highlighted: false,
      },
      {
        name: "Growth",
        price: "29 $",
        period: "/ay",
        desc: "Büyüyen markalar için",
        features: ["Sınırsız ürün", "Özel alan adı", "%3 platform ücreti", "Stripe Tax hazır", "Öncelikli destek"],
        cta: "Denemeye başla",
        highlighted: true,
      },
      {
        name: "Pro",
        price: "79 $",
        period: "/ay",
        desc: "Ekipler ve büyük satıcılar",
        features: ["Growth'taki her şey", "Personel hesapları", "API erişimi", "Gelişmiş analitik"],
        cta: "Başla",
        highlighted: false,
      },
    ],
  },
  founder: {
    eyebrow: "Arkasında kim var",
    title: "Destek kuyruğuyla değil, kurucuyla konuş",
    name: "Mustafa Sadyrov",
    role: "Kurucu ve CEO, Tescommerce",
    quote:
      "Tescommerce'i kurdum çünkü bölgemdeki satıcılar harika ürünler yapıyor ama online ödeme alamıyordu. Her erken mağazanın açılışına bizzat yardım ediyorum.",
    telegram: "Telegram'dan yaz",
  },
  faq: {
    eyebrow: "SSS",
    title: "Sık sorulan sorular",
    items: [
      {
        q: "Ülkemde Shopify Payments yok. Yine de ödeme alabilir miyim?",
        a: "Evet. Mağazayı aç, siparişi al ve panelinden USD, EUR, TRY, KGS ve KZT dahil 12 para biriminden birinde ödeme talep et. Ödemeler onaydan sonra genellikle 3–7 iş günü içinde ulaşır. Minimum 50 $.",
      },
      {
        q: "Tescommerce hangi ücretleri alır?",
        a: "Starter ücretsizdir, satışlardan %5 platform ücreti alınır. Growth ayda 29 $ ve %3 ücrettir. Kart işlemleri standart Stripe oranlarıyla ücretlendirilir.",
      },
      {
        q: "Merchant of Record (MoR) nedir?",
        a: "Ödeme adımında satıcı olarak Tescommerce görünür: ödemeyi biz alırız, birçok bölgede vergi tahsilatını üstleniriz ve sana net tutarı öderiz. Ülke ülke vergi kaydı yaptırman gerekmez.",
      },
      {
        q: "Kendi alan adımı kullanabilir miyim?",
        a: "Evet. Growth ve Pro planlarında özel alan adı bağlayabilirsin. O zamana kadar mağazan kayıt olur olmaz markalı bir alt alan adında yayındadır.",
      },
      {
        q: "Dijital indirmeleri destekliyor musunuz?",
        a: "Evet — dosya, kurs ve presetleri güvenli imzalı bağlantılar, süre ve indirme limitiyle sat. Fiziksel ürünler ve kargo bölgeleri de desteklenir.",
      },
      {
        q: "Dropshipping yapabilir miyim?",
        a: "Evet. CJ Dropshipping, Printful veya Printify'ı bağla, ürünleri aktar; siparişler tedarikçiye gider ve alıcına onlar gönderir.",
      },
      {
        q: "Stripe nerede devreye giriyor?",
        a: "Ödeme Stripe üzerinde çalışır (kart, Apple Pay, Google Pay — mevcut olduğu yerlerde). Ham kart numaralarını hiçbir zaman saklamayız.",
      },
      {
        q: "Tescommerce GDPR'a uygun mu?",
        a: "AB alıcıları için gizlilik kontrolleri, onay uyumlu ödeme ve veri dışa aktarma sunuyoruz. Mağaza politikalarından ve yasal dayanaktan sen sorumlusun.",
      },
      {
        q: "Shopify'dan farkı ne?",
        a: "Shopify uygulamaları ve temalarıyla büyük bir ekosistem, ama yalnızca Shopify Payments ülkelerindeki satıcılara ödeme yapar. Tescommerce Merchant of Record'dur, 12 para biriminde öder; e-posta, yorumlar ve dijital teslimat ekstra uygulama olmadan içinde gelir.",
      },
    ],
  },
  finalCta: {
    title: "Mağazanı aç ve paranı al",
    desc: "Starter sonsuza kadar ücretsiz. Tescommerce'te başla, satışların büyüyünce planını yükselt.",
    cta: "Ücretsiz başla",
  },
  footer: {
    rights: "Tüm hakları saklıdır.",
    product: "Ürün",
    compare: "Karşılaştır",
    countries: "Nereden satılır",
    company: "Şirket",
    partners: "Partnerler",
    status: "Durum",
    privacy: "Gizlilik",
    terms: "Koşullar",
    login: "Satıcı girişi",
    pricing: "Fiyatlar",
    guides: "Rehberler",
    glossary: "Sözlük",
    tools: "Ücretsiz araçlar",
    savingsTool: "Ücret hesaplayıcı",
  },
  sticky: "Ücretsiz başla",
  backHome: "← Tescommerce ana sayfa",
  comparePages: {
    shopify: {
      name: "Shopify",
      title: "Tescommerce vs Shopify",
      description:
        "Shopify Payments ülkeleri dışındaki satıcılar için Shopify alternatifi: Merchant of Record, 12 para biriminde ödeme, yerleşik e-posta ve yorumlar.",
      eyebrow: "Shopify alternatifi",
      heading: "Sana gerçekten ödeme yapabilen Shopify alternatifi",
      intro:
        "Shopify harika bir platform — Shopify Payments ülkesinde yaşıyorsan. Diğer her yerde her satıştan fazladan %2 ödersin ya da hiç ödeme alamazsın.",
      rows: [
        { label: "Başlangıç fiyatı", tes: "Ücretsiz + %5", other: "39 $/ay" },
        { label: "Shopify Payments ülkeleri dışında ödeme", tes: "Evet, 12 para birimi", other: "Hayır" },
        { label: "Üçüncü taraf ödeme sağlayıcı ücreti", tes: "Yok", other: "Satış başına +%2" },
        { label: "Merchant of Record", tes: "Evet", other: "Hayır" },
        { label: "E-posta pazarlama", tes: "Yerleşik", other: "Ücretli uygulama" },
        { label: "Ürün yorumları", tes: "Yerleşik", other: "Ücretli uygulama" },
        { label: "Dijital indirmeler", tes: "Yerleşik", other: "Ücretli uygulama" },
        { label: "Uygulama mağazası ve temalar", tes: "Odaklı set", other: "Binlerce" },
      ],
      chooseOther: {
        title: "Shopify ne zaman daha iyi",
        points: [
          "Shopify Payments ülkesinde yaşıyorsun ve ayda ~7.000 $ üzeri satıyorsun",
          "Yalnızca Shopify App Store'da olan niş bir uygulamaya ihtiyacın var",
          "Shopify'ı zaten bilen büyük bir ekibin var",
        ],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: [
          "Ülkende Shopify Payments veya Stripe çalışmıyor",
          "Her ülkede ayrı vergi kaydı yaptırmak istemiyorsun",
          "E-posta, yorumlar ve dijital teslimatı uygulama parası ödemeden istiyorsun",
        ],
      },
      showSavings: true,
    },
    gumroad: {
      name: "Gumroad",
      title: "Tescommerce vs Gumroad",
      description:
        "Daha düşük ücret, kendi markalı mağazan, özel alan adı ve fiziksel ürünlerle Gumroad alternatifi — 12 para biriminde ödeme.",
      eyebrow: "Gumroad alternatifi",
      heading: "Her satıştan Gumroad'dakinden fazlasını elinde tut",
      intro:
        "Gumroad kolay, ama her satışın %10'unu alır ve sana mağaza değil profil sayfası verir. Tescommerce de Merchant of Record — %5 veya %3 ile.",
      rows: [
        { label: "Platform ücreti", tes: "%5 (Starter) veya %3 (Growth)", other: "%10" },
        { label: "Merchant of Record", tes: "Evet", other: "Evet" },
        { label: "Kendi markalı mağazan", tes: "Evet, site oluşturucuyla", other: "Profil sayfası" },
        { label: "Özel alan adı", tes: "Evet", other: "Hayır" },
        { label: "Fiziksel ürün ve kargo", tes: "Evet", other: "Yalnızca dijital" },
        { label: "Ödeme para birimleri", tes: "12, TRY, KGS, KZT dahil", other: "Sınırlı" },
        { label: "Yerel ödemeler (QR, banka uygulamaları)", tes: "Evet", other: "Hayır" },
      ],
      chooseOther: {
        title: "Gumroad ne zaman daha iyi",
        points: [
          "Tek bir dijital ürün satıyorsun ve sıfır kurulum istiyorsun",
          "Trafiğin için Gumroad Discover'a güveniyorsun",
        ],
      },
      chooseUs: {
        title: "Tescommerce ne zaman daha iyi",
        points: [
          "Kendi markan ve alan adınla gerçek bir mağaza istiyorsun",
          "Düzenli satıyorsun — %5'lik Starter bile Gumroad'un aldığının yarısını alır",
          "Fiziksel ürün de satıyorsun",
        ],
      },
      showSavings: false,
    },
    ...extraCompareFor("tr"),
  },
  countryPages: {
    kyrgyzstan: {
      code: "KG",
      title: "Kırgızistan'dan online sat",
      description:
        "Kırgızistan'dan online mağaza aç: yerelde Finik ve GoPay QR, 230+ ülkeden kart kabul et, KGS veya USD olarak ödeme al.",
      eyebrow: "Kırgızistan",
      heading: "Kırgızistan'dan online mağazan — som veya dolar olarak ödeme",
      intro:
        "Stripe ve Shopify Payments Kırgızistan'dan satıcı kabul etmiyor. Ödeme adımında satıcı Tescommerce'tir; yurt dışına satar, paranı evinde alırsın.",
      points: [
        { title: "Yerel ödemeler", desc: "Kırgızistan'daki alıcılar Finik ve GoPay QR ile öder." },
        { title: "Yurt dışındaki alıcılar", desc: "230+ ülkeden kart, Apple Pay, Google Pay ve PayPal." },
        { title: "KGS veya USD ödeme", desc: "Panelinden ödeme talep et. Minimum 50 $." },
        { title: "Rusça ve Kırgızca", desc: "Vitrinin alıcılarının dilini konuşabilir." },
      ],
    },
    kazakhstan: {
      code: "KZ",
      title: "Kazakistan'dan online sat",
      description:
        "Kazakistan'dan online mağaza aç: 230+ ülkeden kart ödemesi al, Merchant of Record Tescommerce ile KZT veya USD olarak ödeme al.",
      eyebrow: "Kazakistan",
      heading: "Pazaryerlerinin ötesinde, Kazakistan'dan kendi online mağazan",
      intro:
        "Kazakistan'daki online satışların çoğu, müşteriyi kendine saklayan pazaryerlerinden geçer. Kendi mağazanla alıcı, marka ve kâr marjı sende kalır.",
      points: [
        { title: "Dünya çapında alıcılar", desc: "230+ ülkeden kart, Apple Pay, Google Pay ve PayPal." },
        { title: "KZT veya USD ödeme", desc: "Panelinden ödeme talep et. Minimum 50 $." },
        { title: "Merchant of Record", desc: "Ödeme adımında satıcı Tescommerce'tir ve sınır ötesi vergiyi üstlenir." },
        { title: "Rusça ve Kazakça", desc: "Vitrinin alıcılarının dilini konuşabilir." },
      ],
    },
    uzbekistan: {
      code: "UZ",
      title: "Özbekistan'dan online sat",
      description:
        "Özbekistan'dan online mağaza aç: 230+ ülkeden kart ödemesi al, Merchant of Record Tescommerce ile UZS veya USD olarak ödeme al.",
      eyebrow: "Özbekistan",
      heading: "Instagram mağazanı gerçek bir online mağazaya dönüştür",
      intro:
        "Özbekistan'da birçok satıcı Instagram DM üzerinden satar. Ödemeli bir mağaza sen uyurken sipariş alır ve yurt dışından ödeme kabul eder.",
      points: [
        { title: "Dünya çapında alıcılar", desc: "230+ ülkeden kart, Apple Pay, Google Pay ve PayPal." },
        { title: "UZS veya USD ödeme", desc: "Panelinden ödeme talep et. Minimum 50 $." },
        { title: "Meta Conversions API", desc: "Çerezler engellense bile Instagram reklam satışlarını doğru izle." },
        { title: "Rusça ve Özbekçe", desc: "Vitrinin alıcılarının dilini konuşabilir." },
      ],
    },
    ...extraCountryFor("tr"),
  },
};
