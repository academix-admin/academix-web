'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './otp.module.css';
import Link from 'next/link'
import CachedLottie from '@/components/CachedLottie';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup, UserRegistrationData } from '@/lib/stacks/signup-stack';
import { useNav } from "@/lib/NavigationStack";
import { treatSpaces } from '@/utils/textUtils';
import { UserData } from '@/models/user-data';
import { checkLocation, checkFeatures } from '@/utils/checkers';

export default function Otp(props: any) {
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { signup, signup$, __meta } = useSignup();
  const nav = useNav();
  const isTop = nav.isTop();

  const [canGoBack, setCanGoBack] = useState(false);
  const [sendLoading, setContinueLoading] = useState(false);



  useEffect(() => {
      console.log(props);
    setCanGoBack(window.history.length > 1);
  }, []);

// return _supabaseClient.auth
//         .verifyOTP(type: OtpType.signup, email: email, token: otp);

// return _supabaseClient.auth
//         .verifyOTP(type: OtpType.sms, phone: phone, token: otp);


//   Future<ResendResponse> resendTokenForEmail(OtpType otpType, String email) {
//     return _supabaseClient.auth.resend(type: otpType, email: email);
//   }
//
//   Future<ResendResponse> resendTokenForPhone(OtpType otpType, String phone) {
//     return _supabaseClient.auth.resend(type: otpType, phone: phone);
//   }

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
          <h1 className={styles.title}>{t('otp_text')}</h1>
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
        <div className={styles.form}>
          <div className={styles.formGroup}>


          </div>
        </div>
      </div>
    </main>
  );
}