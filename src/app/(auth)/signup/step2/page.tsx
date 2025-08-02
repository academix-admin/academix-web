'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import useSignupStore from '@/lib/stores/signupStore';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';

export default function SignUpStep2() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const { data, setData } = useSignupStore();

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    setFirstname(capitalize(getLastNameOrSingle(data.fullName)));
  }, [router]);


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      setData({ [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      router.push('/signup/step3');
    };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => router.back()}
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

          <h1 className={styles.title}>{t('sign_up')}</h1>

          <div className={styles.logoContainer}>
            <Image
              className={styles.logo}
              src="/assets/image/academix-logo.png"
              alt="Academix Logo"
              width={40}
              height={40}
              priority
            />
          </div>
        </div>
      </header>

      <div className={styles.innerBody}>

        <CachedLottie
                        id="signup-step2"
                        src="/assets/lottie/sign_up_step_2_lottie_1.json"
                        className={styles.welcome_wrapper}
                        restoreProgress
                      />

        <h2 className={styles.stepTitle}>Hi {firstname},</h2>
        <p className={styles.stepSubtitle}>Take Step 2 of 7</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="language" className={styles.label}>
              LANGUAGE
            </label>
            <select
              id="language"
              name="language"
              value={data.language}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="English">English</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
              <option value="Chinese">Chinese</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="country" className={styles.label}>
              COUNTRY
            </label>
            <select
              id="country"
              name="country"
              value={data.country}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="Nigeria">Nigeria</option>
              <option value="Ghana">Ghana</option>
              <option value="South Africa">South Africa</option>
              <option value="Kenya">Kenya</option>
              <option value="Egypt">Egypt</option>
            </select>
          </div>

          <button type="submit" className={styles.continueButton}>
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}