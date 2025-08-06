'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStack, signupConfig } from '@/lib/stacks/signup-stack';
import { useDemandState } from '@/lib/state-stack';
import { useNavStack } from "@/lib/NavigationStack";

type Country = { country_id: string; country_identity: string };
type Language = { language_id: string; language_identity: string };

export default function SignUpStep2() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { signup, signup$ } = useStack('signup', signupConfig, 'signup_flow');
  const nav = useNavStack('signup');

  const [countries, demandCountries, setCountries] = useDemandState<Country[]>([], {
    key: 'countries',
    scope: 'signup_flow',
    persist: true,
    ttl: 3600,
    deps: [lang],
  });

  const [languages, demandLanguages, setLanguages] = useDemandState<Language[]>([], {
    key: 'languages',
    scope: 'signup_flow',
    persist: true,
    ttl: 3600,
    deps: [lang],
  });

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [countryLoading, setCountryLoading] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    if (countries.length > 0 && !signup.country) {
        signup$.setField({ field: 'country' as keyof typeof signup, value: countries[0].country_identity });
    }
    if (languages.length > 0 && !signup.language) {
       signup$.setField({ field: 'language' as keyof typeof signup, value: languages[0].language_identity });
    }
  }, [countries, languages, signup.country, signup.language, signup$]);

  const loadCountries = useCallback(() => {
    demandCountries(async ({ set }) => {
      setCountryLoading(true);
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_country', { p_locale: lang });
        if (error) throw error;
        set(data || []);
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      } finally {
        setCountryLoading(false);
      }
    });
  }, [lang]);

  const loadLanguages = useCallback(() => {
    demandLanguages(async ({ set }) => {
      setLanguageLoading(true);
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_languages', { p_locale: lang });
        if (error) throw error;
        set(data || []);
      } catch (err) {
        console.error('Failed to fetch languages:', err);
      } finally {
        setLanguageLoading(false);
      }
    });
  }, [lang]);

  useEffect(() => {
    setIsFormValid(!!signup.country && !!signup.language);
  }, [signup.country, signup.language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    signup$.setField({ field: name as keyof typeof signup, value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    router.push('/signup/step3');
    setContinueLoading(false);
  };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => /* router.back() */     nav.pop()}
              aria-label="Go back"
              disabled={continueLoading}
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
          id="signup-step2"
          src="/assets/lottie/sign_up_step_2_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 2, total: signupConfig.totalSteps })}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="language" className={styles.label}>
              {t('language')}
            </label>
            <select
              id="language"
              name="language"
              value={signup.language}
              onChange={handleChange}
              onFocus={loadLanguages}
              onClick={loadLanguages}
              className={styles.select}
              disabled={languageLoading}
              required
            >
              {languages.length === 0 && (
                <option value="">{languageLoading ? t('loading') : t('no_languages_available')}</option>
              )}
              {languages.map((lang) => (
                <option key={lang.language_id} value={lang.language_identity}>
                  {lang.language_identity}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="country" className={styles.label}>
              {t('country')}
            </label>
            <select
              id="country"
              name="country"
              value={signup.country}
              onChange={handleChange}
              onFocus={loadCountries}
              onClick={loadCountries}
              className={styles.select}
              disabled={countryLoading}
              required
            >
              {countries.length === 0 && (
                <option value="">{countryLoading ? t('loading') : t('no_countries_available')}</option>
              )}
              {countries.map((country) => (
                <option key={country.country_id} value={country.country_identity}>
                  {country.country_identity}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className={styles.continueButton}
            disabled={!isFormValid || continueLoading}
            aria-disabled={!isFormValid || continueLoading}
          >
                {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </form>
      </div>
    </main>
  );
}