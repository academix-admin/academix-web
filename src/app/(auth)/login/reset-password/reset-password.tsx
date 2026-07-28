'use client';

import { useEffect, useState } from 'react';
import { useErrorDialog } from '@/hooks/useErrorDialog';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './reset-password.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { TextInput } from '@academix-admin/forms';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { useResetPassword } from '@/lib/stacks/login-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { supabaseBrowser } from '@/lib/supabase/client';
import { Header } from '@academix-admin/header';

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
  const { theme, applyTheme } = useTheme();
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

  // Confirm Password states
  const [confirmPasswordState, setConfirmPasswordState] = useState('initial');
  const [confirmPasswordInputValue, setConfirmPasswordInputValue] = useState('');
  const [confirmPasswordChecks, setConfirmPasswordChecks] = useState(false);

  const isFormValid = passwordChecks.valid && confirmPasswordChecks;

  const [error, setError] = useState('');
  const { showError, close: closeError, errorDialogNode } = useErrorDialog();
  useEffect(() => { if (error) showError(error); else closeError(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

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
      if (result1.valid && result2.valid && resetPassword?.password === resetPassword.confirm_password) {
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
        if (supabaseBrowserError.code === 'same_password') {
          setError(t('same_password'));

        } else {
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
    resetPassword$.setField({ field: 'confirm_password', value: valid ? value : '' });
  };


  // ================== Render ==================
  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {resetLoading && <div className={styles.resetLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('password_reset')}
        theme={theme}
        showBack={canGoBack}
        onBack={() => nav.pop()}
        backDisabled={resetLoading}
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
          <TextInput
            id="reset-password"
            name="password"
            label={t('password_label')}
            hint={t('password_placeholder')}
            value={passwordInputValue}
            onChange={(_, e) => handlePasswordChange(e)}
            secureToggle
            onSecureToggle={() => setError('')}
            disabled={resetLoading}
            autoComplete="new-password"
            required
            inputProps={{ 'aria-invalid': !passwordChecks.valid }}
            helperText={(confirmPasswordState === 'no_match' && !error) ? t('password_no_match') : undefined}
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              field: styles.inputWrapper,
              input: styles.input,
              toggle: styles.eyeButton,
              helper: styles.errorText,
            }}
          />

          {/* Confirm Password */}
          <div className={styles.formGroup}>
            <TextInput
              id="confirm-password"
              name="confirm-password"
              label={t('confirm_password_label')}
              hint={t('confirm_password_placeholder')}
              value={confirmPasswordInputValue}
              onChange={(_, e) => handleConfirmPasswordChange(e)}
              secureToggle
              onSecureToggle={() => setError('')}
              disabled={resetLoading}
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
            {!error && (<p className={passwordChecks.hasUppercase ? styles.validText : styles.errorText}>• {t('contain_uppercase')}</p>)}
            {!error && (<p className={passwordChecks.hasMinLength ? styles.validText : styles.errorText}>• {t('contain_sixChar')}</p>)}
            {!error && (<p className={passwordChecks.hasLowercase ? styles.validText : styles.errorText}>• {t('contain_lowercase')}</p>)}
            {!error && (<p className={passwordChecks.hasNumber ? styles.validText : styles.errorText}>• {t('contain_number')}</p>)}
            {!error && (<p className={passwordChecks.hasSpecialChar ? styles.validText : styles.errorText}>• {t('contain_specialChar')}</p>)}
          </div>

          {errorDialogNode}

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