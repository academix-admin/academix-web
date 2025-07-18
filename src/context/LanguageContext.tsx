// 'use client';
// import { createContext, useContext, useState, ReactNode } from 'react';
// import en from '@/i18n/en.json';
// import fr from '@/i18n/fr.json';
//
// const languages = { en, fr };
//
// const LanguageContext = createContext({
//   lang: 'en',
//   setLang: (_lang: string) => {},
//   t: (key: string) => key,
// });
//
// export const LanguageProvider = ({ children }: { children: ReactNode }) => {
//   const [lang, setLang] = useState<'en' | 'fr'>('en');
//   const t = (key: string) => languages[lang][key] || key;
//   return (
//     <LanguageContext.Provider value={{ lang, setLang, t }}>
//       {children}
//     </LanguageContext.Provider>
//   );
// };
//
// export const useLanguage = () => useContext(LanguageContext);
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';

// Language support
const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
type SupportedLang = typeof SUPPORTED_LANGUAGES[number];

// Translation shape from en.json
type Translations = typeof en;

// All loaded language files
const languages: Record<SupportedLang, Translations> = {
  en,
  fr
};

// Allow flexible but safe keys
interface LanguageContextProps {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: keyof Translations | string) => string;
}

// Default context values
const LanguageContext = createContext<LanguageContextProps>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<string>('en');

  const t = (key: keyof Translations | string): string => {
    const selectedLang = lang as SupportedLang;
    const dictionary = languages[selectedLang] ?? languages.en;

    // Return translation if it exists, otherwise return the key itself
    return dictionary[key as keyof Translations] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

