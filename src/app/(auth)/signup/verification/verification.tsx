'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './verification.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup, UserRegistrationData } from '@/lib/stacks/signup-stack';
import { StateStack } from '@academix-admin/state-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { treatSpaces } from '@/utils/textUtils';
import { formatDateToDBString } from '@/utils/textUtils';
import { UserData, BackendUserData } from '@/models/user-data';
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { useOtp } from '@/lib/stacks/otp-stack';
import { Header } from '@academix-admin/header';

interface AccountCreationResponse {
  success: boolean;
  message: string;
  user: BackendUserData;
}

export default function Verification() {
  const { theme, applyTheme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { signup, signup$, __meta } = useSignup();
  const { otpTimer, otpTimer$ } = useOtp();
  const nav = useNav();
  const isTop = nav.isTop();

  const [canGoBack, setCanGoBack] = useState(false);
  const [sendLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [verificationSelected, setVerificationSelected] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (!signup.fullName && __meta.isHydrated && isTop) {
      nav.go('step1');
    }
  }, [signup.fullName, __meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    setIsFormValid(!!signup.verification);
    setVerificationSelected(signup.verification || '')
  }, [signup.verification]);

  const handleChange = (type: string) => {
    setError('');
    signup$.setField({ field: 'verification', value: type });
  };

  const getSignupData = (): UserRegistrationData | null => {
    if (!signup.email ||
      !signup.phoneNumber ||
      !signup.birthday ||
      !signup.gender ||
      !signup.username ||
      !signup.fullName ||
      !signup.country ||
      !signup.language ||
      !signup.role ||
      !signup.sixDigitPin ||
      !signup.verification ||
      !signup.password
    ) return null;

    return {
      users_email: signup.email,
      users_phone: signup.phoneNumber,
      users_dob: formatDateToDBString(signup.birthday),
      users_sex: signup.gender === 'Male' ? 'Gender.male' : 'Gender.female',
      users_username: signup.username,
      users_names: treatSpaces(signup.fullName),
      country_id: signup.country.country_id,
      language_id: signup.language.language_id,
      users_referred_id: signup.referral?.users_id || null,
      roles_id: signup.role.roles_id,
      users_pin: signup.sixDigitPin,
      users_login_type: signup.verification === 'email' ? 'UserLoginType.email' : 'UserLoginType.phone',
      users_password: signup.password
    };
  };

  const createAccount = async (data: any): Promise<AccountCreationResponse> => {
    const proxyUrl = '/api/create-user';

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("Create User API error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const signUpData = getSignupData();
    if (!signUpData) {
      console.error('Something is wrong');
      setError(t('error_occurred'));
      return;
    }

    setContinueLoading(true);
    setError('');

    try {
      const location = await checkLocation();
      if (!location) {
        console.log('location not determined');
        setError(t('error_occurred'));
        setContinueLoading(false);
        return;
      }

      const feature = await checkFeatures(
        signUpData.users_login_type === 'UserLoginType.email' ? 'Features.sign_up_email' : 'Features.sign_up_phone',
        lang,
        location.country_code,
        signUpData.users_sex,
        signUpData.users_dob
      );

      if (!feature) {
        console.log('feature not available');
        setError(t('feature_unavailable'));
        setContinueLoading(false);
        return null;
      }

      const result = await createAccount(signUpData);

      if (!result.user) {
        setError(t('unable_to_create_account'));
        setContinueLoading(false);
        return null;
      }

      handleCreatedUser(signUpData.users_login_type, signUpData.users_login_type === 'UserLoginType.email' ? signUpData.users_email : signUpData.users_phone, new UserData(result.user));
      setContinueLoading(false);
    } catch (err) {
      console.error('Signup error:', err);
      setError(t('error_occurred'));
      setContinueLoading(false);
      return null;
    }
  };


  const handleCreatedUser = async (type: string, value: string, userObj: UserData) => {
    // Start timer - the fixed state-stack now writes to both IndexedDB and localStorage
    otpTimer$.start(300);
    await StateStack.core.clearScope('signup_flow');
    nav.pushAndPopUntil('otp', (entry) => entry.key === 'step1', { verificationType: type, verificationValue: value, verificationRequest: 'SignUp' });
  };


  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {sendLoading && <div className={styles.sendLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('verification_text')}
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
          id="verification"
          src="/assets/lottie/verification_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <p className={styles.titleSmall}>{t('hurray')}</p>
        <h2 className={styles.titleBig}>{t('setting_up_academix')}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="validate_acct" className={styles.label}>{t('validate_acct_label')}</label>

            <div className={styles.radioGroup}>
              <label className={`${styles.radioLabel} ${verificationSelected === 'email' ? styles.radioLabelSelected : ''}`}>
                <input
                  type="radio"
                  name="verification"
                  value="email"
                  checked={verificationSelected === 'email'}
                  onChange={() => handleChange('email')}
                  className={styles.radioInput}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioText}>
                    {tNode('code_through_email', { email: <strong>{signup.email}</strong> })}
                  </span>
                </div>
              </label>

              <label className={`${styles.radioLabel} ${verificationSelected === 'phone' ? styles.radioLabelSelected : ''}`}>
                <input
                  type="radio"
                  name="verification"
                  value="phone"
                  checked={verificationSelected === 'phone'}
                  onChange={() => handleChange('phone')}
                  className={styles.radioInput}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioText}>
                    {tNode('code_through_phone', { phone: <strong>{signup.phoneNumber}</strong> })}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {error && (<div className={styles.errorSection}>
            <p className={styles.errorText}>
              {error}
            </p>
          </div>)}

          <button
            type="submit"
            className={styles.sendButton}
            disabled={!isFormValid || sendLoading}
          >
            {sendLoading ? <span className={styles.spinner}></span> : t('send')}
          </button>
        </form>
      </div>
    </main>
  );
}