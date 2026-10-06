import { getMessages } from "@ugclab/i18n";
import { useStore } from "@/context/store";

/** Storefront UI strings for the active shopper locale. */
export function useStorefrontMessages() {
  const { locale } = useStore();
  return getMessages(locale).storefront;
}
