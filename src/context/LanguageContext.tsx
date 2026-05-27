import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  getDictionary,
  getPropertyDescription,
  getPropertyTitle,
  isRtl,
  labelEnum as enumLabel,
  type Lang,
  type TranslationDict,
} from '@/i18n';

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationDict;
  enumLabel: (value: string) => string;
  propertyTitle: (code: string, fallback: string) => string;
  propertyDescription: (code: string, fallback: string) => string;
  rtl: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === 'ku' || stored === 'ar' || stored === 'en') return stored;
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  }, []);

  const t = useMemo(() => getDictionary(lang), [lang]);
  const rtl = isRtl(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [lang, rtl]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t,
      enumLabel: (value: string) => enumLabel(lang, value),
      propertyTitle: (code: string, fallback: string) => getPropertyTitle(code, lang, fallback),
      propertyDescription: (code: string, fallback: string) =>
        getPropertyDescription(code, lang, fallback),
      rtl,
    }),
    [lang, setLang, t, rtl],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
