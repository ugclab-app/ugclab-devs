import { adminMessagesEn } from "./messages-en.js";
import { adminMessagesRu } from "./messages-ru.js";
import { deepMergeAdmin } from "./resolve.js";

export { adminMessagesEn, adminMessagesRu };
export { createAdminTa, deepMergeAdmin } from "./resolve.js";
export type { AdminMessages } from "./messages-en.js";

export function getAdminBundle(locale: string) {
  if (locale === "ru") return adminMessagesRu;
  return adminMessagesEn;
}

export function getAdminMessages(locale: string) {
  const bundle = getAdminBundle(locale);
  if (locale === "en" || locale === "ru") return bundle;
  return deepMergeAdmin(adminMessagesEn, bundle);
}
