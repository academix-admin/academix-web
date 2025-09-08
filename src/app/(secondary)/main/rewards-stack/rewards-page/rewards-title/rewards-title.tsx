'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './rewards-title.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { ComponentStateProps } from '@/hooks/use-component-state';

export default function RewardsTitle({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

 // ✅ After
  useEffect(() => {
  onStateChange?.("data");
}, []);


  return (
    <div className={`${styles.mainSection} ${styles[`mainSection_${theme}`]}`}>
      <div className={`${styles.titleSection} ${styles[`titleSection_${theme}`]}`}>
        <h1 className={`${styles.titleTop} ${styles[`titleTop_${theme}`]}`}>
          {t('reward_text')}
        </h1>
        <p className={`${styles.titleBot} ${styles[`titleBot_${theme}`]}`}>
          {t('surprises_awaits')}
        </p>
      </div>

      <div className={styles.infoIcon}>
        <svg fill="none"  viewBox="0 0 18 18"  xmlns="http://www.w3.org/2000/svg" aria-label="Infos">
            <path
                d="M9 0C7.21997 0 5.47991 0.527841 3.99987 1.51677C2.51983 2.50571 1.36628 3.91131 0.685088 5.55585C0.00389957 7.20038 -0.17433 9.00998 0.172936 10.7558C0.520203 12.5016 1.37737 14.1053 2.63604 15.364C3.89472 16.6226 5.49836 17.4798 7.24419 17.8271C8.99002 18.1743 10.7996 17.9961 12.4442 17.3149C14.0887 16.6337 15.4943 15.4802 16.4832 14.0001C17.4722 12.5201 18 10.78 18 9C18 6.61305 17.0518 4.32387 15.364 2.63604C13.6761 0.948212 11.3869 0 9 0ZM7.5 3.8625C7.5 3.56583 7.58798 3.27582 7.7528 3.02914C7.91762 2.78247 8.15189 2.59021 8.42598 2.47668C8.70007 2.36315 9.00167 2.33344 9.29264 2.39132C9.58361 2.4492 9.85088 2.59206 10.0607 2.80184C10.2704 3.01162 10.4133 3.27889 10.4712 3.56986C10.5291 3.86084 10.4994 4.16244 10.3858 4.43652C10.2723 4.71061 10.08 4.94488 9.83336 5.1097C9.58668 5.27453 9.29667 5.3625 9 5.3625C8.7968 5.37267 8.59365 5.3414 8.40292 5.27059C8.21218 5.19977 8.03785 5.0909 7.89052 4.95058C7.74319 4.81027 7.62594 4.64145 7.54591 4.45439C7.46589 4.26734 7.42475 4.06596 7.425 3.8625H7.5ZM12.75 13.5C12.75 13.6989 12.671 13.8897 12.5303 14.0303C12.3897 14.171 12.1989 14.25 12 14.25H6.75C6.55109 14.25 6.36033 14.171 6.21967 14.0303C6.07902 13.8897 6 13.6989 6 13.5C6 13.3011 6.07902 13.1103 6.21967 12.9697C6.36033 12.829 6.55109 12.75 6.75 12.75H8.25V8.25H7.5C7.30109 8.25 7.11032 8.17098 6.96967 8.03033C6.82902 7.88968 6.75 7.69891 6.75 7.5C6.75 7.30109 6.82902 7.11032 6.96967 6.96967C7.11032 6.82902 7.30109 6.75 7.5 6.75H10.5V12.75H12C12.1989 12.75 12.3897 12.829 12.5303 12.9697C12.671 13.1103 12.75 13.3011 12.75 13.5Z"
                fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}