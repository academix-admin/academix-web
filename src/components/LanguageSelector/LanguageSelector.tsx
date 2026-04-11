'use client';

import { useLanguage, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, SupportedLang } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import styles from './LanguageSelector.module.css';

const LANGUAGE_FLAGS: Record<SupportedLang, string> = {
  en: '🇺🇸',
  fr: '🇫🇷'
};

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (selectedLang: SupportedLang) => {
    setLang(selectedLang);
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={`${styles.trigger} ${styles[`trigger_${theme}`]}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <span className={styles.flag}>{LANGUAGE_FLAGS[lang]}</span>
        <span className={styles.langCode}>{lang.toUpperCase()}</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={`${styles.dropdown} ${styles[`dropdown_${theme}`]}`}>
          {SUPPORTED_LANGUAGES.map((langOption) => (
            <button
              key={langOption}
              className={`${styles.option} ${styles[`option_${theme}`]} ${
                lang === langOption ? styles.optionActive : ''
              }`}
              onClick={() => handleSelect(langOption)}
            >
              <span className={styles.optionFlag}>{LANGUAGE_FLAGS[langOption]}</span>
              <span className={styles.optionName}>{LANGUAGE_NAMES[langOption]}</span>
              {lang === langOption && (
                <svg
                  className={styles.checkIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.3333 4L6 11.3333L2.66667 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
