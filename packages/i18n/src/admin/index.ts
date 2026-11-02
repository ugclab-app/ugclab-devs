import { adminMessagesEn } from "./messages-en.js";
import { adminMessagesRu } from "./messages-ru.js";
import { adminMessagesTr } from "./messages-tr.js";
import { deepMergeAdmin } from "./resolve.js";

export { adminMessagesEn, adminMessagesRu, adminMessagesTr };
export { createAdminTa, deepMergeAdmin } from "./resolve.js";
export type { AdminMessages } from "./messages-en.js";

export function getAdminBundle(locale: string) {
  if (locale === "ru") return adminMessagesRu;
  if (locale === "tr") return adminMessagesTr;
  return adminMessagesEn;
}

export function getAdminMessages(locale: string) {
  const bundle = getAdminBundle(locale);
  if (locale === "en" || locale === "ru" || locale === "tr") return bundle;
  return deepMergeAdmin(adminMessagesEn, bundle);
}
