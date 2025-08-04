'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import CachedLottie from '@/components/CachedLottie';
import useSignupStore from '@/lib/stores/signupStore';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignUpStep1() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { data, setData, reset } = useSignupStore();

  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      reset();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [reset]);



  const validateForm = (fullName: string, email: string) => {
    const isFullNameValid = fullName.trim().length > 3;
    const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    setIsFormValid(isFullNameValid && isEmailValid);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData({ [name]: value });

    const newFullName = name === 'fullName' ? value : data.fullName;
    const newEmail = name === 'email' ? value : data.email;

    validateForm(newFullName, newEmail);

    if (name === 'email') {
      setEmailExists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const { data: rpcResult, error } = await supabaseBrowser.rpc('check_email_exist', {
        p_email: data.email
      });

      if (error) {
        console.error('RPC Error:', error);
        alert('Something went wrong. Please try again.');
      } else if (rpcResult === true) {
        setEmailExists(true);
        setIsFormValid(false);
      } else {
        router.push('/signup/step2');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelSignUp = () => {
    router.back();
    reset();
  };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
        {loading && <div className={styles.loadingOverlay} aria-hidden="true" />}

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

        <p className={styles.titleSmall}>{t('cheers_sign_up')}</p>
        <h2 className={styles.titleBig}>{t('join_us_academix')}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName" className={styles.label}>{t('fullname_label')}</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={data.fullName}
              onChange={handleChange}
              placeholder={t('fullname_placeholder')}
              className={styles.input}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>{t('email_label')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={data.email}
              onChange={handleChange}
              placeholder={t('email_placeholder')}
              className={styles.input}
              disabled={loading}
              required
            />
            {emailExists && (
              <p className={styles.errorText}>{t('email_exists_error')}</p>
            )}
          </div>

          <button
            type="submit"
            className={styles.continueButton}
            disabled={!isFormValid || loading}
          >
                {loading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </form>
      </div>
    </main>
  );
}
