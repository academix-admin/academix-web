'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './pin.module.css';
import Link from 'next/link';
import { useNav, useObject } from "@/lib/NavigationStack";
import { PinData } from '@/models/pin-data';

// Define types for PinInput props
interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  showPin?: boolean;  // ✅ New prop for visibility toggle
}

// Pin Input Component
const PinInput: React.FC<PinInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  showPin = false  // ✅ Defaults to hidden
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
          value={showPin ? (value[index] || "") : (value[index] ? '*' : "")}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={styles.otpInput}
          autoFocus={index === 0 && !error}
          onFocus={(e) => handleFocus(e, index)}
          autoComplete="off"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore
          data-bitwarden-ignore
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
  showPin?: boolean;  // ✅ New prop
  onShowPinToggle?: (show: boolean) => void;  // ✅ Callback for toggle
}

// Keypad Component
const Keypad: React.FC<KeypadProps> = ({ 
  value, 
  onChange, 
  disabled = false, 
  error,
  showPin = false,  // ✅ Defaults to hidden
  onShowPinToggle  // ✅ Handle toggle
}) => {
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
        <button
          onClick={() => onShowPinToggle?.(!showPin)}  // ✅ Toggle visibility
          disabled={disabled}
          className={`${styles.keypadButton} ${styles.eyeButton}`}
          title={showPin ? "Hide PIN" : "Show PIN"}
          aria-label={showPin ? "Hide PIN" : "Show PIN"}
        >
          {showPin ? (
            // Eye open icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          ) : (
            // Eye closed/hidden icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};


export default function Otp() {
  const { theme } = useTheme();
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
          
          <h1 className={styles.title}>{t('pin_text')}</h1>
        </div>
      </header>

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
              showPin={showPin}  // ✅ Pass visibility state
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
            showPin={showPin}  // ✅ Pass visibility state
            onShowPinToggle={setShowPin}  // ✅ Pass callback
          />
        </div>
      </div>
    </main>
  );
}