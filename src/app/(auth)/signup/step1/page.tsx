'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';

import useSignupStore from '@/lib/stores/signupStore';


export default function SignUpStep1() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const { data, setData, reset } = useSignupStore();


  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setData({ [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!data.fullName || !data.email) {
        alert('Please fill in all fields');
        return;
      }
      router.push('/signup/step2');
    };

    const cancelSignUp = () => {
      router.back();
      reset();
    };



  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={cancelSignUp}
              aria-label="Go back"
            >
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}

          <h1 className={styles.title}>{t('sign_up')}</h1>

          <div className={styles.logoContainer}>
            <Image
              className={styles.logo}
              src="/assets/image/academix-logo.png"
              alt="Academix Logo"
              width={40}
              height={40}
              priority
            />
          </div>
        </div>
      </header>

      <div className={styles.innerBody}>
      <CachedLottie
                id="signup-step1"
                src="/assets/lottie/sign_up_step_1_lottie_1.json"
                className={styles.welcome_wrapper}
                restoreProgress
              />

        <p className={styles.titleSmall}>Cheers 😍</p>
        <h2 className={styles.titleBig}>Join Us at Academix!</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName" className={styles.label}>
              FULLNAME
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={data.fullName}
              onChange={handleChange}
              placeholder="LastName FirstName maybe OtherNames"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={data.email}
              onChange={handleChange}
              placeholder="Email address"
              className={styles.input}
              required
            />
          </div>

          <button type="submit" className={styles.continueButton}>
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}