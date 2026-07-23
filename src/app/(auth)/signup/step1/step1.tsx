'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step1.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup } from '@/lib/stacks/signup-stack';
import { StateStack } from '@academix-admin/state-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { capitalizeWords } from '@/utils/textUtils';
import { Header } from '@academix-admin/header';

export default function SignUpStep1() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const { signup, signup$ } = useSignup();
  const nav = useNav();

  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [fullNameState, setFullNameState] = useState('initial');

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
      validateForm(signup.fullName,signup.email);
    }, [signup.fullName, signup.email]);

  const validateForm = (fullName: string, email: string) => {
    const isFullNameValid = fullName.trim().length > 3;
    const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    
    if (fullName.trim().length > 0 && fullName.trim().length <= 3) {
      setFullNameState('invalid');
    } else if (fullName.trim().length > 3) {
      setFullNameState('valid');
    } else {
      setFullNameState('initial');
    }
    
    setIsFormValid(isFullNameValid && isEmailValid);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setEmailExists(false);
      signup$.setField({ field: 'email', value: value });
    }else{
      signup$.setField({ field: 'fullName', value: capitalizeWords(value)});
    }

  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setContinueLoading(true);
    try {
      const { data: rpcResult, error } = await supabaseBrowser.rpc('check_email_exist', {
        p_email: signup.email
      });

      if (error) {
        console.error('RPC Error:', error);
      } else if (rpcResult === true) {
        setEmailExists(true);
        setIsFormValid(false);
      } else {
        signup$.setStep(2);
        nav.push('step2');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContinueLoading(false);
    }
  };

  const cancelSignUp = async () => {
    await nav.pop();
    nav.dispose();
    await StateStack.core.clearScope('signup_flow');
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
        {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('sign_up')}
        theme={theme}
        showBack={canGoBack}
        onBack={cancelSignUp}
        rightContent={(
          <Link className={styles.logoContainer} href="/">
            <Image
              className={styles.logo}
              src="/assets/image/academix-logo.png"
              alt="Academix Logo"
              width={40}
              height={40}
              priority
            />
          </Link>
        )}
      />

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
              value={signup.fullName}
              onChange={handleChange}
              placeholder={t('fullname_placeholder')}
              className={styles.input}
              disabled={continueLoading}
              required
            />
            {fullNameState === 'invalid' && (
              <p className={styles.errorText}>{t('fullname_too_short')}</p>
            )}
            {fullNameState === 'valid' && (
              <p className={styles.validText}>{t('fullname_valid')}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>{t('email_label')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={signup.email}
              onChange={handleChange}
              placeholder={t('email_placeholder')}
              className={styles.input}
              disabled={continueLoading}
              required
            />
            {emailExists && (
              <p className={styles.errorText}>{t('email_exists_error')}</p>
            )}
          </div>

          <button
            type="submit"
            className={styles.continueButton}
            disabled={!isFormValid || continueLoading}
          >
                {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </form>
      </div>
    </main>
  );
}
