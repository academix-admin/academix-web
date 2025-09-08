'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './payment-title.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { ComponentStateProps } from '@/hooks/use-component-state';

export default function PaymentTitle({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();

 // ✅ After
  useEffect(() => {
  onStateChange?.("data");
}, []);

  // Get current date in format "4 September"
  const getCurrentDate = (): string => {
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleString(lang, { month: 'long' });

    return `${day} ${month}`;
  };

  return (
    <div className={`${styles.mainSection} ${styles[`mainSection_${theme}`]}`}>
      <div className={`${styles.titleSection} ${styles[`titleSection_${theme}`]}`}>
        <h1 className={`${styles.titleTop} ${styles[`titleTop_${theme}`]}`}>
          {t('today_text')}
        </h1>
        <p className={`${styles.titleBot} ${styles[`titleBot_${theme}`]}`}>
          {getCurrentDate()}
        </p>
      </div>

      <div className={styles.infoIcon}>
        <svg fill="none" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M7 14C8.85652 14 10.637 13.2625 11.9497 11.9497C13.2625 10.637 14 8.85652 14 7C14 5.14348 13.2625 3.36301 11.9497 2.05025C10.637 0.737498 8.85652 0 7 0C5.14348 0 3.36301 0.737498 2.05025 2.05025C0.737498 3.36301 0 5.14348 0 7C0 8.85652 0.737498 10.637 2.05025 11.9497C3.36301 13.2625 5.14348 14 7 14ZM4 8C4.26522 8 4.51957 7.89464 4.70711 7.70711C4.89464 7.51957 5 7.26522 5 7C5 6.73478 4.89464 6.48043 4.70711 6.29289C4.51957 6.10536 4.26522 6 4 6C3.73478 6 3.48043 6.10536 3.29289 6.29289C3.10536 6.48043 3 6.73478 3 7C3 7.26522 3.10536 7.51957 3.29289 7.70711C3.48043 7.89464 3.73478 8 4 8ZM8 7C8 7.26522 7.89464 7.51957 7.70711 7.70711C7.51957 7.89464 7.26522 8 7 8C6.73478 8 6.48043 7.89464 6.29289 7.70711C6.10536 7.51957 6 7.26522 6 7C6 6.73478 6.10536 6.48043 6.29289 6.29289C6.48043 6.10536 6.73478 6 7 6C7.26522 6 7.51957 6.10536 7.70711 6.29289C7.89464 6.48043 8 6.73478 8 7ZM10 8C10.2652 8 10.5196 7.89464 10.7071 7.70711C10.8946 7.51957 11 7.26522 11 7C11 6.73478 10.8946 6.48043 10.7071 6.29289C10.5196 6.10536 10.2652 6 10 6C9.73478 6 9.48043 6.10536 9.29289 6.29289C9.10536 6.48043 9 6.73478 9 7C9 7.26522 9.10536 7.51957 9.29289 7.70711C9.48043 7.89464 9.73478 8 10 8Z"
                fill="currentColor"
                fillRule="evenodd" />
        </svg>

      </div>
    </div>
  );
}