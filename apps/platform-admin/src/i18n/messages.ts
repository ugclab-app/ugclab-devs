export type PlatformAdminLocale = "en" | "tr";

export type PlatformAdminMessages = {
  brandSub: string;
  platform: string;
  signOut: string;
  signedInAs: string;
  light: string;
  dark: string;
  loading: string;
  language: string;
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    totp: string;
    totpHint: string;
    signIn: string;
    verify: string;
    signingIn: string;
    notAuthorized: string;
    failed: string;
  };
  navGroups: {
    overview: string;
    commerce: string;
    people: string;
    platform: string;
    trust: string;
  };
  nav: Record<string, string>;
};

const en: PlatformAdminMessages = {
  brandSub: "Tescommerce",
  platform: "Platform",
  signOut: "Sign out",
  signedInAs: "Signed in as",
  light: "Light",
  dark: "Dark",
  loading: "Loading…",
  language: "Language",
  login: {
    title: "Platform admin",
    subtitle: "Stores, payouts, users, and platform settings.",
    email: "Email",
    password: "Password",
    totp: "2FA code",
    totpHint: "Enter the 6-digit code from your authenticator app.",
    signIn: "Sign in",
    verify: "Verify & sign in",
    signingIn: "Signing in…",
    notAuthorized: "This account is not authorized for platform admin.",
    failed: "Login failed",
  },
  navGroups: {
    overview: "Overview",
    commerce: "Commerce",
    people: "People",
    platform: "Platform",
    trust: "Trust & safety",
  },
  nav: {
    "/dashboard": "Overview",
    "/traffic": "Traffic",
    "/inbox": "Inbox",
    "/mail": "Mail",
    "/search": "Search",
    "/revenue": "Revenue",
    "/reconcile": "Money",
    "/payment-errors": "Payment errors",
    "/billing": "Past due",
    "/disputes": "Disputes",
    "/tenants": "Stores",
    "/orders": "Orders",
    "/payments-local": "GoPay / Finik",
    "/payouts": "Payouts",
    "/domains": "Domains",
    "/affiliates": "Affiliates",
    "/platform-partners": "Platform partners",
    "/themes": "Themes",
    "/blocks": "Blocks",
    "/sections": "Sections",
    "/users": "Users",
    "/buyers": "Buyers",
    "/plans": "Plans",
    "/activity": "Activity",
    "/audit": "Audit",
    "/announcements": "Announcements",
    "/changelog": "What shipped",
    "/merchant-messages": "Merchant messages",
    "/email-templates": "Email templates",
    "/outreach": "Outreach",
    "/growth": "Growth",
    "/instagram": "Instagram",
    "/marketing": "Marketing",
    "/reports": "Reports",
    "/moderation": "Moderation",
    "/integrations": "Integrations",
    "/compliance": "Compliance",
    "/kyc": "KYC",
    "/system": "System",
    "/settings": "Settings",
  },
};

const tr: PlatformAdminMessages = {
  brandSub: "Tescommerce",
  platform: "Platform",
  signOut: "Çıkış yap",
  signedInAs: "Giriş yapan",
  light: "Açık",
  dark: "Koyu",
  loading: "Yükleniyor…",
  language: "Dil",
  login: {
    title: "Platform yönetimi",
    subtitle: "Mağazalar, ödemeler, kullanıcılar ve platform ayarları.",
    email: "E-posta",
    password: "Şifre",
    totp: "2FA kodu",
    totpHint: "Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin.",
    signIn: "Giriş yap",
    verify: "Doğrula ve giriş yap",
    signingIn: "Giriş yapılıyor…",
    notAuthorized: "Bu hesap platform yönetimine yetkili değil.",
    failed: "Giriş başarısız",
  },
  navGroups: {
    overview: "Genel bakış",
    commerce: "Ticaret",
    people: "Kişiler",
    platform: "Platform",
    trust: "Güven ve güvenlik",
  },
  nav: {
    "/dashboard": "Genel bakış",
    "/traffic": "Trafik",
    "/inbox": "Gelen kutusu",
    "/mail": "Posta",
    "/search": "Ara",
    "/revenue": "Gelir",
    "/reconcile": "Para",
    "/payment-errors": "Ödeme hataları",
    "/billing": "Gecikmiş",
    "/disputes": "İtirazlar",
    "/tenants": "Mağazalar",
    "/orders": "Siparişler",
    "/payments-local": "GoPay / Finik",
    "/payouts": "Ödemeler",
    "/domains": "Domainler",
    "/affiliates": "Ortaklar",
    "/platform-partners": "Platform ortakları",
    "/themes": "Temalar",
    "/blocks": "Bloklar",
    "/sections": "Bölümler",
    "/users": "Kullanıcılar",
    "/buyers": "Alıcılar",
    "/plans": "Planlar",
    "/activity": "Etkinlik",
    "/audit": "Denetim",
    "/announcements": "Duyurular",
    "/changelog": "Yayınlar",
    "/merchant-messages": "Satıcı mesajları",
    "/email-templates": "E-posta şablonları",
    "/outreach": "Outreach",
    "/growth": "Büyüme",
    "/instagram": "Instagram",
    "/marketing": "Pazarlama",
    "/reports": "Raporlar",
    "/moderation": "Moderasyon",
    "/integrations": "Entegrasyonlar",
    "/compliance": "Uyumluluk",
    "/kyc": "KYC",
    "/system": "Sistem",
    "/settings": "Ayarlar",
  },
};

export const platformAdminMessages: Record<PlatformAdminLocale, PlatformAdminMessages> = {
  en,
  tr,
};
