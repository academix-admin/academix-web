'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './otp.module.css';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { useOtp } from '@/lib/stacks/otp-stack';
import { createStateStack, useDemandState, StateStack } from '@/lib/state-stack';
import { useRouter } from 'next/navigation';

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
    const digit = e.target.value.replace(/\D/g, "").slice(-1); // only 1 digit

    const otpArray = value.split("");
    otpArray[index] = digit || "";
    onChange(otpArray.join(""));

    if (digit && index < length - 1) {
      const next = e.target.nextElementSibling as HTMLInputElement;
      if (next) next.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!!error && value.length === length) {
        // Clear all if error
        onChange("");
        return;
      }
      const otpArray = value.split("");

     if (!otpArray[index] && index > 0) {
       const input = e.target as HTMLInputElement;
       const prev = input.previousElementSibling;
       if (prev instanceof HTMLInputElement) {
         prev.focus();
       }
     }


      otpArray[index] = "";
      onChange(otpArray.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted) {
      onChange(pasted.slice(0, length));
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
interface OtpProps {
  verificationType: 'UserLoginType.email' | 'UserLoginType.phone';
  verificationValue: string;
}

export default function Otp(props: OtpProps) {
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { otpTimer, otpTimer$, __meta } = useOtp();
  const nav = useNav();
  const router = useRouter();

  const [otpValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const { verificationType, verificationValue } = props;
  const disableOperation = isLoading || isRequesting || (otpTimer.isRunning && remainingSeconds > 0);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    router.prefetch('/main');
  }, [router]);

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
      if (verificationType === 'UserLoginType.email') {
        await resendTokenForEmail(verificationValue);
      } else if (verificationType === 'UserLoginType.phone') {
        await resendTokenForPhone(verificationValue);
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
      if (verificationType === 'UserLoginType.email') {
        result = await verifyEmailAddressWithOTP(verificationValue, otpValue);
      } else if (verificationType === 'UserLoginType.phone') {
        result = await verifyPhoneNumberWithOTP(verificationValue, otpValue);
      }
      if (result?.error) {
        setError(t('incorrect_code'));
        // Vibrate on error
        if (navigator.vibrate) navigator.vibrate(200);
      } else {
        // OTP verified successfully
        router.push('/main');
        __meta.clear();
//         nav.popToRoot();
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError(t('network_error'));
    } finally {
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

  const verifyEmailAddressWithOTP = async (email: string, token: string) => {
    return await supabaseBrowser.auth.verifyOtp({
      email,
      token,
      type: 'email'
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
          {canGoBack && (
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
          )}
          <h1 className={styles.title}>{t('otp_text')}</h1>
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