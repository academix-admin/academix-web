'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step1.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { TextInput } from '@academix-admin/forms';
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
          <TextInput
            id="fullName"
            name="fullName"
            label={t('fullname_label')}
            hint={t('fullname_placeholder')}
            value={signup.fullName}
            onChange={(_, e) => handleChange(e)}
            disabled={continueLoading}
            required
            status={fullNameState === 'invalid' ? 'error' : fullNameState === 'valid' ? 'valid' : 'default'}
            helperText={
              fullNameState === 'invalid' ? t('fullname_too_short')
                : fullNameState === 'valid' ? t('fullname_valid')
                  : undefined
            }
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              input: styles.input,
              helper: fullNameState === 'invalid' ? styles.errorText : styles.validText,
            }}
          />

          <TextInput
            id="email"
            name="email"
            type="email"
            label={t('email_label')}
            hint={t('email_placeholder')}
            value={signup.email}
            onChange={(_, e) => handleChange(e)}
            disabled={continueLoading}
            required
            status={emailExists ? 'error' : 'default'}
            helperText={emailExists ? t('email_exists_error') : undefined}
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              input: styles.input,
              helper: styles.errorText,
            }}
          />

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
