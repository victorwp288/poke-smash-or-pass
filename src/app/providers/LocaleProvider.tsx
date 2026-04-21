import React from "react";
import { useLocalStorageState } from "@/lib/storage";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type AppLocale,
  type LocaleStrings,
  getLocaleStrings
} from "@/lib/i18n/it";

type LocaleContextValue = {
  locale: AppLocale;
  strings: LocaleStrings;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

const parseLocale = (value: unknown): AppLocale => {
  return value === "it" || value === "en" ? value : DEFAULT_LOCALE;
};

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useLocalStorageState<AppLocale>(
    LOCALE_STORAGE_KEY,
    DEFAULT_LOCALE,
    { parse: parseLocale }
  );

  const setLocale = React.useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
  }, [setLocaleState]);

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      strings: getLocaleStrings(locale),
      setLocale
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
};
