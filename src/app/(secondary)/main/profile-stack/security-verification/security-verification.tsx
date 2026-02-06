'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './security-verification.module.css';
import { useNav } from "@/lib/NavigationStack";
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useOtp } from '@/lib/stacks/otp-stack';

interface SecurityVerificationProps {
  request: 'Pin' | 'Password';
  isNew?: boolean;
}

interface VerificationSelection {
  type: 'Email' | 'Phone';
  value: string;
}

export default function SecurityVerification(props: SecurityVerificationProps) {
  const { theme } = useTheme();
  const { t, tNode } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();
  const { otpTimer, otpTimer$ } = useOtp();

  const { request, isNew } = props;

  const [verificationSelected, setVerificationSelected] = useState<VerificationSelection | null>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const goBack = () => nav.pop();

  useEffect(() => {
    setIsFormValid(!!verificationSelected);
  }, [verificationSelected]);

  const handleChange = (VerificationSelection: VerificationSelection) => {
    setError('');
    setLoading(false);
    setVerificationSelected(VerificationSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Handle verification logic here
    try {
      setLoading(true);
      console.log(`Verifying ${request} via ${verificationSelected}`);
      if (verificationSelected?.type === 'Email') {
        await resetPasswordForEmail(verificationSelected.value);
      } else if (verificationSelected?.type === 'Phone') {
        await resetPasswordForPhone(verificationSelected.value);
      }
      otpTimer$.start(300);
      nav.pushAndPopUntil('security_otp', (entry)=> entry.key === 'security_page', {request: request, verification: verificationSelected?.type, isNew: isNew ?? false, value: verificationSelected?.value });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Verification error:', err);
      setError(t('error_occurred'));
    }
  };

  const getVerificationLabel = () => {
    if (request === 'Pin') {
      if(isNew){
        return t('create_new_pin');
      }
      return t('change_pin');
    }
    return t('change_password');
  };

  const resetPasswordForEmail = async (email: string) => {
    const { data, error } = await supabaseBrowser.auth.resetPasswordForEmail(email);
    if (error) {
      throw error;
    }
    return data;
  }
  const resetPasswordForPhone = async (phone: string) => {
    const { data, error } = await supabaseBrowser.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
    if (error) {
      throw error;
    }
    return data;
  }

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('security_page_title')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.innerBody}>
          <CachedLottie
            id="security-verification"
            src="/assets/lottie/verification_lottie_1.json"
            className={styles.welcome_wrapper}
            restoreProgress
          />
        </div>
        <h2 className={styles.titleBig}>{getVerificationLabel()}</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="verify_method" className={styles.label}>
              {t('verify_identity_label')}
            </label>

            <div className={styles.radioGroup}>
              {userData?.usersEmail && (
                <label
                  className={`${styles.radioLabel} ${verificationSelected?.type === 'Email' ? styles.radioLabelSelected : ''
                    }`}
                >
                  <input
                    type="radio"
                    name="verification"
                    value="email"
                    checked={verificationSelected?.type === 'Email'}
                    onChange={() => handleChange({ type: 'Email', value: userData.usersEmail })}
                    className={styles.radioInput}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioText}>
                      {tNode('code_through_email', { email: <strong>{userData.usersEmail}</strong> })}
                    </span>
                  </div>
                </label>
              )}

              {userData?.usersPhone && (
                <label
                  className={`${styles.radioLabel} ${verificationSelected?.type === 'Phone' ? styles.radioLabelSelected : ''
                    }`}
                >
                  <input
                    type="radio"
                    name="verification"
                    value="phone"
                    checked={verificationSelected?.type === 'Phone'}
                    onChange={() => handleChange({ type: 'Phone', value: userData.usersPhone })}
                    className={styles.radioInput}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioText}>
                      {tNode('code_through_phone', { phone: <strong>{userData.usersPhone}</strong> })}
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.errorSection}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className={styles.sendButton}
            disabled={!isFormValid || loading}
          >
            {loading ? <span className={styles.spinner}></span> : t('send')}
          </button>
        </form>
      </div>

    </main>
  );
}