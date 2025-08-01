'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link'

export default function Welcome() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {canGoBack && (
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
          ← {t('back')}
        </button>
      )}

      <h1 className={styles.title}>{t('welcome')}</h1>

      <div className={styles.imageWrapper}>
        <Image
          src="/assets/image/welcome-illustration.png"
          alt="Welcome"
          width={200}
          height={200}
          className={styles.image}
          priority
        />
      </div>

      <h2 className={styles.greeting}>👋 {t('let_get_started')}</h2>

      <p className={styles.terms}>
        {t('by_creating_account')} <strong>{t('privacy_policy')}</strong> {t('and')}
        <strong> {t('terms_of_service')}</strong>.
      </p>

      <p className={styles.altPrompt}>
        {t('already_have_account')} <br />
        {t('please_log_in_or_sign_up')}
      </p>

      <div className={styles.buttonGroup}>
        <Link className={styles.loginBtn} href="#">
          {t('login')}
        </Link>
        <Link className={styles.signupBtn} href="#">
          {t('sign_up')}
        </Link>
      </div>
    </main>
  );
}
