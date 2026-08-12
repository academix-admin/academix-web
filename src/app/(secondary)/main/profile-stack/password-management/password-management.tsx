'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './password-management.module.css';
import { TextInput } from '@academix-admin/forms';
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@academix-admin/navigation-stack";
import { useUserData } from '@/lib/stacks/user-stack';
import { Header } from '@academix-admin/header';

const validatePassword = (value: string) => {
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
  // Must match GoTrue's password_min_length (8). Kept in step with the signup and
  // reset-password screens; the LOGIN screen deliberately stays at 6 so existing users with
  // shorter passwords can still sign in.
  const hasMinLength = value.length >= 8;

  return {
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasMinLength,
    valid: hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasMinLength,
  };
};


export default function PasswordManagement() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const { userData } = useUserData();
  const nav = useNav();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Password states
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(validatePassword(''));

  // Confirm Password states
  const [confirmPasswordState, setConfirmPasswordState] = useState('initial');
  const [confirmPasswordInputValue, setConfirmPasswordInputValue] = useState('');
  const [confirmPasswordChecks, setConfirmPasswordChecks] = useState(false);

  const isFormValid = passwordChecks.valid && confirmPasswordChecks;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setPasswordInputValue(value);
    setError('');

    const result = validatePassword(value);
    handleConfirmPasswordValidation(confirmPasswordInputValue, value);
    setPasswordChecks(result);
  };

  const handleConfirmPasswordValidation = (value: string, currentPassword?: string) => {
    const passwordToCompare = currentPassword || passwordInputValue;
    
    if (value.length <= 0) {
      setConfirmPasswordState('initial');
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

    handleConfirmPasswordValidation(value);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: supabaseBrowserError } = await supabaseBrowser.auth.updateUser({
        password: passwordInputValue
      });
      
      if (supabaseBrowserError) {
        if (supabaseBrowserError.code === 'same_password') {
          setError(t('same_password'));
        } else if (supabaseBrowserError.code === 'reauthentication_needed') {
          // GoTrue requires a fresh authentication when the session is missing or older than
          // 24h (security_update_password_require_reauthentication). Normally unreachable,
          // because reaching this screen goes through security_otp, which mints a new session.
          // If it does happen, send the user back to verify again instead of showing a dead
          // generic error -- the recovery path stays open, so nobody is stranded.
          setError(t('verification_expired') || 'Please verify again to change your password.');
          nav.push('security_verification', { request: 'Password' });
        } else {
          setError(t('error_occurred'));
        }
      } else if (data?.user?.id) {
        nav.pop();
      }
    } catch (err) {
      setError(t('error_occurred'));
    }

    setIsLoading(false);
  };


  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {isLoading && <div className={styles.loadingOverlay} aria-hidden="true" />}

      <Header
        title={t('change_password')}
        theme={theme}
        onBack={() => nav.pop()}
        backDisabled={isLoading}
      />

      <div className={styles.innerBody}>
        <CachedLottie
          id="password-management"
          src="/assets/lottie/password_reset_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

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
            id="password"
            name="password"
            label={t('password_label')}
            hint={t('password_placeholder')}
            value={passwordInputValue}
            onChange={(_, e) => handlePasswordChange(e)}
            secureToggle
            onSecureToggle={() => setError('')}
            disabled={isLoading}
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
              disabled={isLoading}
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
            {!error && <p className={passwordChecks.hasUppercase ? styles.validText : styles.errorText}>• {t('contain_uppercase')}</p>}
            {!error && <p className={passwordChecks.hasMinLength ? styles.validText : styles.errorText}>• {t('contain_sixChar')}</p>}
            {!error && <p className={passwordChecks.hasLowercase ? styles.validText : styles.errorText}>• {t('contain_lowercase')}</p>}
            {!error && <p className={passwordChecks.hasNumber ? styles.validText : styles.errorText}>• {t('contain_number')}</p>}
            {!error && <p className={passwordChecks.hasSpecialChar ? styles.validText : styles.errorText}>• {t('contain_specialChar')}</p>}
          </div>

          {error && (
            <div className={styles.errorSection}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className={styles.resetButton}
            disabled={!isFormValid || isLoading}
            aria-disabled={!isFormValid || isLoading}
          >
            {isLoading ? <span className={styles.spinner}></span> : t('reset')}
          </button>
        </form>
      </div>
    </main>
  );
}