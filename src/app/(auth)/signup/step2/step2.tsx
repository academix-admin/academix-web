'use client';

import { useEffect, useState, useCallback, useMemo,} from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step2.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStack, signupConfig } from '@/lib/stacks/signup-stack';
import { useDemandState } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";

type Country = { country_id: string; country_identity: string };
type Language = { language_id: string; language_identity: string };

export default function SignUpStep2() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { signup, signup$, __meta  } = useStack('signup', signupConfig, 'signup_flow');
  const nav = useNav();
  const isTop = nav.isTop();

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
  const [countryLoading, setCountryLoading] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

 const [languageSelectId, languageSelectController, languageSelectIsOpen, languageSelectionState] = useSelectionController();
 const [searchLanguageQuery, setLanguageQuery] = useState('');

  useEffect(() => {
    if(!signup.fullName && __meta.isHydrated && isTop){nav.go('step1');}
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName,__meta.isHydrated, isTop]);

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
      languageSelectController.setSelectionState("loading");
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_languages', { p_locale: lang });
        if (error) throw error;
        set(data || []);
        languageSelectController.setSelectionState("data");
      } catch (err) {
        languageSelectController.setSelectionState("error");
        console.error('Failed to fetch languages:', err);
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
    nav.push('step3');
    setContinueLoading(false);
  };


  const openLanguage = () => {
    loadLanguages();
    languageSelectController.toggle();
  };

  const handleLanguageSearch = useCallback((query: string) => {
      setLanguageQuery(query);
    }, []);

    // 🔹 Memoize filtered languages
   const filteredLanguages = useMemo(() => {
       console.log(languages);
      if (!searchLanguageQuery) return languages;
      const filters = languages.filter(item =>
        item.language_identity.toLowerCase().includes(searchLanguageQuery.toLowerCase())
      );
      if(filters.length <= 0){languageSelectController.setSelectionState("empty");}
      return filters;
    }, [languages, searchLanguageQuery]);

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
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
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: signup.currentStep, total: signupConfig.totalSteps })}</p>

        <div  className={styles.form}>
          <div  className={styles.formGroup}>
           <label htmlFor="language" className={styles.label}>
                        {t('language')}
            </label>
            <button onClick={openLanguage} className={styles.select}> Select </button>
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
            onClick={handleSubmit}
          >
                {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </div>
      </div>



      <SelectionViewer
                      id={languageSelectId}
                      isOpen={languageSelectIsOpen}
                      onClose={languageSelectController.close}
                      titleProp={{
                        text: t('language'),
                      }}
                      cancelButton={{
                        position: "right",
                        onClick: languageSelectController.close,
                        view: <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width={16}
                                  height={16}
                                  viewBox="0 0 122.88 122.88"
                                >
                                  <circle cx="61.44" cy="61.44" r="61.44" fill="#333333" />
                                  <path
                                    fill="white"
                                    fillRule="evenodd"
                                    d="M35.38 49.72c-2.16-2.13-3.9-3.47-1.19-6.1l8.74-8.53c2.77-2.8 4.39-2.66 7 0L61.68 46.86l11.71-11.71c2.14-2.17 3.47-3.91 6.1-1.2l8.54 8.74c2.8 2.77 2.66 4.4 0 7L76.27 61.44 88 73.21c2.65 2.58 2.79 4.21 0 7l-8.54 8.74c-2.63 2.71-4 1-6.1-1.19L61.68 76 49.9 87.81c-2.58 2.64-4.2 2.78-7 0l-8.74-8.53c-2.71-2.63-1-4 1.19-6.1L47.1 61.44 35.38 49.72Z"
                                  />
                                </svg>
                        }}
                      searchProp={{
                        text: "Search languages...",
                        onChange: handleLanguageSearch,
                        background: "#f5f5f5",
                        padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
                        autoFocus: false,
                      }}
                      loadingProp={{
                        view: <div className="spin">Loading...</div>,
                        padding: { l: "16px", r: "16px", t: "24px", b: "24px" },
                      }}
                      noResultProp={{
                        text: "No matching languages found",
                        view: <div className="custom-empty-state">No results</div>,
                      }}
                      errorProp={{
                        text: "Error occurred",
                        view: <div className="custom-empty-state">Error occurred</div>,
                      }}
                      layoutProp={{
                        gapBetweenHandleAndTitle: "16px",
                        gapBetweenTitleAndSearch: "8px",
                        gapBetweenSearchAndContent: "16px",
                        backgroundColor:  theme === 'light' ?  "#fff" : "#121212",
                        handleColor: "#888",
                        handleWidth: "48px",
                      }}
                      childrenDirection="vertical"
      //                 onPaginate={loadMore}
                      snapPoints={[1]}
                      initialSnap={1}
                      minHeight="65vh"
                      maxHeight="90vh"
                      closeThreshold={0.2}
                      selectionState={languageSelectionState}
                      zIndex={1000}
                    >
                      {filteredLanguages.map((item, index) => (
                        <div key={index} className={styles.item} aria-label={`Option ${item}`}>
                          {item.language_identity}
                        </div>
                      ))}
                    </SelectionViewer>

    </main>
  );
}