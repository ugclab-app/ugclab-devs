import { useSearchParams } from "react-router-dom";

export function useStoreParams() {
  const [search] = useSearchParams();
  const tenant = (search.get("tenant") ?? "demo").toLowerCase();
  const locale = search.get("locale") ?? "en";
  return { tenant, locale, search };
}
