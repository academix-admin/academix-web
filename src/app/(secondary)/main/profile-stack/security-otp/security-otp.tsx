'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './security-otp.module.css';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { useOtp } from '@/lib/stacks/otp-stack';
import { createStateStack, useDemandState, StateStack } from '@/lib/state-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import {  fetchUserData } from '@/utils/checkers';
import { useRouter } from "next/navigation";

// Define types for OTPInput props
interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

// OTP Input Component
const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false
}) => {
  const inputs = Array(length).fill(0);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
     const digit = e.target.value.replace(/\D/g, "").slice(-1);

     const otpArray = value.split("");
     otpArray[index] = digit || "";
     const nextValue = otpArray.join("");

     onChange(nextValue);

     // ---- FIX: compute allowed index from the new value ---- //
     const allowedIndex = getFirstInvalidIndex(nextValue);

     // Auto-advance only if digit is valid and index < allowed position
     if (digit && index < length - 1 && index < allowedIndex) {
       const next = e.target.nextElementSibling as HTMLInputElement | null;
       next?.focus();
     }
   };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Backspace") return;

    // Error mode: clear everything
    if (error && value.length === length) {
      onChange("");
      const inputs = e.currentTarget.parentElement!.querySelectorAll("input");
      (inputs[0] as HTMLInputElement).focus();
      return;
    }

    const inputs = e.currentTarget.parentElement!.querySelectorAll("input");

    // Build a snapshot of the current actual values from DOM, not from state.
    const domValues = Array.from(inputs).map(
      (input) => (input as HTMLInputElement).value
    );

    // If current field already empty → move back
    if (!domValues[index] && index > 0) {
      const prev = inputs[index - 1] as HTMLInputElement;
      prev.focus();
    }

    // Clear current char and update parent state
    const otpArray = value.split("");
    for (let i = index; i < otpArray.length; i++) {
      otpArray[i] = "";
    }
    onChange(otpArray.join(""));
  };


  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted) {
      onChange(pasted.slice(0, length));
    }
  };

  const getFirstInvalidIndex = (value: string) => {
    for (let i = 0; i < length; i++) {
      if (!value[i]) return i;
    }
    return length - 1; // all full → last field
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>, index: number) => {
    const inputs = e.currentTarget.parentElement!.querySelectorAll("input");

    // Determine focusable index based on ACTUAL input values
    let allowedIndex = 0;
    for (let i = 0; i < length; i++) {
      if ((inputs[i] as HTMLInputElement).value === "") {
        allowedIndex = i;
        break;
      }
      if (i === length - 1) allowedIndex = length - 1;
    }

    // Prevent skipping ahead
    if (index > allowedIndex) {
      (inputs[allowedIndex] as HTMLInputElement).focus();
    }
  };



  return (
    <div className={`${styles.otpContainer} ${error ? styles.otpError : ""}`}>
      {inputs.map((_, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={(value[index] || "")}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={styles.otpInput}
          autoFocus={index === 0 && !error}
          onFocus={(e) => handleFocus(e, index)}
        />
      ))}
    </div>
  );
};

// Define types for Keypad props
interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

// Keypad Component
const Keypad: React.FC<KeypadProps> = ({ value, onChange, disabled = false, error }) => {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  const handleDigitInput = (digit: number) => {
    if (value.length < 6) {
      onChange(value + digit);
    } else if(!!error && value.length === 6){
      onChange(`${digit}`);
    }
  };

  const handleBackspace = () => {
    if (value.length > 0 && !error) {
      onChange(value.slice(0, -1));
    } else if(!!error && value.length === 6){
      onChange('');
    }
  };

  return (
    <div className={styles.keypad}>
      <div className={styles.keypadGrid}>
        {digits.map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigitInput(digit)}
            disabled={disabled}
            className={styles.keypadButton}
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleBackspace}
          disabled={disabled}
          className={`${styles.keypadButton} ${styles.backspaceButton}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Define props interface for the Otp component
interface SecurityOtpProps {
  request: 'Pin' | 'Password';
  verification: 'Email' | 'Phone';
  value: string;
  isNew: boolean;
}

export default function SecurityOtp(props: SecurityOtpProps) {
  const { theme } = useTheme();
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

  const { verification, request, value, isNew } = props;
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
        nav.pushAndPopUntil('pin_mangement', (entry)=> entry.key === 'security_page',{ isNew: isNew ?? false });
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
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {(isRequesting || isLoading) && <div className={styles.loadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
              aria-label="Go back"
            >
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          
          <h1 className={styles.title}>{t('otp_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
        <div className={styles.otpSection}>
          {isLoading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
            </div>
          ) : (
            <OTPInput
              value={otpValue}
              onChange={setOtpValue}
              disabled={isLoading}
              error={!!error}
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