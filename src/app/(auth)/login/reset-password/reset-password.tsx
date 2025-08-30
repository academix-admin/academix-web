'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './reset-password.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { useResetPassword } from '@/lib/stacks/login-stack';
import { useNav } from "@/lib/NavigationStack";
import { supabaseBrowser } from '@/lib/supabase/client';

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

interface ResetPasswordProps {
  names: string;
}

// ================== Component ==================
export default function ResetPassword(props: ResetPasswordProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { resetPassword, resetPassword$, __meta } = useResetPassword();
  const nav = useNav();
  const isTop = nav.isTop();
  
  const { names } = props;

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Password states
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(validatePassword(''));
  const [showPassword, setShowPassword] = useState(false);

  // Confirm Password states
  const [confirmPasswordState, setConfirmPasswordState] = useState('initial');
  const [confirmPasswordInputValue, setConfirmPasswordInputValue] = useState('');
  const [confirmPasswordChecks, setConfirmPasswordChecks] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isFormValid = passwordChecks.valid && confirmPasswordChecks;

  const [error, setError] = useState('');

  // ================== Effects ==================

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    if (resetPassword?.password) {
      const result = validatePassword(resetPassword.password);
      setPasswordChecks(result);
      setPasswordInputValue(resetPassword.password);
    }
  }, [resetPassword?.password]);

  useEffect(() => {
    if (resetPassword?.confirm_password) {
      const result1 = validatePassword(resetPassword.password);
      const result2 = validatePassword(resetPassword.confirm_password);
      if(result1.valid  && result2.valid && resetPassword?.password === resetPassword.confirm_password){
          setConfirmPasswordChecks(true);
          setConfirmPasswordInputValue(resetPassword.confirm_password);
      }
    }
  }, [resetPassword?.confirm_password]);



  // ================== Handlers ==================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setResetLoading(true);
    setError('');
    
    try {
      const { data, error: supabaseBrowserError } = await supabaseBrowser.auth.updateUser({
        password: passwordInputValue
      });
      
      if (supabaseBrowserError) {
                  console.log(supabaseBrowserError.code);
        if(supabaseBrowserError.code === 'same_password'){
                                setError(t('same_password'));

        }else{
                    setError(t('error_occurred'));
       }

      } else if (data?.user?.id) {
        nav.go('login');
        __meta.clear();
      }
    } catch (err) {
      setError(t('error_occurred'));
    }

    setResetLoading(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setPasswordInputValue(value);
    setError('');

    const result = validatePassword(value);
    handleConfirmPasswordValidation(confirmPasswordInputValue, value);
    setPasswordChecks(result);


    resetPassword$.setField({ field: 'password', value: result.valid ? value : '' });
  };

  const handleConfirmPasswordValidation = (value: string, currentPassword?: string) => {
    const passwordToCompare = currentPassword || passwordInputValue;
    
    if (value.length <= 0) {
      setConfirmPasswordState('initial');
      resetPassword$.setField({ field: 'confirm_password', value: '' });
      setPasswordChecks(validatePassword(''));
      setConfirmPasswordChecks(false);
      return false;
    }
    
    if (!passwordToCompare) {
      setConfirmPasswordState('no_password');
      const confirm = validatePassword(value);
      setPasswordChecks(confirm);
      setConfirmPasswordChecks(confirm.valid);
      return false;
    }
    
    const result = validatePassword(passwordToCompare);
    if (result.valid) {
      if (value === passwordToCompare) {
        setConfirmPasswordChecks(true);
        setConfirmPasswordState('password_match');
        return true;
      } else {
        setConfirmPasswordChecks(false);
        setConfirmPasswordState('no_match');
        return false;
      }
    } else {
      setConfirmPasswordState((currentPassword?.length || 1) > 0 ? 'invalid_password' : 'no_password');
      const confirm = validatePassword(value);
      setPasswordChecks(confirm);
      setConfirmPasswordChecks(confirm.valid);
      return false;
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setConfirmPasswordInputValue(value);
    setError('');

    const valid = handleConfirmPasswordValidation(value);
    resetPassword$.setField({ field: 'confirm_password', value: valid ? value :'' });
  };

  const togglePasswordVisibility = () => {
    setError('');
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setError('');
    setShowConfirmPassword(!showConfirmPassword);
  };

  // ================== Render ==================
  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {resetLoading && <div className={styles.resetLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
              aria-label="Go back"
              disabled={resetLoading}
            >
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}

          <h1 className={styles.title}>{t('password_reset')}</h1>

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
          id="reset-password"
          src="/assets/lottie/password_reset_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: capitalize(getLastNameOrSingle(names)) })}</h2>
        <h2 className={styles.stepSubtitle}>{t('access_to_academix')}</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
        {/* Hidden username field for accessibility */}
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    style={{ display: 'none' }}
                    aria-hidden="true"
                  />

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>{t('password_label')}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="reset-password"
                name="password"
                value={passwordInputValue}
                onChange={handlePasswordChange}
                placeholder={t('password_placeholder')}
                className={styles.input}
                disabled={resetLoading}
                autoComplete={'new-password'}
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
            {confirmPasswordState === 'no_match' && !error && (
                            <p className={styles.errorText}>{t('password_no_match')}</p>
            )}
          </div>
          
          {/* Confirm Password */}
          <div className={styles.formGroup}>
            <label htmlFor="confirm-password" className={styles.label}>{t('confirm_password_label')}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                name="confirm-password"
                value={confirmPasswordInputValue}
                onChange={handleConfirmPasswordChange}
                placeholder={t('confirm_password_placeholder')}
                className={styles.input}
                disabled={resetLoading}
                autoComplete={'new-password'}
                aria-invalid={!passwordChecks.valid}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
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
            {confirmPasswordState === 'no_password' && !error && (
                <p className={styles.errorText}>{t('enter_password')}</p>
            )}
            {confirmPasswordState === 'no_match' && !error && (
                <p className={styles.errorText}>{t('password_no_match')}</p>
            )}
            {confirmPasswordState === 'invalid_password' && !error && (
                <p className={styles.errorText}>{t('password_not_valid')}</p>
            )}
            {confirmPasswordState === 'match' && !error && (
                <p className={styles.validText}>{t('password_match')}</p>
            )}
            { !error  && (<p className={passwordChecks.hasUppercase ? styles.validText : styles.errorText}>• {t('contain_uppercase')}</p>)}
            { !error  && (<p className={passwordChecks.hasMinLength ? styles.validText : styles.errorText}>• {t('contain_sixChar')}</p>)}
            { !error  && (<p className={passwordChecks.hasLowercase ? styles.validText : styles.errorText}>• {t('contain_lowercase')}</p>)}
            { !error  && (<p className={passwordChecks.hasNumber ? styles.validText : styles.errorText}>• {t('contain_number')}</p>)}
            { !error  && (<p className={passwordChecks.hasSpecialChar ? styles.validText : styles.errorText}>• {t('contain_specialChar')}</p>)}
          </div>

          {error && ( <div className={styles.errorSection}>
                      <p className={styles.errorText}>
                                {error}
                      </p>
                    </div>)}

          <button
            type="submit"
            className={styles.resetButton}
            disabled={!isFormValid || resetLoading}
            aria-disabled={!isFormValid || resetLoading}
          >
            {resetLoading ? <span className={styles.spinner}></span> : t('reset')}
          </button>
        </form>
      </div>
    </main>
  );
}