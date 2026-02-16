'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './pin-management.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { useOtp } from '@/lib/stacks/otp-stack';
import { useUserData } from '@/lib/stacks/user-stack';

// ================== Helpers ==================
const validatePin = (value: string | null | number) => {
  if (!value) return { valid: false };
  const regex = /^\d+$/;
  return {
    valid: regex.test(String(value)) && String(value).length === 6,
    value
  };
};

// ================== Component ==================
export default function PinManagement(props: { isNew: boolean, returnGroup?: string | undefined }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { otpTimer, otpTimer$ } = useOtp();
  const { userData } = useUserData();
  const nav = useNav();
  const isTop = nav.isTop();

  const { isNew, returnGroup } = props;

  // Old PIN states (only when not creating new)
  const [oldPinInputValue, setOldPinInputValue] = useState('');
  const [oldPinState, setOldPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');
  const [showOldPin, setShowOldPin] = useState(false);

  // New PIN states
  const [newPinInputValue, setNewPinInputValue] = useState('');
  const [newPinState, setNewPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');
  const [showNewPin, setShowNewPin] = useState(false);

  // Confirm PIN states
  const [confirmPinInputValue, setConfirmPinInputValue] = useState('');
  const [confirmPinState, setConfirmPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Form states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isFormValid = isNew
    ? newPinState === 'valid' && confirmPinState === 'valid' && newPinInputValue === confirmPinInputValue
    : oldPinState === 'valid' && newPinState === 'valid' && confirmPinState === 'valid' && newPinInputValue === confirmPinInputValue;

  // ================== Effects ==================
  useEffect(() => {
    // Reset error when user starts editing
    if (error) setError('');
  }, [oldPinInputValue, newPinInputValue, confirmPinInputValue]);

  // ================== Handlers ==================
  const handleOldPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (!value) {
      setOldPinState('incomplete');
      setOldPinInputValue('');
      return;
    }

    if (value.length <= 6) setOldPinInputValue(value);

    const result = validatePin(value);
    if (result.valid) {
      setOldPinState('valid');
    } else {
      const regex = /^\d+$/;
      const hasNumber = regex.test(String(value));
      if (value.length < 6 && hasNumber) {
        setOldPinState('incomplete');
      } else {
        setOldPinState('invalid');
      }
    }
  };

  const handleNewPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (!value) {
      setNewPinState('incomplete');
      setNewPinInputValue('');
      return;
    }

    if (value.length <= 6) setNewPinInputValue(value);

    const result = validatePin(value);
    if (result.valid) {
      setNewPinState('valid');
    } else {
      const regex = /^\d+$/;
      const hasNumber = regex.test(String(value));
      if (value.length < 6 && hasNumber) {
        setNewPinState('incomplete');
      } else {
        setNewPinState('invalid');
      }
    }
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (!value) {
      setConfirmPinState('incomplete');
      setConfirmPinInputValue('');
      return;
    }

    if (value.length <= 6) setConfirmPinInputValue(value);

    const result = validatePin(value);
    if (result.valid) {
      setConfirmPinState('valid');
    } else {
      const regex = /^\d+$/;
      const hasNumber = regex.test(String(value));
      if (value.length < 6 && hasNumber) {
        setConfirmPinState('incomplete');
      } else {
        setConfirmPinState('invalid');
      }
    }
  };

  const toggleOldPinVisibility = () => {
    setShowOldPin(!showOldPin);
  };

  const toggleNewPinVisibility = () => {
    setShowNewPin(!showNewPin);
  };

  const toggleConfirmPinVisibility = () => {
    setShowConfirmPin(!showConfirmPin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setError(t('form_invalid'));
      return;
    }

    if (!userData) {
      setError(t('error_occurred'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get JWT token from Supabase session
      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        setError(t('authentication_error'));
        setIsLoading(false);
        return;
      }

      if (isNew) {
        // Create new PIN endpoint
        const response = await fetch('/api/pin/new', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userData.usersId,
            pin: newPinInputValue,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('failed_to_create_pin'));
        }

        setOldPinInputValue('');
        setNewPinInputValue('');
        setConfirmPinInputValue('');
        setError('');

        // Success navigation
        if (returnGroup) { 
          await nav.goToGroupId(returnGroup);
        } else { nav.pop(); }
      } else {
        // Change PIN endpoint
        const response = await fetch('/api/pin/change', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userData.usersId,
            oldPin: oldPinInputValue,
            newPin: newPinInputValue,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('failed_to_change_pin'));
        }

        setOldPinInputValue('');
        setNewPinInputValue('');
        setConfirmPinInputValue('');
        setError('');

        // Success navigation
        nav.pop();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('unexpected_error');
      setError(errorMessage);
      console.error('PIN operation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {(isLoading) && <div className={styles.loadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={async () => {if (returnGroup) { 
          await nav.goToGroupId(returnGroup);
        } else { nav.pop(); }}}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <h1 className={styles.title}>{t('pin_management')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
        <CachedLottie
          id="pin-management"
          src="/assets/lottie/password_reset_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>
          {isNew ? t('create_new_pin') : t('change_pin')}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Hidden username field for accessibility */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          {/* Old PIN (only when not creating new) */}
          {!isNew && (
            <div className={styles.formGroup}>
              <label htmlFor="oldPin" className={styles.label}>{t('old_pin_label')}</label>
              <div className={styles.inputWrapper}>
                <input
                  type={showOldPin ? "text" : "password"}
                  id="oldPin"
                  name="oldPin"
                  value={oldPinInputValue}
                  maxLength={6}
                  onChange={handleOldPinChange}
                  placeholder={t('pin_placeholder')}
                  className={styles.input}
                  disabled={isLoading}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="current-password"
                  aria-invalid={oldPinState === 'invalid' ? true : false}
                  required={!isNew}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={toggleOldPinVisibility}
                  aria-label={showOldPin ? "Hide PIN" : "Show PIN"}
                  disabled={isLoading}
                >
                  {showOldPin ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>
              </div>
              {oldPinState === 'incomplete' && <p className={styles.errorText}>{t('pin_incomplete')}</p>}
              {oldPinState === 'invalid' && <p className={styles.errorText}>{t('pin_invalid')}</p>}
              {oldPinState === 'valid' && <p className={styles.validText}>{t('pin_valid')}</p>}
            </div>
          )}

          {/* New PIN */}
          <div className={styles.formGroup}>
            <label htmlFor="newPin" className={styles.label}>{t('new_pin_label')}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showNewPin ? "text" : "password"}
                id="newPin"
                name="newPin"
                value={newPinInputValue}
                maxLength={6}
                onChange={handleNewPinChange}
                placeholder={t('pin_placeholder')}
                className={styles.input}
                disabled={isLoading}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                aria-invalid={newPinState === 'invalid' ? true : false}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={toggleNewPinVisibility}
                aria-label={showNewPin ? "Hide PIN" : "Show PIN"}
                disabled={isLoading}
              >
                {showNewPin ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>
            {newPinState === 'incomplete' && <p className={styles.errorText}>{t('pin_incomplete')}</p>}
            {newPinState === 'invalid' && <p className={styles.errorText}>{t('pin_invalid')}</p>}
            {newPinState === 'valid' && <p className={styles.validText}>{t('pin_valid')}</p>}
          </div>

          {/* Confirm PIN */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPin" className={styles.label}>{t('confirm_pin_label')}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showConfirmPin ? "text" : "password"}
                id="confirmPin"
                name="confirmPin"
                value={confirmPinInputValue}
                maxLength={6}
                onChange={handleConfirmPinChange}
                placeholder={t('pin_placeholder')}
                className={styles.input}
                disabled={isLoading}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                aria-invalid={confirmPinState === 'invalid' || (newPinInputValue && confirmPinInputValue && newPinInputValue !== confirmPinInputValue) ? true : false}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={toggleConfirmPinVisibility}
                aria-label={showConfirmPin ? "Hide PIN" : "Show PIN"}
                disabled={isLoading}
              >
                {showConfirmPin ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>
            {confirmPinState === 'incomplete' && <p className={styles.errorText}>{t('pin_incomplete')}</p>}
            {confirmPinState === 'invalid' && <p className={styles.errorText}>{t('pin_invalid')}</p>}
            {newPinInputValue && confirmPinInputValue && newPinInputValue !== confirmPinInputValue && (
              <p className={styles.errorText}>{t('pins_do_not_match')}</p>
            )}
            {confirmPinState === 'valid' && newPinInputValue === confirmPinInputValue && (
              <p className={styles.validText}>{t('pins_match')}</p>
            )}
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button
            type="submit"
            className={styles.signUpButton}
            disabled={!isFormValid || isLoading}
            aria-disabled={!isFormValid || isLoading}
          >
            {isLoading ? <span className={styles.spinner}></span> : t('save_pin')}
          </button>
        </form>
      </div>
    </main>
  );
}

// Icon components
function EyeOpenIcon() {
  return (
    <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.6112 17.6112C16.0556 18.979 14.1364 19.7493 12.0001 19.7493C5.63647 19.7493 2.25011 12.3743 2.25011 12.3743C3.47011 10.1443 5.27761 8.35577 7.38911 7.13965" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.8892 6.00928C21.8292 6.78928 22.6732 7.70428 23.3892 8.72428C23.7502 9.23428 23.7502 9.91428 23.3892 10.4243C22.6732 11.4443 21.8292 12.3593 20.8892 13.1393" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.9318 6.00928C13.6618 5.38928 12.2818 5.02928 10.8188 5.00928C9.35585 4.98928 7.93185 5.30928 6.61185 5.88928" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}