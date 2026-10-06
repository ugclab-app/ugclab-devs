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
  createAdminTa,
  getAdminMessages,
  locales,
  type Locale,
} from "@ugclab/i18n";

const STORAGE_KEY = "ugclab_admin_locale";

type AdminLocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: ReturnType<typeof getAdminMessages>;
  c: ReturnType<typeof getAdminMessages>["common"];
  ta: ReturnType<typeof createAdminTa>;
};

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

function readStored(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (locales as readonly string[]).includes(v)) return v as Locale;
  } catch {
    /* ignore */
  }
  return "en";
}

export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStored);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const messages = useMemo(() => getAdminMessages(locale), [locale]);
  const t = messages;
  const c = messages.common;
  const ta = useMemo(
    () => createAdminTa(messages as unknown as Record<string, unknown>),
    [locale, messages]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, c, ta }),
    [locale, setLocale, t, c, ta]
  );

  return (
    <AdminLocaleContext.Provider value={value}>
      <div key={locale}>{children}</div>
    </AdminLocaleContext.Provider>
  );
}

export function useAdminLocale() {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) throw new Error("useAdminLocale requires AdminLocaleProvider");
  return ctx;
}
