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
import { StateStack } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import { treatSpaces } from '@/utils/textUtils';
import { formatDateToDBString } from '@/utils/textUtils';
import { UserData } from '@/models/user-data';
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { useOtp } from '@/lib/stacks/otp-stack';

export default function Verification() {
  const { theme } = useTheme();
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
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    setIsFormValid(!!signup.verification);
    setVerificationSelected(signup.verification || '')
  }, [signup.verification]);

  const handleChange = (type: string) => {
    signup$.setField({ field: 'verification', value: type });
  };

  const getSignupData = () : UserRegistrationData | null => {
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
      role: signup.role,
      users_pin: signup.sixDigitPin,
      users_login_type: signup.verification === 'email' ? 'UserLoginType.email' : 'UserLoginType.phone',
      users_password: signup.password
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const signUpData = getSignupData();
    if(!signUpData){
       console.error('Something is wrong');
                  setError(t('error_occurred'));

       return;
    }

    setContinueLoading(true);
           setError('');

    if(signUpData.users_login_type === 'UserLoginType.email'){
      // Handle email
      const userObj = await signUpWithEmail(signUpData);
      if(userObj){
        handleCreatedUser(signUpData.users_login_type,signUpData.users_email,userObj);
        setContinueLoading(false);
      } else {
        console.error('Failed to create user');
        setContinueLoading(false);
      }
    } else if(signUpData.users_login_type === 'UserLoginType.phone'){
      // Handle phone
      const userObj = await signUpWithPhone(signUpData);
      if(userObj){
          handleCreatedUser(signUpData.users_login_type,signUpData.users_phone,userObj);
          setContinueLoading(false);
      } else {
          console.error('Failed to create user');
          setContinueLoading(false);
      }
    }
  };

  const signUpWithEmail = async (signUpData: UserRegistrationData): Promise<UserData | null> => {
    try {
      const location = await checkLocation();
      if(!location){
        console.log('location not determined');
                   setError(t('error_occurred'));

        return null;
      }

      const feature = await checkFeatures(
        'Features.sign_up_email',
        lang,
        location.country_code,
        signUpData.users_sex,
        signUpData.users_dob
      );

      if(!feature){
        console.log('feature not available');
                   setError(t('feature_unavailable'));

        return null;
      }

      const { data: result, error } = await supabaseBrowser.auth.signUp({
        email: signUpData.users_email,
        password: signUpData.users_password,
        options: {
          data: {
            users_email: signUpData.users_email,
            users_phone: signUpData.users_phone,
            users_dob: signUpData.users_dob,
            users_sex: signUpData.users_sex,
            users_username: signUpData.users_username,
            users_names: signUpData.users_names,
            country_id: signUpData.country_id,
            language_id: signUpData.language_id,
            users_referred_id: signUpData.users_referred_id,
            roles_id: signUpData.role.roles_id,
            users_pin: signUpData.users_pin,
            users_login_type: signUpData.users_login_type
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!result.user) {
                   setError(t('unable_to_create_account'));
                   return null;
      }

      return {
        usersId: result.user.id,
        usersUsername: signUpData.users_username,
        userNames: signUpData.users_names,
        usersEmail: result.user.email!,
        usersPhone: signUpData.users_phone,
        usersDob: signUpData.users_dob,
        usersSex: signUpData.users_sex,
        userImage: null,
        usersReferredId: signUpData.users_referred_id,
        userRole: {
          rolesId: signUpData.role.roles_id,
          rolesLevel: signUpData.role.roles_level,
          rolesType: signUpData.role.roles_type
        },
        usersVerified: false,
        countryId: signUpData.country_id,
        languageId: signUpData.language_id,
        usersCreatedAt: result.user.created_at
      };

    } catch (err) {
      console.error('Signup error:', err);
                         setError(t('error_occurred'));

      return null;
    }
  };


  const signUpWithPhone = async (signUpData: UserRegistrationData): Promise<UserData | null> => {
    try {
      const location = await checkLocation();
      if(!location){
        console.log('location not determined');
                   setError(t('error_occurred'));

        return null;
      }

      const feature = await checkFeatures(
        'Features.sign_up_phone',
        lang,
        location.country_code,
        signUpData.users_sex,
        signUpData.users_dob
      );

      if(!feature){
        console.log('feature not available');
                   setError(t('feature_unavailable'));

        return null;
      }

      const { data: result, error } = await supabaseBrowser.auth.signUp({
        phone: signUpData.users_phone,
        password: signUpData.users_password,
        options: {
          data: {
            users_email: signUpData.users_email,
            users_phone: signUpData.users_phone,
            users_dob: signUpData.users_dob,
            users_sex: signUpData.users_sex,
            users_username: signUpData.users_username,
            users_names: signUpData.users_names,
            country_id: signUpData.country_id,
            language_id: signUpData.language_id,
            users_referred_id: signUpData.users_referred_id,
            roles_id: signUpData.role.roles_id,
            users_pin: signUpData.users_pin,
            users_login_type: signUpData.users_login_type
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!result.user) {
                           setError(t('unable_to_create_account'));
                           return  null;
      }

      return {
        usersId: result.user.id,
        usersUsername: signUpData.users_username,
        userNames: signUpData.users_names,
        usersEmail: signUpData.users_email,
        usersPhone: result.user.email!,
        usersDob: signUpData.users_dob,
        usersSex: signUpData.users_sex,
        userImage: null,
        usersReferredId: signUpData.users_referred_id,
        userRole: {
          rolesId: signUpData.role.roles_id,
          rolesLevel: signUpData.role.roles_level,
          rolesType: signUpData.role.roles_type
        },
        usersVerified: false,
        countryId: signUpData.country_id,
        languageId: signUpData.language_id,
        usersCreatedAt: result.user.created_at
      };

    } catch (err) {
      console.error('Signup error:', err);
                         setError(t('error_occurred'));

      return null;
    }
  };

  const handleCreatedUser = async (type: string, value: string, userObj: UserData) => {
    // Navigate to otp screen
    otpTimer$.start(300);
    await StateStack.core.clearScope('signup_flow');
    nav.pushAndPopUntil('otp',(entry) => entry.key === 'step1', { verificationType: type, verificationValue: value, verificationRequest: 'SignUp' });
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
          <h1 className={styles.title}>{t('verification_text')}</h1>
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

          {error && ( <div className={styles.errorSection}>
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