'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './security-verification.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useOtp } from '@/lib/stacks/otp-stack';
import { Header } from '@academix-admin/header';

interface SecurityVerificationProps {
  request: 'Pin' | 'Password';
  isNew?: boolean;
  returnGroup?: string;
}

interface VerificationSelection {
  type: 'Email' | 'Phone';
  value: string;
}

export default function SecurityVerification(props: SecurityVerificationProps) {
  const { theme, applyTheme } = useTheme();
  const { t, tNode } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();
  const { otpTimer, otpTimer$ } = useOtp();

  const { request, isNew, returnGroup } = props;

  const [verificationSelected, setVerificationSelected] = useState<VerificationSelection | null>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const goBack = () => {
    if (returnGroup) {
      nav.goToGroupId(returnGroup);
    } else { nav.pop(); }
  }

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
      nav.pushAndPopUntil('security_otp', (entry) => entry.key === (isNew ? 'profile_page' : 'security_page'), { request: request, verification: verificationSelected?.type, isNew: isNew ?? false, value: verificationSelected?.value, returnGroup: returnGroup });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Verification error:', err);
      setError(t('error_occurred'));
    }
  };

  const getVerificationLabel = () => {
    if (request === 'Pin') {
      if (isNew) {
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
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('security_page_title')} theme={theme} onBack={goBack} />

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