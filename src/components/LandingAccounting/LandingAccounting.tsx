'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LandingAccounting.module.css';

export default function LandingAccounting() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.la_span}>
      <div className={`${styles.btn_con} ${styles[`btn_con_${theme}`]}`}>
        <button className={`${styles.signup} ${styles[`signup_${theme}`]}`} >{t('sign_up')}</button>
        <div className={`${styles.login} ${styles[`login_${theme}`]}`}>
          <span>{t('login')} →</span>
        </div>
      </div>
    </div>
  );
}
