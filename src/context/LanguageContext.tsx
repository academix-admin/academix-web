'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';

const languages = { en, fr };

const LanguageContext = createContext({
  lang: 'en',
  setLang: (_lang: string) => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const t = (key: string) => languages[lang][key] || key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
