'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step7.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { useStack, signupConfig } from '@/lib/stacks/signup-stack';
import { useNav } from "@/lib/NavigationStack";

// ================== Helpers ==================
const validatePin = (value: string | null | number) => {
  if (!value) return { valid: false };
  const regex = /^\d+$/;
  return {
    valid: regex.test(String(value)) && String(value).length === 6,
    value
  };
};

const validatePassword = (value: string) => {
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
  const hasMinLength = value.length >= 6;

  return {
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasMinLength,
    valid: hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasMinLength,
  };
};

// ================== Component ==================
export default function SignUpStep7() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { signup, signup$, __meta } = useStack('signup', signupConfig, 'signup_flow');
  const nav = useNav();
  const isTop = nav.isTop();

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);

  // PIN states
  const [sixPinInputValue, setSixPinInputValue] = useState('');
  const [sixPinState, setSixPinState] = useState<'initial' | 'valid' | 'invalid'>('initial');

  // Password states
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(validatePassword(''));

  const isFormValid = sixPinState === 'valid' && passwordChecks.valid;

  // ================== Effects ==================
  useEffect(() => {
    if (!signup.fullName && __meta.isHydrated && isTop) {
      nav.go('step1');
    }
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName, __meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    if (signup?.sixDigitPin != null) {
      const result = validatePin(signup.sixDigitPin);
      setSixPinState(result.valid ? 'valid' : 'invalid');
      setSixPinInputValue(String(signup.sixDigitPin));
    }
  }, [signup.sixDigitPin]);

  useEffect(() => {
    if (signup?.password) {
      const result = validatePassword(signup.password);
      setPasswordChecks(result);
      setPasswordInputValue(signup.password);
    }
  }, [signup.password]);

  // ================== Handlers ==================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    nav.push('verification');
    setContinueLoading(false);
  };

  const handleSixPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (!value) {
      setSixPinState('initial');
      signup$.setField({ field: 'sixDigitPin', value: null });
      setSixPinInputValue('');
      return;
    }

    if (value.length <= 6) setSixPinInputValue(value);

    const result = validatePin(value);
    if (result.valid) {
      setSixPinState('valid');
      signup$.setField({ field: 'sixDigitPin', value });
    } else if(!result.valid && value.length === 6) {
      setSixPinState('invalid');
      signup$.setField({ field: 'sixDigitPin', value: null });
    }else{
      setSixPinState('initial');
      signup$.setField({ field: 'sixDigitPin', value: null });
   }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setPasswordInputValue(value);

    const result = validatePassword(value);
    setPasswordChecks(result);

    signup$.setField({ field: 'password', value: result.valid ? value : '' });
  };

  // ================== Render ==================
  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
              aria-label="Go back"
              disabled={continueLoading}
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
        </div>
      </header>

      <div className={styles.innerBody}>
        <CachedLottie
          id="signup-step7"
          src="/assets/lottie/sign_up_step_7_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 7, total: signupConfig.totalSteps })}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* PIN */}
          <div className={styles.formGroup}>
            <label htmlFor="sixDigitPin" className={styles.label}>{t('sixDigitPin_label')}</label>
            <input
              type="password"
              id="sixDigitPin"
              name="sixDigitPin"
              value={sixPinInputValue}
              maxLength={6}
              onChange={handleSixPinChange}
              placeholder={t('sixDigitPin_placeholder')}
              className={styles.input}
              disabled={continueLoading}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={sixPinState === 'invalid'}
              required
            />
            {sixPinState === 'invalid' && <p className={styles.errorText}>{t('pin_invalid')}</p>}
            {sixPinState === 'valid' && <p className={styles.validText}>{t('pin_valid')}</p>}
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>{t('password_label')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={passwordInputValue}
              onChange={handlePasswordChange}
              placeholder={t('password_placeholder')}
              className={styles.input}
              disabled={continueLoading}
              aria-invalid={!passwordChecks.valid}
              required
            />
            <p className={passwordChecks.hasUppercase ? styles.validText : styles.errorText}>• {t('contain_uppercase')}</p>
            <p className={passwordChecks.hasMinLength ? styles.validText : styles.errorText}>• {t('contain_sixChar')}</p>
            <p className={passwordChecks.hasLowercase ? styles.validText : styles.errorText}>• {t('contain_lowercase')}</p>
            <p className={passwordChecks.hasNumber ? styles.validText : styles.errorText}>• {t('contain_number')}</p>
            <p className={passwordChecks.hasSpecialChar ? styles.validText : styles.errorText}>• {t('contain_specialChar')}</p>
          </div>

          <button
            type="submit"
            className={styles.continueButton}
            disabled={!isFormValid || continueLoading}
            aria-disabled={!isFormValid || continueLoading}
          >
            {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </form>
      </div>
    </main>
  );
}
