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
import { StateStack } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { useOtp } from '@/lib/stacks/otp-stack';
import NoResultsView from '@/components/NoResultsView/NoResultsView';

interface RecoveryProps {
  names: string;
}
export default function Recovery(props: RecoveryProps) {
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { accountDetails, accountDetails$, __meta} = useAccountDetails();
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
  }, [accountDetails.methods,__meta.isHydrated, isTop]);

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

    if(verificationSelected?.type === 'UserLoginType.email'){
         await resetPasswordForEmail(verificationSelected.value);
         handleRecovery(verificationSelected.type,verificationSelected.value)
    }else if(verificationSelected?.type === 'UserLoginType.phone'){
         await resetPasswordForPhone(verificationSelected.value)
         handleRecovery(verificationSelected.type,verificationSelected.value)
    }else{
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
    const { data, error } = await supabaseBrowser.auth.signInWithOtp({phone, options: { shouldCreateUser: false }});
    if (error) {
      console.error('Error resetting password for phone:', error);
      throw error;
    }
    return data;
  }

  const handleRecovery = async (type: string, value: string) => {
    // Navigate to otp screen
    otpTimer$.start(300);
    __meta.clear();
    await nav.pushAndPopUntil('otp',(entry) => entry.key === 'login',{ verificationType: type, verificationValue: value, verificationRequest: 'Recovery', names });
  };


  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {sendLoading && <div className={styles.sendLoadingOverlay} aria-hidden="true" />}

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
          <h1 className={styles.title}>{t('recovery_text')}</h1>
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
              { accountDetails?.methods.length === 0 && (<NoResultsView text="Nothing found."/>)}

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
                    { method.type === 'UserLoginType.email' ? tNode('code_through_email', { email: <strong>{method.value}</strong> }) : tNode('code_through_phone', { phone: <strong>{method.value}</strong> })}
                  </span>
                </div>
              </label>
               ))}
            </div>

          </div>


           {error && ( <div className={styles.errorSection}>
                      <p className={styles.errorText}>
                                {error}
                      </p>
                    </div>)}


          { accountDetails?.methods.length > 0 && (<button
            type="submit"
            className={styles.sendButton}
            disabled={!isFormValid || sendLoading}
          >
            {sendLoading ? <span className={styles.spinner}></span> : t('send')}
          </button>) }
        </form>
      </div>
    </main>
  );
}