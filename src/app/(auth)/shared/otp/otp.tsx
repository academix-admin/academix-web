'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './otp.module.css';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@academix-admin/navigation-stack";
import { useOtp } from '@/lib/stacks/otp-stack';
import { createStateStack, useDemandState, StateStack } from '@academix-admin/state-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import { fetchUserData } from '@/utils/checkers';
import { useRouter } from "next/navigation";
import { Header } from '@academix-admin/header';
import { PinInput, Keypad } from '@academix-admin/pin-input';

// Define props interface for the Otp component
interface OtpProps {
  verificationType: 'UserLoginType.email' | 'UserLoginType.phone';
  verificationValue: string;
  names: string;
  verificationRequest: 'SignUp' | 'Recovery';
}

export default function Otp(props: OtpProps) {
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

  const { verificationType, verificationValue, verificationRequest, names } = props;
  const disableOperation = isLoading || isRequesting || (otpTimer.isRunning && remainingSeconds > 0);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only check timer validity after hydration is complete
    if (__meta.isHydrated && isTop && !otpTimer.expiresAt) {
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
    if (isRequesting || !verificationType || !verificationValue) return;

    setIsRequesting(true);
    setError('');
    try {

      if (verificationRequest === 'SignUp') {
        if (verificationType === 'UserLoginType.email') {
          await resendTokenForEmail(verificationValue);
        } else if (verificationType === 'UserLoginType.phone') {
          await resendTokenForPhone(verificationValue);
        }
      } else {
        if (verificationType === 'UserLoginType.email') {
          await resetPasswordForEmail(verificationValue);
        } else if (verificationType === 'UserLoginType.phone') {
          await resetPasswordForPhone(verificationValue);
        }
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
      if (verificationRequest === 'SignUp') {

        if (verificationType === 'UserLoginType.email') {
          result = await verifyEmailAddressWithOTP(verificationValue, otpValue);
        } else if (verificationType === 'UserLoginType.phone') {
          result = await verifyPhoneNumberWithOTP(verificationValue, otpValue);
        }
      } else {
        if (verificationType === 'UserLoginType.email') {
          result = await verifyPasswordResetEmailOTP(verificationValue, otpValue);
        } else if (verificationType === 'UserLoginType.phone') {
          result = await verifyPhoneNumberWithOTP(verificationValue, otpValue);
        }
      }

      if (result?.error) {
        setError(t('incorrect_code'));
        // Vibrate on error
        if (navigator.vibrate) navigator.vibrate(200);
        setIsLoading(false);
      } else {
        // OTP verified successfully
        if (verificationRequest === 'SignUp') {

          if (result?.data.user != null) {
            const userObj: UserData | null = await fetchUserData(result?.data.user.id, lang);

            if (userObj) {
              await StateStack.core.clearScope('secondary_flow');
              await userData$.set(userObj);
              __meta.clear();
              nav.dispose();
              const navResult = await replaceAndWait("/main");

              if (!navResult.success) {
                router.replace("/main");
                setIsLoading(false);
              } else {

                setIsLoading(false);
              }
            } else {
              __meta.clear();
              await nav.popToRoot();
              setIsLoading(false);
            }
          } else {
            setError(t('error_occurred'));
            setIsLoading(false);
          }


        } else {
          __meta.clear();
          await nav.pushAndPopUntil('reset_password', (entry) => entry.key === 'login', { names });
          setIsLoading(false);
        }
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
    } if (!!error && otpValue.length <= 6) {
      setError('');
    }
  }, [otpValue]);

  // Supabase OTP functions
  const resendTokenForEmail = async (email: string) => {
    const { error } = await supabaseBrowser.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) throw error;
  };

  const resendTokenForPhone = async (phone: string) => {
    const { error } = await supabaseBrowser.auth.resend({
      type: 'sms',
      phone: phone,
    });
    if (error) throw error;
  };

  const resetPasswordForEmail = async (email: string) => {
    const { data, error } = await supabaseBrowser.auth.resetPasswordForEmail(email);
    if (error) {
      console.error('Error resetting password for email:', error);
      throw error;
    }
    return data;
  }
  const resetPasswordForPhone = async (phone: string) => {
    const { data, error } = await supabaseBrowser.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
    if (error) {
      console.error('Error resetting password for phone:', error);
      throw error;
    }
    return data;
  }

  const verifyEmailAddressWithOTP = async (email: string, token: string) => {
    return await supabaseBrowser.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
  };

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

      <Header
        title={t('otp_text')}
        theme={theme}
        showBack={canGoBack}
        onBack={() => nav.pop()}
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
            {t('six_digit_sent_to')} <strong>{verificationValue}</strong>
          </p>
        </div>

        <div className={styles.errorSection}>
          <p className={`${styles.errorText} ${error ? '' : styles.hideError}`}>
            {error || 'Placeholder'}
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
              {isRequesting ? <span className={styles.resendSpinner}></span> : t('resend')}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}