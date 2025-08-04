'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LandingAccounting.module.css';
import Link from 'next/link'

export default function LandingAccounting() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.la_span}>
      <div className={`${styles.btn_con} ${styles[`btn_con_${theme}`]}`}>
        <Link className={`${styles.signup} ${styles[`signup_${theme}`]}`} href="/signup/step1">{t('sign_up')}</Link>
        <Link className={`${styles.login} ${styles[`login_${theme}`]}`}  href="/login">
          <span>{t('login')} →</span>
        </Link>
      </div>
    </div>
  );
}
