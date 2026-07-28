'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './login.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { TextInput } from '@academix-admin/forms';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLogin } from '@/lib/stacks/login-stack';
import { useUserData } from '@/lib/stacks/user-stack';
import { StateStack } from '@academix-admin/state-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { UserData } from '@/models/user-data';
import { LoginModel } from '@/models/user-data';
import { UserLoginAccount } from '@/models/user-data';
import { fetchUserDetails, fetchUserData } from '@/utils/checkers';
import { signInGateStatus } from '@/utils/gate';
import { useErrorDialog } from '@/hooks/useErrorDialog';
import { useOtp } from '@/lib/stacks/otp-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { Header } from '@academix-admin/header';


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
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const { login, login$, __meta } = useLogin();
  const { userData, userData$ } = useUserData();
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

  const [error, setError] = useState('');
  const { showError, close: closeError, errorDialogNode } = useErrorDialog();

  // Mirror the error state into the shared dialog (replaces the old inline error block).
  useEffect(() => { if (error) showError(error); else closeError(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);


  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  // Returning from an OAuth (Google) attempt: if it was rejected by the sign-in gate, no session
  // comes back. Resolve the real reason with a server gate_check (cf-ipcountry) and show a clear
  // message — GoTrue/supabase-js flattens the raw reason to a generic error.
  useEffect(() => {
    let flagged = false;
    try { flagged = sessionStorage.getItem('ax_auth_check') === '1'; if (flagged) sessionStorage.removeItem('ax_auth_check'); } catch { /* ignore */ }
    if (!flagged) return;
    (async () => {
      const gs = await signInGateStatus(lang);
      if (gs) setError(t('region_blocked'));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsFormValid(loginState !== 'error' && loginState !== 'initial' && !!login.password && passwordChecks.valid);
  }, [login.login, login.password, loginState, passwordChecks.valid]);


  useEffect(() => {
    if (login?.password) {
      const result = validatePassword(login.password);
      setPasswordChecks(result);
      setPasswordInputValue(login.password);
    } else {
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
      } else {
        setLoginState('initial');
      }
      setLoginInputValue(normalizedValue);
    } else {
      setLoginState('initial');
    }
  }, [login.login]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!isFormValid || !login?.login) {
      return;
    }

    setLoginLoading(true);
    setError('');

    try {
      const userLoginAccount: UserLoginAccount | null = await fetchUserDetails(login.login);
      if (!userLoginAccount) {
        setError(t('invalid_login_credentials'));
        setLoginLoading(false);
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
      } else {
        setLoginLoading(false);
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
      // Client sign-in feature/region pre-check removed: it was bypassable and caused false
      // failures (checkLocation null / feature lookup). NOTE: sign-in runs through Supabase Auth,
      // not our gated RPCs, so Features.sign_in is NOT enforced server-side yet — deferred until a
      // Supabase Auth Hook (e.g. custom-access-token / password-verification) is added.
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user != null) {
        const userData: UserData | null = await fetchUserData(data.user.id, lang);
        return userData;
      }

      return null;
    } catch (error: any) {
      console.error('Signin error:', error);

      // The auth.sessions sign-in gate raises, but GoTrue/supabase-js flattens it to a generic 500
      // ("Database error granting user" / unexpected_failure) — the raw reason is lost. Resolve it
      // server-side with a gate_check (accurate cf-ipcountry) and show a clear message.
      if (error?.status === 500 || String(error?.code) === 'unexpected_failure') {
        const gs = await signInGateStatus(lang);
        if (gs) { setError(t('region_blocked')); return null; }
      }

      if (error.code === 'email_not_confirmed') {
        await resendTokenForEmail(email);
        otpTimer$.start(300);
        await StateStack.core.clearScope('login_flow');
        setLoginInputValue('');
        setPasswordInputValue('');
        setError('');
        nav.pushAndPopUntil('otp', (entry: any) => entry.key === 'login', {
          verificationType: 'UserLoginType.email',
          verificationValue: email, verificationRequest: 'SignUp'
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
      // Client sign-in feature/region pre-check removed (bypassable + caused false failures).
      // Sign-in runs through Supabase Auth, not our gated RPCs — Features.sign_in is NOT enforced
      // server-side yet (deferred: needs a Supabase Auth Hook).
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        phone: phone,
        password: password,
      });

      if (error) throw error;

      if (data.user != null) {
        const userData: UserData | null = await fetchUserData(data.user.id, lang);
        return userData;
      }

      return null;
    } catch (error: any) {
      console.error('Signin error:', error);

      // The auth.sessions sign-in gate raises, but GoTrue/supabase-js flattens it to a generic 500
      // ("Database error granting user" / unexpected_failure) — the raw reason is lost. Resolve it
      // server-side with a gate_check (accurate cf-ipcountry) and show a clear message.
      if (error?.status === 500 || String(error?.code) === 'unexpected_failure') {
        const gs = await signInGateStatus(lang);
        if (gs) { setError(t('region_blocked')); return null; }
      }

      if (error.code === 'phone_not_confirmed') {
        await resendTokenForPhone(phone);
        otpTimer$.start(300);
        await StateStack.core.clearScope('login_flow');
        setLoginInputValue('');
        setPasswordInputValue('');
        setError('');
        nav.pushAndPopUntil('otp', (entry: any) => entry.key === 'login', {
          verificationType: 'UserLoginType.phone',
          verificationValue: phone, verificationRequest: 'SignUp'
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

    await StateStack.core.clearScope('secondary_flow');

    // Clear only the login flow & secondary_flow
    await StateStack.core.clearScope('login_flow');
    await userData$.set(userObj);

    __meta.clear();
    nav.dispose();
    setLoginInputValue('');
    setPasswordInputValue('');
    setError('');

    await replaceAndWait("/main");
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

    // Always store the actual password value, validation is checked separately
    login$.setField({ field: 'password', value: value });
  };

  const handleForgotPassword = async () => {
    await StateStack.core.clearScope('login_flow');
    setError('');
    setLoginInputValue('');
    setPasswordInputValue('');
    nav.push('forgot_password');
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {loginLoading && <div className={styles.loginLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('login')}
        theme={theme}
        showBack={canGoBack}
        onBack={cancelLogin}
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
          id="login"
          src="/assets/lottie/login_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <p className={styles.titleSmall}>{t('greetings')}</p>
        <h2 className={styles.titleBig}>{t('great_seeing_again')}</h2>
        <form className={styles.form} onSubmit={handleSubmit}>

          <TextInput
            id="login"
            name="login"
            label={t('login_label')}
            hint={t('login_placeholder')}
            value={loginInputValue}
            onChange={(_, e) => handleLoginChange(e)}
            required
            autoComplete="username"
            autoCapitalize="none"
            status={loginState === 'error' ? 'error' : loginState === 'username' || loginState === 'phone' || loginState === 'email' ? 'valid' : 'default'}
            helperText={
              loginState === 'error' ? t('login_error')
                : loginState === 'username' ? t('login_username')
                  : loginState === 'phone' ? t('login_phone')
                    : loginState === 'email' ? t('login_email')
                      : undefined
            }
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              input: styles.input,
              helper: loginState === 'error' ? styles.errorText : styles.validText,
            }}
          />

          {/* Password */}
          <TextInput
            id="password"
            name="password"
            label={t('password_label')}
            hint={t('password_placeholder')}
            value={passwordInputValue}
            onChange={(_, e) => handlePasswordChange(e)}
            secureToggle
            disabled={loginLoading}
            autoComplete="new-password"
            required
            inputProps={{ 'aria-invalid': !passwordChecks.valid }}
            classNames={{
              root: styles.formGroup,
              label: styles.label,
              field: styles.inputWrapper,
              input: styles.input,
              toggle: styles.eyeButton,
            }}
          />
          <button
            type="button"
            className={styles.forgotPasswordLink}
            onClick={handleForgotPassword}
          >
            {t('forgot_password')}
          </button>

          {errorDialogNode}

          <button
            type="submit"
            className={styles.loginButton}
            disabled={!isFormValid || loginLoading}
          >
            {loginLoading ? <span className={styles.spinner}></span> : t('login')}
          </button>

          <div className={styles.socialDivider}><span>{t('or_text')}</span></div>
          <SocialAuthButtons providers={['google']} theme={theme} disabled={loginLoading} onError={setError} />
        </form>
      </div>
    </main>
  );
}