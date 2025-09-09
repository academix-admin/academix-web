'use client';
import styles from './LandingShortAbout.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function LandingShortAbout() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.lsa_span}>
      <h1 className={`${styles.titleTop} ${styles[`titleTop_${theme}`]}`}>
        {t('com.len.win')}
      </h1>
      <h1 className={`${styles.titleBottom} ${styles[`titleBottom_${theme}`]}`}>
        {t('reward_knowledge')}
      </h1>
      <h4 className={`${styles.description} ${styles[`description_${theme}`]}`}>
        {t('landing_short_about_desc')}
      </h4>
    </div>
  );
}
