import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  platformAdminMessages,
  type PlatformAdminLocale,
  type PlatformAdminMessages,
} from "./messages";

const STORAGE_KEY = "tescommerce_platform_admin_locale";

type Ctx = {
  locale: PlatformAdminLocale;
  setLocale: (l: PlatformAdminLocale) => void;
  t: PlatformAdminMessages;
  navLabel: (path: string, fallback: string) => string;
};

const PlatformLocaleContext = createContext<Ctx | null>(null);

function readStored(): PlatformAdminLocale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "tr" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

export function PlatformLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PlatformAdminLocale>(readStored);
  const setLocale = useCallback((l: PlatformAdminLocale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = platformAdminMessages[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const navLabel = useCallback(
    (path: string, fallback: string) => t.nav[path] ?? fallback,
    [t]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, navLabel }),
    [locale, setLocale, t, navLabel]
  );

  return (
    <PlatformLocaleContext.Provider value={value}>
      {children}
    </PlatformLocaleContext.Provider>
  );
}

export function usePlatformLocale() {
  const ctx = useContext(PlatformLocaleContext);
  if (!ctx) throw new Error("usePlatformLocale requires PlatformLocaleProvider");
  return ctx;
}
