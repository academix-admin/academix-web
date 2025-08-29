'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './forgot-password.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAccountDetails, VerificationMethodModel } from '@/lib/stacks/login-stack';
import { StateStack } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { LoginModel } from '@/models/user-data';
import { UserLoginAccount } from '@/models/user-data';


const normalizeLoginInputValue = (accountDetailsModel: LoginModel | null): string => {
  if (!accountDetailsModel) return '';

  const { loginType, loginDetails } = accountDetailsModel;

  switch (loginType) {
    case 'UserLoginType.username':
      // Remove @ prefix for display
      return loginDetails.startsWith('@') ? loginDetails.substring(1) : loginDetails;
    case 'UserLoginType.phone':
      // Remove + prefix for display
      return loginDetails.startsWith('+') ? loginDetails.substring(1) : loginDetails;
    case 'UserLoginType.email':
      // Email doesn't need normalization for display
      return loginDetails;
    default:
      return loginDetails;
  }
};

export default function ForgotPassword() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { accountDetails, accountDetails$, __meta} = useAccountDetails();
  const nav = useNav();

  const [canGoBack, setCanGoBack] = useState(false);
  const [accountDetailsLoading, setLoginLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [accountDetailsState, setLoginState] = useState('initial');
  const [accountDetailsInputValue, setLoginInputValue] = useState('');

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    setIsFormValid(accountDetailsState !== 'error' && accountDetailsState !== 'initial');
  }, [ accountDetailsState]);


  useEffect(() => {
    if (accountDetails?.accountDetails) {
       // Use the normalize function to display the clean value
       const normalizedValue = normalizeLoginInputValue(accountDetails.accountDetails);
       if (normalizedValue.includes("@") && isEmail(normalizedValue)) {
             setLoginState('email');
           } else if (!normalizedValue.includes("@") && allNumber(normalizedValue)) {
             setLoginState('phone');
           } else if (!isEmail(normalizedValue) &&
               !containsUpperCase(normalizedValue) &&
               getSpecialCharacters(normalizedValue).every((c) => c === '.' || c === '_')) {
             setLoginState('username');
           }
       setLoginInputValue(normalizedValue);
    }
  }, [accountDetails.accountDetails]);

  const handleSubmit = async () => {
      if (!isFormValid || !accountDetails?.accountDetails) return;

      setLoginLoading(true);
      try {
          
          const userLoginAccount: UserLoginAccount | null = await fetchUserDetails(accountDetails.accountDetails);
                  if (!userLoginAccount) {
                    console.error('User not found');
                    return;
                  }

              const location = await checkLocation();
                       if (!location) {
                         console.log('location not determined');
                         return null;
                       }

                       const partialData =  userLoginAccount.users_login_type === 'UserLoginType.email' ? await fetchUserPartialDetails(userLoginAccount.users_email) : await fetchUserPartialDetails(userLoginAccount.users_phone);
                       const feature = await checkFeatures(
                         userLoginAccount.users_login_type === 'UserLoginType.email' ? 'Features.email_recovery' : 'Features.phone_recovery' ,
                         lang,
                         location.country_code,
                         partialData?.users_sex,
                         partialData?.users_dob
                       );

                       if (!feature) {
                         console.log('feature not available');
                         return null;
                       }

      const verificationMethods: VerificationMethodModel[] = [];

            if (userLoginAccount.users_login_type === 'UserLoginType.email') {
              verificationMethods.push({
                type: userLoginAccount.users_login_type,
                value: userLoginAccount.users_email,
              });
            } else if (userLoginAccount.users_login_type === 'UserLoginType.phone') {
              verificationMethods.push({
                type: userLoginAccount.users_login_type,
                value: userLoginAccount.users_phone,
              });
            } else {
              console.error('Invalid login type for recovery');
              return;
            }

            if (verificationMethods.length > 0) {
              accountDetails$.setField({ field: 'methods', value: verificationMethods });
              nav.push('recovery');
            } else {
              console.error('No verification methods available');
            }

      } catch (err) {
        console.error(err);
      } finally {
        setLoginLoading(false);
      }
    };

   
  const isEmail = (value: string): boolean => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;
    return emailRegex.test(value);
  };

  const containsUpperCase = (value: string): boolean => {
    return /[A-Z]/.test(value);
  };

  const getSpecialCharacters = (value: string): string[] => {
    const specialCharactersRegExp = /[^a-zA-Z0-9]/g;
    const matches = value.match(specialCharactersRegExp);
    return matches ? matches : [];
  };

  const allNumber = (value: string): boolean => {
    return /^\d+$/.test(value);
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleanValue = value.trim();

    setLoginInputValue(cleanValue);

    if (cleanValue.length === 0) {
      setLoginState('initial');
      accountDetails$.setField({ field: 'accountDetails', value: null });
      return;
    }

    let loginModel: LoginModel | null = null;

    if (cleanValue.includes("@") && isEmail(cleanValue)) {
      loginModel = {
        loginType: 'UserLoginType.email',
        loginDetails: cleanValue
      };
      setLoginState('email');
    } else if (!cleanValue.includes("@") && allNumber(cleanValue)) {
      loginModel = {
        loginType: 'UserLoginType.phone',
        loginDetails: `+${cleanValue}`
      };
      setLoginState('phone');
    } else if (!isEmail(cleanValue) &&
        !containsUpperCase(cleanValue) &&
        getSpecialCharacters(cleanValue).every((c) => c === '.' || c === '_')) {
      loginModel = {
        loginType: 'UserLoginType.username',
        loginDetails: `@${cleanValue}`
      };
      setLoginState('username');
    } else {
      setLoginState('error');
    }

    if (loginModel) {
      accountDetails$.setField({ field: 'accountDetails', value: loginModel });
    }
  };

  const cancelForgotPassword = () => {
      nav.pop();
      __meta.clear();
  }


  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {accountDetailsLoading && <div className={styles.accountDetailsLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={cancelForgotPassword}
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
          <h1 className={styles.title}>{t('forgot_password_text')}</h1>
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
          id="accountDetails"
          src="/assets/lottie/forgot_password_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <p className={styles.titleSmall}>{t('forgot_something')}</p>
        <h2 className={styles.titleBig}>{t('no_worries_in_academix')}</h2>
        <form className={styles.form}>

          <div className={styles.formGroup}>
            <div className={`${styles.instructionSection} ${styles[`instructionSection_${theme}`]}`}>
                <div className={`${styles.instructionInfo} ${styles[`instructionInfo_${theme}`]}`}>
                   {t('forgot_password_instruction')}
                </div>
            </div>
            <label htmlFor="account_details" className={styles.label}>{t('account_details_label')}</label>
            <input
              type="text"
              id="accountDetails"
              name="accountDetails"
              value={accountDetailsInputValue}
              onChange={handleLoginChange}
              placeholder={t('login_placeholder')}
              className={styles.input}
              required
              autoComplete="username"
              autoCapitalize="none"
            />
            {accountDetailsState === 'error' && (
              <p className={styles.errorText}>{t('login_error')}</p>
            )}
            {accountDetailsState === 'username' && (
              <p className={styles.validText}>{t('login_username')}</p>
            )}
            {accountDetailsState === 'phone' && (
              <p className={styles.validText}>{t('login_phone')}</p>
            )}
            {accountDetailsState === 'email' && (
              <p className={styles.validText}>{t('login_email')}</p>
            )}
          </div>


          <button
            type="submit"
            className={styles.continueButton}
            onClick={handleSubmit}
            disabled={!isFormValid || accountDetailsLoading}
          >
            {accountDetailsLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </form>
      </div>
    </main>
  );
}