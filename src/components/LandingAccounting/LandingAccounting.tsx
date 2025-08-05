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
          <span>{t('login')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                         <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                       </svg>
        </Link>
      </div>
    </div>
  );
}
