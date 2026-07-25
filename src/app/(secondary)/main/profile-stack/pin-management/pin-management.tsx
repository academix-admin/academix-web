'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './pin-management.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { TextInput } from '@academix-admin/forms';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@academix-admin/navigation-stack";
import { useOtp } from '@/lib/stacks/otp-stack';
import { useUserData } from '@/lib/stacks/user-stack';
import { Header } from '@academix-admin/header';

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
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const { otpTimer, otpTimer$ } = useOtp();
  const { userData } = useUserData();
  const nav = useNav();
  const isTop = nav.isTop();

  const { isNew, returnGroup } = props;

  // Old PIN states (only when not creating new)
  const [oldPinInputValue, setOldPinInputValue] = useState('');
  const [oldPinState, setOldPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');

  // New PIN states
  const [newPinInputValue, setNewPinInputValue] = useState('');
  const [newPinState, setNewPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');

  // Confirm PIN states
  const [confirmPinInputValue, setConfirmPinInputValue] = useState('');
  const [confirmPinState, setConfirmPinState] = useState<'initial' | 'valid' | 'invalid' | 'incomplete'>('incomplete');

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
          nav.pop()
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
    <main className={`${applyTheme(styles, 'container')}`}>
      {(isLoading) && <div className={styles.loadingOverlay} aria-hidden="true" />}

      <Header
        title={t('pin_management')}
        theme={theme}
        onBack={async () => {
          if (returnGroup) {
            await nav.goToGroupId(returnGroup);
          } else {
            nav.pop();
          }
        }}
      />

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
            <TextInput
              id="oldPin"
              name="oldPin"
              label={t('old_pin_label')}
              hint={t('pin_placeholder')}
              value={oldPinInputValue}
              onChange={(_, e) => handleOldPinChange(e)}
              secureToggle
              keyboardType="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={isLoading}
              autoComplete="current-password"
              required={!isNew}
              status={oldPinState === 'invalid' ? 'error' : 'default'}
              inputProps={{ 'aria-invalid': oldPinState === 'invalid' }}
              helperText={
                oldPinState === 'incomplete' ? t('pin_incomplete')
                  : oldPinState === 'invalid' ? t('pin_invalid')
                    : oldPinState === 'valid' ? t('pin_valid')
                      : undefined
              }
              classNames={{
                root: styles.formGroup,
                label: styles.label,
                field: styles.inputWrapper,
                input: styles.input,
                toggle: styles.eyeButton,
                helper: oldPinState === 'valid' ? styles.validText : styles.errorText,
              }}
            />
          )}

          {/* New PIN */}
          <TextInput
            id="newPin"
            name="newPin"
            label={t('new_pin_label')}
            hint={t('pin_placeholder')}
            value={newPinInputValue}
            onChange={(_, e) => handleNewPinChange(e)}
            secureToggle
            keyboardType="numeric"
            pattern="[0-9]*"
            maxLength={6}
            disabled={isLoading}
            autoComplete="new-password"
            required
            status={newPinState === 'invalid' ? 'error' : 'default'}
            inputProps={{ 'aria-invalid': newPinState === 'invalid' }}
            helperText={
              newPinState === 'incomplete' ? t('pin_incomplete')
                : newPinState === 'invalid' ? t('pin_invalid')
                  : newPinState === 'valid' ? t('pin_valid')
                    : undefined
            }
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              field: styles.inputWrapper,
              input: styles.input,
              toggle: styles.eyeButton,
              helper: newPinState === 'valid' ? styles.validText : styles.errorText,
            }}
          />

          {/* Confirm PIN */}
          <div className={styles.formGroup}>
            <TextInput
              id="confirmPin"
              name="confirmPin"
              label={t('confirm_pin_label')}
              hint={t('pin_placeholder')}
              value={confirmPinInputValue}
              onChange={(_, e) => handleConfirmPinChange(e)}
              secureToggle
              keyboardType="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={isLoading}
              autoComplete="new-password"
              required
              inputProps={{ 'aria-invalid': confirmPinState === 'invalid' || !!(newPinInputValue && confirmPinInputValue && newPinInputValue !== confirmPinInputValue) }}
              classNames={{
                root: styles.textInputRoot,
                label: styles.label,
                field: styles.inputWrapper,
                input: styles.input,
                toggle: styles.eyeButton,
              }}
            />
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