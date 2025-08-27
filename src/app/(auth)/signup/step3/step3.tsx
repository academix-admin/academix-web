'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step3.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup } from '@/lib/stacks/signup-stack';
import { useNav } from "@/lib/NavigationStack";

export default function SignUpStep3() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { signup, signup$, __meta } = useSignup();
  const nav = useNav();
  const isTop = nav.isTop();

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [userNameState, setUserNameState] = useState('initial');
  const [phoneNumberState, setPhoneNumberState] = useState('initial');
  const [phoneInputValue, setPhoneInputValue] = useState('');
  const [usernameInputValue, setUsernameInputValue] = useState('');

  // Refs for tracking the latest validation request
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValidationIdRef = useRef(0);

  useEffect(() => {
    if (!signup.fullName && __meta.isHydrated && isTop) { nav.go('step1'); }
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName || '')));
  }, [signup.fullName, __meta.isHydrated, isTop, nav]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
   const cleanValue = signup.phoneNumber?.replace(signup.country?.country_phone_code || '', '') || '';
      if(!!cleanValue && cleanValue != phoneInputValue){
              const regex = /^\d+$/;
              const valid = regex.test(cleanValue);
              const length = signup.country?.country_phone_digit || 0;

              if (valid && cleanValue.length === length) {
                        setPhoneNumberState('valid');
              }
       setPhoneInputValue(cleanValue);
    }
  }, [signup.phoneNumber, signup.country]);

  useEffect(() => {
      const cleanValue = signup?.username.replace('@', '') || '';
      if(!!cleanValue && cleanValue != usernameInputValue){
      setUsernameInputValue(cleanValue);
      latestValidationIdRef.current += 1;
        const currentValidationId = latestValidationIdRef.current;

        // Set state to checking immediately for better UX
        setUserNameState('checking');
        validateUsername(cleanValue, currentValidationId);
    }
  }, [signup.username]);

  useEffect(() => {
    setIsFormValid(!!signup.phoneNumber && userNameState === 'valid');
  }, [signup.phoneNumber, userNameState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    try {
      const { data: rpcResult, error } = await supabaseBrowser.rpc('check_phone_exist', {
        p_phone: signup.phoneNumber
      });

      if (error) throw error;

      if (rpcResult) {
        setPhoneNumberState('exists');
      } else {
        signup$.setStep(4);
        nav.push('step4');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContinueLoading(false);
    }
  };

  const isEmail = (value: string): boolean => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;
    return emailRegex.test(value);
  };

  const containsUpperCase = (value: string): boolean => {
    return /[A-Z]/.test(value);
  };

  const getSpecialCharacters = (value: string): string[] => {
    const specialCharactersRegExp = /[^a-zA-Z0-9]/g;
    const matches = value.match(specialCharactersRegExp);
    return matches ? matches : [];
  };

  const validateUsername = async (cleanValue: string, validationId: number) => {
    // If this is not the latest validation request, ignore the result
    if (validationId !== latestValidationIdRef.current) {
      return;
    }

    try {
      setUserNameState('checking');
      const { data: exists, error } = await supabaseBrowser.rpc('check_username_exist', {
        p_username: `@${cleanValue}`
      });

      // Still check if this is the latest validation request
      if (validationId !== latestValidationIdRef.current) {
        return;
      }

      if (error) throw error;

      if (exists) {
        setUserNameState('exists');
        signup$.setField({ field: 'username', value: '' });
      } else {
        setUserNameState('valid');
        signup$.setField({ field: 'username', value: `@${cleanValue}` });
      }
    } catch (err) {
      if (validationId === latestValidationIdRef.current) {
        setUserNameState('error');
        signup$.setField({ field: 'username', value: '' });
        console.error('Failed to check username:', err);
      }
    }
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleanValue = value.replace('@', '');
    setUsernameInputValue(cleanValue);

    if (cleanValue.length === 0) {
      // Cancel any pending validation
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
      setUserNameState('initial');
      signup$.setField({ field: 'username', value: '' });
      return;
    }

    // Format validation
    if (isEmail(cleanValue) || containsUpperCase(cleanValue) ||
        !getSpecialCharacters(cleanValue).every(c => c === '.' || c === '_')) {
      // Cancel any pending validation
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
      setUserNameState('wrongFormat');
      signup$.setField({ field: 'username', value: '' });
      return;
    }

    // Cancel any previous validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Increment validation ID to invalidate previous requests
    latestValidationIdRef.current += 1;
    const currentValidationId = latestValidationIdRef.current;

    // Set state to checking immediately for better UX
    setUserNameState('checking');

    // Debounce the validation to avoid excessive API calls
    validationTimeoutRef.current = setTimeout(() => {
      validateUsername(cleanValue, currentValidationId);
    }, 500); // 500ms debounce delay
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (value.length === 0) {
      setPhoneNumberState('initial');
      signup$.setField({ field: 'phoneNumber', value: '' });
      setPhoneInputValue('');
      return;
    }

    const regex = /^\d+$/;
    const valid = regex.test(value);
    const length = signup.country?.country_phone_digit || 0;

    if (value.length <= length) {
      setPhoneInputValue(value);
    }

    if (valid && value.length === length) {
      setPhoneNumberState('valid');
      signup$.setField({
        field: 'phoneNumber',
        value: `${signup.country?.country_phone_code || ''}${value}`
      });
    } else if (!valid) {
      setPhoneNumberState('invalid');
      signup$.setField({ field: 'phoneNumber', value: '' });
    } else {
      setPhoneNumberState('initial');
      signup$.setField({ field: 'phoneNumber', value: '' });
    }
  };

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

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
          id="signup-step3"
          src="/assets/lottie/sign_up_step_3_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', {
          current: 3,
          total: 7
        })}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="phoneNumber" className={styles.label}>{t('phone_number_label')}</label>
            <div className={styles.phoneInputContainer}>
              <span className={styles.prefix}>{`${signup.country?.country_phone_code || ''} - `}</span>
              <input
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                value={phoneInputValue}
                maxLength={signup.country?.country_phone_digit || 0}
                onChange={handlePhoneNumberChange}
                placeholder={t('phone_number_placeholder')}
                className={styles.input}
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </div>
            {phoneNumberState === 'exists' && (
              <p className={styles.errorText}>{t('phone_number_exists')}</p>
            )}
            {phoneNumberState === 'invalid' && (
              <p className={styles.errorText}>{t('phone_number_invalid')}</p>
            )}
            {phoneNumberState === 'valid' && (
              <p className={styles.validText}>{t('phone_number_valid')}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>{t('username_label')}</label>
            <div className={styles.usernameInputContainer}>
              <span className={styles.prefix}>@</span>
              <input
                type="text"
                id="username"
                name="username"
                value={usernameInputValue}
                onChange={handleUserNameChange}
                placeholder={t('username_placeholder')}
                className={styles.input}
                required
                autoCapitalize="none"
              />
            </div>
            {userNameState === 'wrongFormat' && (
              <p className={styles.errorText}>{t('username_wrong_format')}</p>
            )}
            {userNameState === 'exists' && (
              <p className={styles.errorText}>{t('username_exist')}</p>
            )}
            {userNameState === 'error' && (
              <p className={styles.errorText}>{t('username_error')}</p>
            )}
            {userNameState === 'valid' && (
              <p className={styles.validText}>{t('username_valid')}</p>
            )}
            {userNameState === 'checking' && (
              <span className={styles.usernameSpinner}></span>
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