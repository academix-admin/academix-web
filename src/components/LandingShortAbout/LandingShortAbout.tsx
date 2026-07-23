'use client';
import styles from './LandingShortAbout.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function LandingShortAbout() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.lsa_span}>
      <h1 className={`${applyTheme(styles, 'titleTop')}`}>
        {t('com.len.win')}
      </h1>
      <h1 className={`${applyTheme(styles, 'titleBottom')}`}>
        {t('reward_knowledge')}
      </h1>
      <h4 className={`${applyTheme(styles, 'description')}`}>
        {t('landing_short_about_desc')}
      </h4>
    </div>
  );
}
