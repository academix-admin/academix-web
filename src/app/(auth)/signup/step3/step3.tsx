'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step3.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { TextInput } from '@/components/TextInput';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup } from '@/lib/stacks/signup-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { Header } from '@academix-admin/header';

export default function SignUpStep3() {
  const { theme, applyTheme } = useTheme();
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
    <main className={`${applyTheme(styles, 'container')}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('sign_up')}
        theme={theme}
        showBack={canGoBack}
        onBack={() => nav.pop()}
        backDisabled={continueLoading}
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
          <TextInput
            id="phoneNumber"
            name="phoneNumber"
            label={t('phone_number_label')}
            hint={t('phone_number_placeholder')}
            value={phoneInputValue}
            onChange={(_, e) => handlePhoneNumberChange(e)}
            prefix={`${signup.country?.country_phone_code || ''} - `}
            keyboardType="numeric"
            pattern="[0-9]*"
            maxLength={signup.country?.country_phone_digit || 0}
            required
            status={phoneNumberState === 'valid' ? 'valid' : (phoneNumberState === 'exists' || phoneNumberState === 'invalid') ? 'error' : 'default'}
            helperText={
              phoneNumberState === 'exists' ? t('phone_number_exists')
                : phoneNumberState === 'invalid' ? t('phone_number_invalid')
                  : phoneNumberState === 'valid' ? t('phone_number_valid')
                    : undefined
            }
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              field: styles.phoneInputContainer,
              prefix: styles.prefix,
              input: styles.input,
              helper: phoneNumberState === 'valid' ? styles.validText : styles.errorText,
            }}
          />

          <div className={styles.formGroup}>
            <TextInput
              id="username"
              name="username"
              label={t('username_label')}
              hint={t('username_placeholder')}
              value={usernameInputValue}
              onChange={(_, e) => handleUserNameChange(e)}
              required
              autoCapitalize="none"
              prefix="@"
              status={
                userNameState === 'valid' ? 'valid'
                  : (userNameState === 'wrongFormat' || userNameState === 'exists' || userNameState === 'error') ? 'error'
                    : 'default'
              }
              helperText={
                userNameState === 'wrongFormat' ? t('username_wrong_format')
                  : userNameState === 'exists' ? t('username_exist')
                    : userNameState === 'error' ? t('username_error')
                      : userNameState === 'valid' ? t('username_valid')
                        : undefined
              }
              classNames={{
                root: styles.textInputRoot,
                label: styles.label,
                field: styles.usernameInputContainer,
                prefix: styles.prefix,
                input: styles.input,
                helper: userNameState === 'valid' ? styles.validText : styles.errorText,
              }}
            />
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