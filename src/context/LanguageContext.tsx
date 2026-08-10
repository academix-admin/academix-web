'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';

// Language support
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
type SupportedLang = typeof SUPPORTED_LANGUAGES[number];

// Language names mapping
export const LANGUAGE_NAMES: Record<SupportedLang, string> = {
  en: 'English',
  fr: 'Français'
};

// Translation shape from en.json
type Translations = typeof en;

// All loaded language files
const languages: Record<SupportedLang, Translations> = {
  en,
  fr
};

// Type for translation parameters. `count` is special: when present, `t`/`tNode` resolve the
// actual key to `${key}_${pluralCategory}` (via Intl.PluralRules, so this is correct per-locale —
// French/English/etc. each get their own real plural rules, not just a naive singular/other split)
// before falling back to `${key}_other`, then the bare `key` itself. A key with no `_one`/`_other`
// variants behaves exactly as before — this is purely additive.
type TranslationParams = Record<string, string | number>;
type TranslationNodeParams = Record<string, string | number | React.ReactNode>;

function resolveTranslationKey<T extends Record<string, string>>(
  dictionary: T,
  key: string,
  count: number | undefined,
  lang: SupportedLang,
): string {
  if (typeof count !== 'number') return key;

  let category: string;
  try {
    category = new Intl.PluralRules(lang).select(count);
  } catch {
    category = count === 1 ? 'one' : 'other';
  }

  const candidates = [`${key}_${category}`, `${key}_other`, key];
  for (const candidate of candidates) {
    if (typeof dictionary[candidate] === 'string') return candidate;
  }
  return key;
}

// Enhanced context with parameter support
interface LanguageContextProps {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: {
    (key: keyof Translations | string): string;
    (key: keyof Translations | string, params: TranslationParams): string;
    (key: keyof Translations | string, runtimeLang: SupportedLang): string;
    (key: keyof Translations | string, params: TranslationParams, runtimeLang: SupportedLang): string;
  };
  tNode: {
    (key: keyof Translations | string): React.ReactNode;
    (key: keyof Translations | string, params: TranslationNodeParams): React.ReactNode;
    (key: keyof Translations | string, runtimeLang: SupportedLang): React.ReactNode;
    (key: keyof Translations | string, params: TranslationNodeParams, runtimeLang: SupportedLang): React.ReactNode;
  };
}

// Default context values
const LanguageContext = createContext<LanguageContextProps>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  tNode: (key) => key
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<SupportedLang>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const initializeLanguage = () => {
      try {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('language') as SupportedLang | null;
          const initialLang = saved && SUPPORTED_LANGUAGES.includes(saved)
            ? saved
            : 'en';

          setLangState(initialLang);
        }
      } catch (error) {
        console.error('Error initializing language:', error);
        setLangState('en');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeLanguage();
  }, []);

  const setLang = (newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem('language', newLang);
  };

  const t: LanguageContextProps['t'] = (
    key: keyof Translations | string,
    paramsOrLang?: TranslationParams | SupportedLang,
    runtimeLangMaybe?: SupportedLang
  ): string => {
    let params: TranslationParams | undefined;
    let runtimeLang: SupportedLang | undefined;

    // Determine if second argument is params or runtimeLang
    if (typeof paramsOrLang === 'string') {
      runtimeLang = paramsOrLang;
    } else {
      params = paramsOrLang;
      runtimeLang = runtimeLangMaybe;
    }

    const effectiveLang = runtimeLang ?? lang;
    const dictionary = languages[effectiveLang] ?? languages.en;
    const resolvedKey = resolveTranslationKey(
      dictionary,
      key as string,
      typeof params?.count === 'number' ? params.count : undefined,
      effectiveLang,
    );
    let translation = dictionary[resolvedKey as keyof Translations] ?? key;

    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };

  const tNode: LanguageContextProps['tNode'] = (
    key: keyof Translations | string,
    paramsOrLang?: TranslationNodeParams | SupportedLang,
    runtimeLangMaybe?: SupportedLang
  ): React.ReactNode => {
    let params: TranslationNodeParams | undefined;
    let runtimeLang: SupportedLang | undefined;

    // Determine if second argument is params or runtimeLang
    if (typeof paramsOrLang === 'string') {
      runtimeLang = paramsOrLang;
    } else {
      params = paramsOrLang;
      runtimeLang = runtimeLangMaybe;
    }

    const effectiveLang = runtimeLang ?? lang;
    const dictionary = languages[effectiveLang] ?? languages.en;
    const resolvedKey = resolveTranslationKey(
      dictionary,
      key as string,
      typeof params?.count === 'number' ? params.count : undefined,
      effectiveLang,
    );
    const template = dictionary[resolvedKey as keyof Translations] ?? key;

    if (!params) return template;

    const parts = template.split(/(\{.*?\})/g);

    return parts.map((part, index) => {
      const match = part.match(/^\{(.*)\}$/);
      if (match) {
        const paramKey = match[1];
        return <React.Fragment key={index}>{params[paramKey]}</React.Fragment>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };


  // Don't render children until language is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tNode }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const getSupportedLang = (tLang: string | null): SupportedLang => {
  const { lang } = useContext(LanguageContext);
  return tLang && SUPPORTED_LANGUAGES.includes(tLang as SupportedLang)
    ? (tLang as SupportedLang)
    : lang;
};

export type { SupportedLang };
export const useLanguage = () => useContext(LanguageContext);