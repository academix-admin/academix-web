'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './login.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLogin } from '@/lib/stacks/login-stack';
import { StateStack } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import { UserData } from '@/models/user-data';
import { LoginModel } from '@/models/user-data';
import { UserLoginAccount } from '@/models/user-data';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { useOtp } from '@/lib/stacks/otp-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";


const validatePassword = (value: string) => {
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
  const hasMinLength = value.length >= 6;

  return {
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasMinLength,
    valid: hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasMinLength,
  };
};

const normalizeLoginInputValue = (loginModel: LoginModel | null): string => {
  if (!loginModel) return '';

  const { loginType, loginDetails } = loginModel;

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


export default function LoginUser() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { login, login$, __meta} = useLogin();
  const nav = useNav();
  const { otpTimer, otpTimer$ } = useOtp();
  const { replaceAndWait } = useAwaitableRouter();

  const [canGoBack, setCanGoBack] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [loginState, setLoginState] = useState('initial');
  const [loginInputValue, setLoginInputValue] = useState('');

  // Password states
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(validatePassword(''));
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');


  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    setIsFormValid(loginState !== 'error' && loginState !== 'initial' && !!login.password);
  }, [login.login, login.password, loginState]);


  useEffect(() => {
    if (login?.password) {
      const result = validatePassword(login.password);
      setPasswordChecks(result);
      setPasswordInputValue(login.password);
    }else{
      setPasswordInputValue('');
    }
  }, [login.password]);

  useEffect(() => {
    if (login?.login) {
       // Use the normalize function to display the clean value
       const normalizedValue = normalizeLoginInputValue(login.login);
       if (normalizedValue.includes("@") && isEmail(normalizedValue)) {
             setLoginState('email');
           } else if (!normalizedValue.includes("@") && allNumber(normalizedValue)) {
             setLoginState('phone');
           } else if (!isEmail(normalizedValue) &&
               !containsUpperCase(normalizedValue) &&
               getSpecialCharacters(normalizedValue).every((c) => c === '.' || c === '_') && normalizedValue.length > 0) {
             setLoginState('username');
           }else{
                            setLoginState('initial');
           }
       setLoginInputValue(normalizedValue);
    }else{
                                    setLoginState('initial');
    }
  }, [login.login]);

  const handleSubmit = async () => {
      if (!isFormValid || !login?.login) return;

      setLoginLoading(true);
                                          setError('');

      try {
        const userLoginAccount: UserLoginAccount | null = await fetchUserDetails(login.login);
        if (!userLoginAccount) {
          setError(t('user_not_found'));
          return;
        }

        let userObj: UserData | null = null;

        if (userLoginAccount.users_login_type === 'UserLoginType.email') {
          userObj = await signInWithEmail(
            userLoginAccount.users_email, login.password || '');
        } else if (userLoginAccount.users_login_type === 'UserLoginType.phone') {
          userObj = await signInWithPhone(
            userLoginAccount.users_phone, login.password || '');
        }

        if (userObj) {
          await handleCreatedUser(userLoginAccount.users_login_type,
            userLoginAccount.users_login_type === 'UserLoginType.email' ? userLoginAccount.users_email : userLoginAccount.users_phone,
            userObj);
        }

      } catch (err) {
        console.error(err);
        setError(t('error_occurred'));
      } finally {
        setLoginLoading(false);
      }
    };



   const signInWithEmail = async (email: string, password: string): Promise<UserData | null> => {

       try {
         const location = await checkLocation();
         if (!location) {
           console.log('location not determined');
           setError(t('error_occurred'));
           return null;
         }

         const partialData = await fetchUserPartialDetails(email);
         const feature = await checkFeatures(
           'Features.sign_in',
           lang,
           location.country_code,
           partialData?.users_sex,
           partialData?.users_dob
         );

         if (!feature) {
           console.log('feature not available');
           setError(t('feature_unavailable'));
           return null;
         }

         const { data, error } = await supabaseBrowser.auth.signInWithPassword({
           email: email,
           password: password,
         });

         if (error) throw error;

         if (data.user != null) {
           const { data: userData, error: userError } = await supabaseBrowser.rpc("get_user_record", {
             p_user_id: data.user.id
           });

           if (userError) throw userError;
           return userData;
         }

         return null;
       } catch (error: any) {
         console.error('Signin error:', error.code);

         if (error.code === 'email_not_confirmed') {
           await resendTokenForEmail(email);
           otpTimer$.start(300);
           await StateStack.core.clearScope('login_flow');
           setLoginInputValue('');
                 setPasswordInputValue('');
                 setError('');
           nav.pushAndPopUntil('otp', (entry: any) => entry.key === 'login', {
             verificationType: 'UserLoginType.email',
             verificationValue: email
           });
         } else if (error.code === 'invalid_credentials') {
           setError(t('invalid_login_credentials'));
           return null;
         }

         return null;
       }
     };

     const signInWithPhone = async (phone: string, password: string): Promise<UserData | null> => {
       try {
         const location = await checkLocation();
         if (!location) {
           console.log('location not determined');
           setError(t('error_occurred'));
           return null;
         }

         const partialData = await fetchUserPartialDetails(undefined, phone);
         const feature = await checkFeatures(
           'Features.sign_in',
           lang,
           location.country_code,
           partialData?.users_sex,
           partialData?.users_dob
         );

         if (!feature) {
           console.log('feature not available');
           setError(t('feature_unavailable'));
           return null;
         }

         const { data, error } = await supabaseBrowser.auth.signInWithPassword({
           phone: phone,
           password: password,
         });

         if (error) throw error;

         if (data.user != null) {
           const { data: userData, error: userError } = await supabaseBrowser.rpc("get_user_record", {
             p_user_id: data.user.id
           });

           if (userError) throw userError;
           return userData;
         }

         return null;
       } catch (error: any) {
         console.error('Signin error:', error);

         if (error.code === 'phone_not_confirmed') {
           await resendTokenForPhone(phone);
           otpTimer$.start(300);
           await StateStack.core.clearScope('login_flow');
           setLoginInputValue('');
                 setPasswordInputValue('');
                 setError('');
           nav.pushAndPopUntil('otp', (entry: any) => entry.key === 'login', {
             verificationType: 'UserLoginType.phone',
             verificationValue: phone
           });
         } else if (error.code === 'invalid_credentials') {
           setError(t('invalid_login_credentials'));
           return null;
         }

         return null;
       }
     };

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

  const handleCreatedUser = async (type: string, value: string, userObj: UserData) => {
      // Navigate to main screen
      await replaceAndWait("/main");
      await StateStack.core.clearScope('login_flow');
      __meta.clear();
      nav.dispose();
      setLoginInputValue('');
      setPasswordInputValue('');
      setError('');
    };

  const cancelLogin = async () => {
    await nav.pop();
    nav.dispose();
    await StateStack.core.clearScope('login_flow');
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
                                    setError('');

    if (cleanValue.length === 0) {
      setLoginState('initial');
      login$.setField({ field: 'login', value: null });
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
      login$.setField({ field: 'login', value: loginModel });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setPasswordInputValue(value);
                                    setError('');

    const result = validatePassword(value);
    setPasswordChecks(result);

    login$.setField({ field: 'password', value: result.valid ? value : '' });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword =  async () => {
      await StateStack.core.clearScope('login_flow');
      setError('');
      setLoginInputValue('');
      setPasswordInputValue('');
      nav.push('forgot_password');
  };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {loginLoading && <div className={styles.loginLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={cancelLogin}
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
          <h1 className={styles.title}>{t('login')}</h1>
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
          id="login"
          src="/assets/lottie/login_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <p className={styles.titleSmall}>{t('greetings')}</p>
        <h2 className={styles.titleBig}>{t('great_seeing_again')}</h2>
        <form className={styles.form}>

          <div className={styles.formGroup}>
            <label htmlFor="login" className={styles.label}>{t('login_label')}</label>
            <input
              type="text"
              id="login"
              name="login"
              value={loginInputValue}
              onChange={handleLoginChange}
              placeholder={t('login_placeholder')}
              className={styles.input}
              required
              autoComplete="username"
              autoCapitalize="none"
            />
            {loginState === 'error' && (
              <p className={styles.errorText}>{t('login_error')}</p>
            )}
            {loginState === 'username' && (
              <p className={styles.validText}>{t('login_username')}</p>
            )}
            {loginState === 'phone' && (
              <p className={styles.validText}>{t('login_phone')}</p>
            )}
            {loginState === 'email' && (
              <p className={styles.validText}>{t('login_email')}</p>
            )}
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>{t('password_label')}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={passwordInputValue}
                onChange={handlePasswordChange}
                placeholder={t('password_placeholder')}
                className={styles.input}
                disabled={loginLoading}
                autoComplete={'new-password'}
                aria-invalid={!passwordChecks.valid}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.6112 17.6112C16.0556 18.979 14.1364 19.7493 12.0001 19.7493C5.63647 19.7493 2.25011 12.3743 2.25011 12.3743C3.47011 10.1443 5.27761 8.35577 7.38911 7.13965" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.8892 6.00928C21.8292 6.78928 22.6732 7.70428 23.3892 8.72428C23.7502 9.23428 23.7502 9.91428 23.3892 10.4243C22.6732 11.4443 21.8292 12.3593 20.8892 13.1393" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.9318 6.00928C13.6618 5.38928 12.2818 5.02928 10.8188 5.00928C9.35585 4.98928 7.93185 5.30928 6.61185 5.88928" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
             type="button"
             className={styles.forgotPasswordLink}
             onClick={handleForgotPassword}
          >
             {t('forgot_password')}
          </button>

         {error && ( <div className={styles.errorSection}>
            <p className={styles.errorText}>
                      {error}
            </p>
          </div>)}

          <button
            type="submit"
            className={styles.loginButton}
            onClick={handleSubmit}
            disabled={!isFormValid || loginLoading}
          >
            {loginLoading ? <span className={styles.spinner}></span> : t('login')}
          </button>
        </form>
      </div>
    </main>
  );
}