'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './pin.module.css';
import Link from 'next/link';
import { useNav, useObject } from "@academix-admin/navigation-stack";
import { PinData } from '@/models/pin-data';
import { Header } from '@academix-admin/header';
import { PinInput, Keypad } from '@academix-admin/pin-input';

export default function Otp() {
  const { theme, applyTheme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const nav = useNav();
  const isTop = nav.isTop();

  const [pinValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showPin, setShowPin] = useState(false);  // ✅ PIN visibility state, default hidden

  const disableOperation = isLoading || isRequesting ;

  const firstInputRef = useRef<HTMLInputElement>(null);

  const pinController = useObject<PinData>('pin_controller', {scope: 'pin_scope'});


  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);



  // Handle Pin completion
  const verifyOTP = async () => {
    if (pinValue.length !== 6 || !pinController.isProvided) return;
    await nav.pop();
     requestAnimationFrame( async() => {
          await pinController.getter().action(pinValue);
        });
    
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (pinValue.length === 6 && !error) {
      verifyOTP();
    }
  }, [pinValue]);

  useEffect(() => {
    if (!pinController.isProvided) return;
    
    if(!pinController.getter().inUse){
      nav.pop();
    }
  }, [pinController.isProvided]);

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {(isRequesting || isLoading) && <div className={styles.loadingOverlay} aria-hidden="true" />}

      <Header title={t('pin_text')} theme={theme} onBack={() => nav.pop()} />

      <div className={styles.innerBody}>
        <div className={styles.otpSection}>
          {isLoading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
            </div>
          ) : (
            <PinInput
              value={pinValue}
              onChange={setOtpValue}
              disabled={isLoading}
              error={!!error}
              mask
              revealed={showPin}
              inputProps={{
                autoComplete: 'off',
                spellCheck: false,
                'data-lpignore': 'true',
                'data-1p-ignore': true,
                'data-bitwarden-ignore': true,
              }}
              classNames={{
                container: styles.otpContainer,
                containerError: styles.otpError,
                input: styles.otpInput,
              }}
            />
          )}

          <p className={styles.instructions}>
            {t('six_digit_pin')}
          </p>
        </div>

        <div className={styles.errorSection}>
          <p className={`${styles.errorText} ${error ? '' : styles.hideError}`}>
            {error}
          </p>
        </div>

        <div className={styles.keypadSection}>
          <Keypad
            value={pinValue}
            onChange={setOtpValue}
            disabled={isLoading}
            error={!!error}
            showMaskToggle
            revealed={showPin}
            onToggleReveal={setShowPin}
            classNames={{
              keypad: styles.keypad,
              grid: styles.keypadGrid,
              button: styles.keypadButton,
              backspace: styles.backspaceButton,
              toggle: styles.eyeButton,
            }}
          />
        </div>
      </div>
    </main>
  );
}