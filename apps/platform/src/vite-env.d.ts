/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MERCHANT_ADMIN_URL?: string;
  readonly VITE_CLARITY_ID?: string;
  readonly VITE_FOUNDER_TELEGRAM_URL?: string;
  readonly VITE_FOUNDER_PHOTO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
