// 'use client';
//
// import React, { createContext, useContext, useState, ReactNode } from 'react';
// import en from '@/i18n/en.json';
// import fr from '@/i18n/fr.json';
//
// // Language support
// const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
// type SupportedLang = typeof SUPPORTED_LANGUAGES[number];
//
// // Translation shape from en.json
// type Translations = typeof en;
//
// // All loaded language files
// const languages: Record<SupportedLang, Translations> = {
//   en,
//   fr
// };
//
// // Type for translation parameters
// type TranslationParams = Record<string, string | number>;
// type TranslationNodeParams = Record<string, string | number | React.ReactNode>;
//
// // Enhanced context with parameter support
// interface LanguageContextProps {
//   lang: string;
//   setLang: (lang: string) => void;
//   t: (key: keyof Translations | string, params?: TranslationParams) => string;
//   tNode: (key: keyof Translations | string, params?: TranslationNodeParams) => React.ReactNode;
// }
//
// // Default context values
// const LanguageContext = createContext<LanguageContextProps>({
//   lang: 'en',
//   setLang: () => {},
//   t: (key) => key,
//   tNode: (key) => key
// });
//
// export const LanguageProvider = ({ children }: { children: ReactNode }) => {
//   const [lang, setLang] = useState<string>('en');
//
//   const t = (key: keyof Translations | string, params?: TranslationParams): string => {
//     const selectedLang = lang as SupportedLang;
//     const dictionary = languages[selectedLang] ?? languages.en;
//
//     // Get the translation template
//     let translation = dictionary[key as keyof Translations] ?? key;
//
//     // Replace parameters if provided
//     if (params) {
//       Object.entries(params).forEach(([param, value]) => {
//         translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
//       });
//     }
//
//     return translation;
//   };
//
//   const tNode = (key: keyof Translations | string, params?: TranslationNodeParams): React.ReactNode => {
//     const selectedLang = lang as SupportedLang;
//     const dictionary = languages[selectedLang] ?? languages.en;
//
//     const template = dictionary[key as keyof Translations] ?? key;
//
//     if (!params) return template;
//
//     // Split into text + placeholders like {param}
//     const parts = template.split(/(\{.*?\})/g);
//
//     return parts.map((part, index) => {
//       const match = part.match(/^\{(.*)\}$/);
//       if (match) {
//         const paramKey = match[1];
//         return <React.Fragment key={index}>{params[paramKey]}</React.Fragment>;
//       }
//       return <React.Fragment key={index}>{part}</React.Fragment>;
//     });
//   };
//
//
//   return (
//     <LanguageContext.Provider value={{ lang, setLang, t, tNode }}>
//       {children}
//     </LanguageContext.Provider>
//   );
// };
//
// export const useLanguage = () => useContext(LanguageContext);

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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

// Type for translation parameters
type TranslationParams = Record<string, string | number>;
type TranslationNodeParams = Record<string, string | number | React.ReactNode>;

// Enhanced context with parameter support
interface LanguageContextProps {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: keyof Translations | string, params?: TranslationParams) => string;
  tNode: (key: keyof Translations | string, params?: TranslationNodeParams) => React.ReactNode;
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

  const t = (key: keyof Translations | string, params?: TranslationParams): string => {
    const dictionary = languages[lang] ?? languages.en;

    // Get the translation template
    let translation = dictionary[key as keyof Translations] ?? key;

    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };

  const tNode = (key: keyof Translations | string, params?: TranslationNodeParams): React.ReactNode => {
    const dictionary = languages[lang] ?? languages.en;
    const template = dictionary[key as keyof Translations] ?? key;

    if (!params) return template;

    // Split into text + placeholders like {param}
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

export const useLanguage = () => useContext(LanguageContext);