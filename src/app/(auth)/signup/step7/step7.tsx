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
  const [signUpLoading, setContinueLoading] = useState(false);

  // PIN states
  const [sixPinInputValue, setSixPinInputValue] = useState('');
  const [sixPinState, setSixPinState] = useState<'initial' | 'valid' | 'invalid'>('initial');
  const [showPin, setShowPin] = useState(false);

  // Password states
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(validatePassword(''));
  const [showPassword, setShowPassword] = useState(false);

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

  const togglePinVisibility = () => {
    setShowPin(!showPin);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ================== Render ==================
  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {signUpLoading && <div className={styles.signUpLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
              aria-label="Go back"
              disabled={signUpLoading}
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
            <div className={styles.inputWrapper}>
              <input
                type={showPin ? "text" : "password"}
                id="sixDigitPin"
                name="sixDigitPin"
                value={sixPinInputValue}
                maxLength={6}
                onChange={handleSixPinChange}
                placeholder={t('sixDigitPin_placeholder')}
                className={styles.input}
                disabled={signUpLoading}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-invalid={sixPinState === 'invalid'}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={togglePinVisibility}
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.6112 17.6112C16.0556 18.979 14.1364 19.7493 12.0001 19.7493C5.63647 19.7493 2.25011 12.3743 2.25011 12.3743C3.47011 10.1443 5.27761 8.35577 7.38911 7.13965" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.8892 6.00928C21.8292 6.78928 22.6732 7.70428 23.3892 8.72428C23.7502 9.23428 23.7502 9.91428 23.3892 10.4243C22.6732 11.4443 21.8292 12.3593 20.8892 13.1393" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.9318 6.00928C13.6618 5.38928 12.2818 5.02928 10.8188 5.00928C9.35585 4.98928 7.93185 5.30928 6.61185 5.88928" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            {sixPinState === 'invalid' && <p className={styles.errorText}>{t('pin_invalid')}</p>}
            {sixPinState === 'valid' && <p className={styles.validText}>{t('pin_valid')}</p>}
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>{t('password_label')}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={passwordInputValue}
                onChange={handlePasswordChange}
                placeholder={t('password_placeholder')}
                className={styles.input}
                disabled={signUpLoading}
                aria-invalid={!passwordChecks.valid}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.6112 17.6112C16.0556 18.979 14.1364 19.7493 12.0001 19.7493C5.63647 19.7493 2.25011 12.3743 2.25011 12.3743C3.47011 10.1443 5.27761 8.35577 7.38911 7.13965" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.8892 6.00928C21.8292 6.78928 22.6732 7.70428 23.3892 8.72428C23.7502 9.23428 23.7502 9.91428 23.3892 10.4243C22.6732 11.4443 21.8292 12.3593 20.8892 13.1393" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.9318 6.00928C13.6618 5.38928 12.2818 5.02928 10.8188 5.00928C9.35585 4.98928 7.93185 5.30928 6.61185 5.88928" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            <p className={passwordChecks.hasUppercase ? styles.validText : styles.errorText}>• {t('contain_uppercase')}</p>
            <p className={passwordChecks.hasMinLength ? styles.validText : styles.errorText}>• {t('contain_sixChar')}</p>
            <p className={passwordChecks.hasLowercase ? styles.validText : styles.errorText}>• {t('contain_lowercase')}</p>
            <p className={passwordChecks.hasNumber ? styles.validText : styles.errorText}>• {t('contain_number')}</p>
            <p className={passwordChecks.hasSpecialChar ? styles.validText : styles.errorText}>• {t('contain_specialChar')}</p>
          </div>

          <button
            type="submit"
            className={styles.signUpButton}
            disabled={!isFormValid || signUpLoading}
            aria-disabled={!isFormValid || signUpLoading}
          >
            {signUpLoading ? <span className={styles.spinner}></span> : t('sign_up')}
          </button>
        </form>
      </div>
    </main>
  );
}