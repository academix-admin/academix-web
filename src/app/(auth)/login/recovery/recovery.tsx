'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './recovery.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAccountDetails, VerificationMethodModel } from '@/lib/stacks/login-stack';
import { StateStack } from '@academix-admin/state-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { useOtp } from '@/lib/stacks/otp-stack';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import { Header } from '@academix-admin/header';

interface RecoveryProps {
  names: string;
}
export default function Recovery(props: RecoveryProps) {
  const { theme, applyTheme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { accountDetails, accountDetails$, __meta } = useAccountDetails();
  const { otpTimer, otpTimer$ } = useOtp();
  const nav = useNav();
  const isTop = nav.isTop();

  const { names } = props;

  const [canGoBack, setCanGoBack] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [verificationSelected, setVerificationSelected] = useState<VerificationMethodModel>();

  const [error, setError] = useState('');


  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    if(accountDetails?.methods.length === 0 && __meta.isHydrated && isTop)nav.popToRoot();
  }, [accountDetails.methods, __meta.isHydrated, isTop]);

  useEffect(() => {
    setIsFormValid(!!verificationSelected);
  }, [verificationSelected]);

  const handleChange = (verificationMethodModel: VerificationMethodModel) => {
    setVerificationSelected(verificationMethodModel);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSendLoading(true);
    setError('');

    try {

      if (verificationSelected?.type === 'UserLoginType.email') {
        await resetPasswordForEmail(verificationSelected.value);
        handleRecovery(verificationSelected.type, verificationSelected.value)
      } else if (verificationSelected?.type === 'UserLoginType.phone') {
        await resetPasswordForPhone(verificationSelected.value)
        handleRecovery(verificationSelected.type, verificationSelected.value)
      } else {
        console.error('Unknown verification type');
        setError(t('error_occurred'));

      }
    } catch (error) {
      console.error('Error during password reset:', error);
      setError(t('error_occurred'));

    } finally {
      setSendLoading(false);
    }
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

  const handleRecovery = async (type: string, value: string) => {
    // Navigate to otp screen
    otpTimer$.start(300);
    await nav.pushAndPopUntil('otp', (entry) => entry.key === 'login', { verificationType: type, verificationValue: value, verificationRequest: 'Recovery', names });
    __meta.clear();
  };


  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {sendLoading && <div className={styles.sendLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('recovery_text')}
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
        <CachedLottie
          id="recovery"
          src="/assets/lottie/recovery_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <p className={styles.titleSmall}>{t('ouch')}</p>
        <h2 className={styles.titleBig}>{t('get_back_to_academix')}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="verify_identity" className={styles.label}>{t('verify_identity_label')}</label>
            <div className={styles.emptyState}>
              {accountDetails?.methods.length === 0 && (<NoResultsView text="Nothing found." />)}

            </div>
            <div className={styles.radioGroup}>
              {accountDetails?.methods.map((method, index) => (
                <label key={index} className={`${styles.radioLabel} ${verificationSelected?.type === method.type ? styles.radioLabelSelected : ''}`}>
                  <input
                    type="radio"
                    name="recovery"
                    value={method.value}
                    checked={verificationSelected?.type === method.type}
                    onChange={() => handleChange(method)}
                    className={styles.radioInput}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioText}>
                      {method.type === 'UserLoginType.email' ? tNode('code_through_email', { email: <strong>{method.value}</strong> }) : tNode('code_through_phone', { phone: <strong>{method.value}</strong> })}
                    </span>
                  </div>
                </label>
              ))}
            </div>

          </div>


          {error && (<div className={styles.errorSection}>
            <p className={styles.errorText}>
              {error}
            </p>
          </div>)}


          {accountDetails?.methods.length > 0 && (<button
            type="submit"
            className={styles.sendButton}
            disabled={!isFormValid || sendLoading}
          >
            {sendLoading ? <span className={styles.spinner}></span> : t('send')}
          </button>)}
        </form>
      </div>
    </main>
  );
}