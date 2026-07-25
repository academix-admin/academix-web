'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './security-otp.module.css';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@academix-admin/navigation-stack";
import { useOtp } from '@/lib/stacks/otp-stack';
import { createStateStack, useDemandState, StateStack } from '@academix-admin/state-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import {  fetchUserData } from '@/utils/checkers';
import { useRouter } from "next/navigation";
import { Header } from '@academix-admin/header';
import { PinInput, Keypad } from '@academix-admin/pin-input';

// Define props interface for the Otp component
interface SecurityOtpProps {
  request: 'Pin' | 'Password';
  verification: 'Email' | 'Phone';
  value: string;
  isNew: boolean;
  returnGroup: string | undefined;
}

export default function SecurityOtp(props: SecurityOtpProps) {
  const { theme, applyTheme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { otpTimer, otpTimer$, __meta } = useOtp();
  const { userData, userData$ } = useUserData();
  const nav = useNav();
  const isTop = nav.isTop();
  const { replaceAndWait } = useAwaitableRouter();
  const router = useRouter();

  const [otpValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const { verification, request, value, isNew, returnGroup } = props;
  const disableOperation = isLoading || isRequesting || (otpTimer.isRunning && remainingSeconds > 0);

  const firstInputRef = useRef<HTMLInputElement>(null);

  
    useEffect(() => {
        if (!otpTimer.expiresAt && __meta.isHydrated && isTop) {
          nav.popToRoot();
        }
    }, [otpTimer.expiresAt, __meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  // Calculate remaining time effect
  useEffect(() => {
    if (!otpTimer.isRunning || !otpTimer.expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemainingTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((otpTimer.expiresAt - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining === 0 && otpTimer.isRunning) {
        otpTimer$.stop();
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(interval);
  }, [otpTimer.expiresAt, otpTimer.isRunning]);

  // Request new OTP code
  const requestOTP = async () => {
    if (isRequesting || !request || !value) return;

    setIsRequesting(true);
    setError('');
    try {

  
         if (verification === 'Email') {
           await resetPasswordForEmail(value);
         } else if (verification === 'Phone') {
           await resetPasswordForPhone(value);
         }
     

      otpTimer$.start(300);
    } catch (error) {
      console.error("Failed to request OTP:", error);
      setError(t('resend_failed'));
    } finally {
      setIsRequesting(false);
    }
  };

  // Handle OTP verification
  const verifyOTP = async () => {
    if (otpValue.length !== 6 || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      let result;
     
      if (verification === 'Email') {
        result = await verifyPasswordResetEmailOTP(value, otpValue);
      } else if (verification === 'Phone') {
        result = await verifyPhoneNumberWithOTP(value, otpValue);
      }
     

      if (result?.error) {
        setError(t('incorrect_code'));
        // Vibrate on error
        if (navigator.vibrate) navigator.vibrate(200);
        setIsLoading(false);
      } else {
        // OTP verified successfully
      if(request === 'Pin') {
        nav.pushAndPopUntil('pin_mangement', (entry)=> entry.key === (isNew ? 'profile_page' : 'security_page'), { isNew: isNew ?? false, returnGroup: returnGroup });
      } else {
        nav.pushAndPopUntil('password_management', (entry)=> entry.key === 'security_page');
      }
          __meta.clear();
          setIsLoading(false);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError(t('network_error'));
      setIsLoading(false);
    }
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otpValue.length === 6 && !error) {
      verifyOTP();
    } if(!!error && otpValue.length <= 6){
      setError('');
    }
  }, [otpValue]);

  const resetPasswordForEmail = async (email: string) => {
      const { data, error } = await supabaseBrowser.auth.resetPasswordForEmail(email);
      if (error) {
        console.error('Error resetting password for email:', error);
        throw error;
      }
      return data;
    }
    const resetPasswordForPhone = async (phone: string) => {
      const { data, error } = await supabaseBrowser.auth.signInWithOtp({phone, options: { shouldCreateUser: false }});
      if (error) {
        console.error('Error resetting password for phone:', error);
        throw error;
      }
      return data;
    }


  const verifyPasswordResetEmailOTP = async (email: string, token: string) => {
      return await supabaseBrowser.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });
  };

  const verifyPhoneNumberWithOTP = async (phone: string, token: string) => {
    return await supabaseBrowser.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {(isRequesting || isLoading) && <div className={styles.loadingOverlay} aria-hidden="true" />}

      <Header title={t('otp_text')} theme={theme} onBack={() => nav.pop()} />

      <div className={styles.innerBody}>
        <div className={styles.otpSection}>
          {isLoading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
            </div>
          ) : (
            <PinInput
              value={otpValue}
              onChange={setOtpValue}
              disabled={isLoading}
              error={!!error}
              classNames={{
                container: styles.otpContainer,
                containerError: styles.otpError,
                input: styles.otpInput,
              }}
            />
          )}

          <p className={styles.instructions}>
            {t('six_digit_sent_to')} <strong>{value}</strong>
          </p>
        </div>

        <div className={styles.errorSection}>
          <p className={`${styles.errorText} ${error ? '' : styles.hideError}`}>
            {error}
          </p>
        </div>

        <div className={styles.keypadSection}>
          <Keypad
            value={otpValue}
            onChange={setOtpValue}
            disabled={isLoading}
            error={!!error}
            classNames={{
              keypad: styles.keypad,
              grid: styles.keypadGrid,
              button: styles.keypadButton,
              backspace: styles.backspaceButton,
            }}
          />
        </div>

        <div className={styles.timerSection}>
          {remainingSeconds > 0 ? (
            <p className={styles.timer}>
              {formatTime(remainingSeconds)} {t('remaining')}
            </p>
          ) : (
            <button
              onClick={requestOTP}
              disabled={disableOperation}
              className={styles.resendButton}
            >
              { isRequesting ? <span className={styles.resendSpinner}></span> : t('resend')}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}