'use client';

import { useEffect, useState } from 'react';
import { useErrorDialog } from '@/hooks/useErrorDialog';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step7.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { TextInput } from '@academix-admin/forms';
import { getLastNameOrSingle, capitalize, treatSpaces, formatDateToDBString } from '@/utils/textUtils';
import { useSignup } from '@/lib/stacks/signup-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { Header } from '@academix-admin/header';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import { fetchUserData, ensureSession } from '@/utils/checkers';
import { StateStack } from '@academix-admin/state-stack';
import { UserData } from '@/models/user-data';

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
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const { signup, signup$, __meta } = useSignup();
  const { userData$ } = useUserData();
  const nav = useNav();
  const router = useRouter();
  const isTop = nav.isTop();

  // Social (Google) onboarding: no password — the identity is already established by the
  // OAuth provider, so this step collects only the PIN and creates the profile directly.
  const isOAuth = signup.provider != null;

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [signUpLoading, setContinueLoading] = useState(false);
  const [error, setError] = useState('');
  const { showError, close: closeError, errorDialogNode } = useErrorDialog();
  useEffect(() => { if (error) showError(error); else closeError(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // PIN states
  const [sixPinInputValue, setSixPinInputValue] = useState('');
  const [sixPinState, setSixPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');

  // Password states
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(validatePassword(''));

  const isFormValid = isOAuth ? sixPinState === 'valid' : (sixPinState === 'valid' && passwordChecks.valid);

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Classic email signup → go verify the email/phone with an OTP, then create the account.
    if (!isOAuth) {
      setContinueLoading(true);
      nav.push('verification');
      setContinueLoading(false);
      return;
    }

    // Social onboarding → the auth user already exists (verified email from Google); create
    // the academix profile for it directly (no OTP, no password), then land on /main.
    setContinueLoading(true);
    setError('');
    try {
      if (!signup.country || !signup.language || !signup.role || !signup.sixDigitPin || !signup.username || !signup.gender || !signup.authUserId) {
        setError(t('error_occurred'));
        setContinueLoading(false);
        return;
      }

      const jwt = await ensureSession();
      if (!jwt) {
        setError(t('error_occurred'));
        setContinueLoading(false);
        return;
      }

      const payload = {
        users_phone: signup.phoneNumber,
        users_dob: formatDateToDBString(signup.birthday),
        users_sex: signup.gender === 'Male' ? 'Gender.male' : 'Gender.female',
        users_username: signup.username,
        users_names: treatSpaces(signup.fullName),
        country_id: signup.country.country_id,
        language_id: signup.language.language_id,
        users_referred_id: signup.referral?.users_id || null,
        roles_id: signup.role.roles_id,
        users_pin: String(signup.sixDigitPin),
      };

      const res = await fetch('/api/create-oauth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok || result?.success === false) {
        // Already onboarded (e.g. a retry) → just proceed in.
        if (result?.code === 'PROFILE_EXISTS') {
          // fall through to the success path below
        } else {
          setError(result?.message || t('unable_to_create_account'));
          setContinueLoading(false);
          return;
        }
      }

      const userObj: UserData | null = await fetchUserData(signup.authUserId, lang);
      if (!userObj) {
        setError(t('error_occurred'));
        setContinueLoading(false);
        return;
      }

      await StateStack.core.clearScope('secondary_flow');
      await userData$.set(userObj);
      __meta.clear();
      await StateStack.core.clearScope('signup_flow');
      nav.dispose();
      router.replace('/main');
    } catch (err) {
      console.error('OAuth profile creation error:', err);
      setError(t('error_occurred'));
      setContinueLoading(false);
    }
  };

  const handleSixPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (!value) {
      setSixPinState('incomplete');
      signup$.setField({ field: 'sixDigitPin', value: null });
      setSixPinInputValue('');
      return;
    }

    if (value.length <= 6) setSixPinInputValue(value);

    const result = validatePin(value);
    if (result.valid) {
      setSixPinState('valid');
      signup$.setField({ field: 'sixDigitPin', value });
    } else if(!result.valid) {
      const regex = /^\d+$/;
      const hasNumber = regex.test(String(value));
      if(value.length < 6 && hasNumber){
         setSixPinState('incomplete');
      }else{
         setSixPinState('invalid');
      }
      signup$.setField({ field: 'sixDigitPin', value: null });
    }else{
      setSixPinState('incomplete');
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
    <main className={`${applyTheme(styles, 'container')}`}>
      {signUpLoading && <div className={styles.signUpLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('sign_up')}
        theme={theme}
        showBack={canGoBack}
        onBack={() => nav.pop()}
        backDisabled={signUpLoading}
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
          id="signup-step7"
          src="/assets/lottie/sign_up_step_7_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 7, total: 7 })}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
        {/* Hidden username field for accessibility */}
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    style={{ display: 'none' }}
                    aria-hidden="true"
                  />
          {/* PIN */}
          <TextInput
            id="sixDigitPin"
            name="sixDigitPin"
            label={t('sixDigitPin_label')}
            hint={t('sixDigitPin_placeholder')}
            value={sixPinInputValue}
            onChange={(_, e) => handleSixPinChange(e)}
            secureToggle
            keyboardType="numeric"
            pattern="[0-9]*"
            maxLength={6}
            disabled={signUpLoading}
            autoComplete="new-password"
            required
            status={sixPinState === 'invalid' ? 'error' : 'default'}
            inputProps={{ 'aria-invalid': sixPinState === 'invalid' }}
            helperText={
              sixPinState === 'incomplete' ? t('pin_incomplete')
                : sixPinState === 'invalid' ? t('pin_invalid')
                  : sixPinState === 'valid' ? t('pin_valid')
                    : undefined
            }
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              field: styles.inputWrapper,
              input: styles.input,
              toggle: styles.eyeButton,
              helper: sixPinState === 'valid' ? styles.validText : styles.errorText,
            }}
          />

          {/* Password — classic email signup only; social users have no password. */}
          {!isOAuth && (
            <div className={styles.formGroup}>
              <TextInput
                id="password"
                name="password"
                label={t('password_label')}
                hint={t('password_placeholder')}
                value={passwordInputValue}
                onChange={(_, e) => handlePasswordChange(e)}
                secureToggle
                disabled={signUpLoading}
                autoComplete="new-password"
                required
                inputProps={{ 'aria-invalid': !passwordChecks.valid }}
                classNames={{
                  root: styles.textInputRoot,
                  label: styles.label,
                  field: styles.inputWrapper,
                  input: styles.input,
                  toggle: styles.eyeButton,
                }}
              />
              <p className={passwordChecks.hasUppercase ? styles.validText : styles.errorText}>• {t('contain_uppercase')}</p>
              <p className={passwordChecks.hasMinLength ? styles.validText : styles.errorText}>• {t('contain_sixChar')}</p>
              <p className={passwordChecks.hasLowercase ? styles.validText : styles.errorText}>• {t('contain_lowercase')}</p>
              <p className={passwordChecks.hasNumber ? styles.validText : styles.errorText}>• {t('contain_number')}</p>
              <p className={passwordChecks.hasSpecialChar ? styles.validText : styles.errorText}>• {t('contain_specialChar')}</p>
            </div>
          )}

          {errorDialogNode}

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