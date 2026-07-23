'use client';

import { useEffect, useState, useCallback, useMemo, } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step2.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup, Country, Language } from '@/lib/stacks/signup-stack';
import { useDemandState } from '@academix-admin/state-stack';
import { useNav } from "@academix-admin/navigation-stack";
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { Header } from '@academix-admin/header';

interface LanguageItemProps {
  onClick: () => void;
  text: string;
  code: string;
}

const LanguageItem = ({ onClick, text, code }: LanguageItemProps) => {
  const { theme, applyTheme } = useTheme();
  return (
    <div
      className={`${applyTheme(styles, 'item')}`}
      onClick={onClick}
      aria-label={`Option ${text}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.itemContent}>
        <span className={styles.itemText}>{text}</span>
        <span className={`${applyTheme(styles, 'itemCode')}`}>{code}</span>
      </div>
    </div>
  );
};

interface CountryItemProps {
  onClick: () => void;
  text: string;
  image: string | null;
  isoCode: string;
  phoneCode: string;
}

const CountryItem = ({ onClick, text, image, isoCode, phoneCode }: CountryItemProps) => {
  const { theme, applyTheme } = useTheme();
  return (
    <div
      className={`${applyTheme(styles, 'item')}`}
      onClick={onClick}
      aria-label={`Option ${text}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.itemContent}>
        {image && (
          <Image
            src={image}
            alt={text}
            width={24}
            height={24}
            className={styles.countryImage}
          />
        )}
        <div className={styles.countryInfo}>
          <span className={styles.itemText}>{text}</span>
          <span className={`${applyTheme(styles, 'itemCode')}`}>{isoCode} • {phoneCode}</span>
        </div>
      </div>
    </div>
  );
};

export default function SignUpStep2() {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const { signup, signup$, __meta } = useSignup();
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
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [languageSelectId, languageSelectController, languageSelectIsOpen, languageSelectionState] = useSelectionController();
  const [searchLanguageQuery, setLanguageQuery] = useState('');

  const [countrySelectId, countrySelectController, countrySelectIsOpen, countrySelectionState] = useSelectionController();
  const [searchCountryQuery, setCountryQuery] = useState('');

  useEffect(() => {
    if (!signup.fullName && __meta.isHydrated && isTop) { nav.go('step1'); }
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName, __meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);


  const loadCountries = useCallback(() => {
    demandCountries(async ({ set, get }) => {
      const check = get().length;
      if (!check || check === 0) countrySelectController.setSelectionState("loading");
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_country', { p_locale: lang });
        if (error) throw error;
        if (data.length > 0) {
          set(data || []);
          countrySelectController.setSelectionState("data");
        } else {
          countrySelectController.setSelectionState("empty");
        }
      } catch (err) {
        countrySelectController.setSelectionState("error");

        console.error('Failed to fetch countries:', err);
      }
    });
  }, [lang]);

  const loadLanguages = useCallback(() => {
    demandLanguages(async ({ set, get }) => {
      const check = get().length;
      if (!check || check === 0) languageSelectController.setSelectionState("loading");
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_languages', { p_locale: lang });
        if (error) throw error;
        if (data.length > 0) {
          set(data || []);
          languageSelectController.setSelectionState("data");
        } else {
          languageSelectController.setSelectionState("empty");
        }
      } catch (err) {
        languageSelectController.setSelectionState("error");
        console.error('Failed to fetch languages:', err);
      }
    });
  }, [lang]);

  useEffect(() => {
    setIsFormValid(!!signup.country && !!signup.language);
  }, [signup.country, signup.language]);


  const handleLanguage = (language: Language) => {
    signup$.setField({ field: 'language', value: language });
    languageSelectController.close();
  };

  const handleCountry = (country: Country) => {
    signup$.setField({ field: 'country', value: country }, { field: 'phoneNumber', value: '' });
    countrySelectController.close();
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    signup$.setStep(3);
    nav.push('step3');
    setContinueLoading(false);
  };


  const openLanguage = () => {
    loadLanguages();
    languageSelectController.toggle();
  };

  const openCountry = () => {
    loadCountries();
    countrySelectController.toggle();
  };

  const handleLanguageSearch = useCallback((query: string) => {
    setLanguageQuery(query);
  }, []);

  const handleCountrySearch = useCallback((query: string) => {
    setCountryQuery(query);
  }, []);

  // 🔹 Memoize filtered languages
  const filteredLanguages = useMemo(() => {
    if (!searchLanguageQuery) return languages;
    const filters = languages.filter(item =>
      item.language_identity.toLowerCase().includes(searchLanguageQuery.toLowerCase())
    );
    if (filters.length <= 0 && languages.length > 0) { languageSelectController.setSelectionState("empty"); }
    return filters;
  }, [languages, searchLanguageQuery]);

  // 🔹 Memoize filtered countries
  const filteredCountries = useMemo(() => {
    if (!searchCountryQuery) return countries;
    const filters = countries.filter(item =>
      item.country_identity.toLowerCase().includes(searchCountryQuery.toLowerCase())
    );
    if (filters.length <= 0 && countries.length > 0) { countrySelectController.setSelectionState("empty"); }
    return filters;
  }, [countries, searchCountryQuery]);

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <Header
        title={t('sign_up')}
        theme={theme}
        showBack={canGoBack}
        onBack={() => nav.pop()}
        backDisabled={continueLoading}
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
          id="signup-step2"
          src="/assets/lottie/sign_up_step_2_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 2, total: 7 })}</p>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="language" className={styles.label}>
              {t('language')}
            </label>
            <p className={`${applyTheme(styles, 'fieldDescription')}`}>{t('language_description')}</p>
            <button onClick={openLanguage} className={styles.select}> {signup.language?.language_identity || 'Select'} </button>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="country" className={styles.label}>
              {t('country')}
            </label>
            <p className={`${applyTheme(styles, 'fieldDescription')}`}>{t('country_description')}</p>
            <button onClick={openCountry} className={styles.select}> {signup.country?.country_identity || 'Select'} </button>
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
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: languageSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: "Search languages...",
          onChange: handleLanguageSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
        }}
        noResultProp={{
          view: <NoResultsView text="No results found." buttonText="Try Again" onButtonClick={loadLanguages} />,
        }}
        errorProp={{
          view: <ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={loadLanguages} />,
        }}
        layoutProp={{
          gapBetweenHandleAndTitle: "16px",
          gapBetweenTitleAndSearch: "8px",
          gapBetweenSearchAndContent: "16px",
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        //                 onPaginate={loadMore}
        snapPoints={[0, 1]}
        initialSnap={1}
        minHeight="65dvh"
        maxHeight="90dvh"
        closeThreshold={0.2}
        selectionState={languageSelectionState}
        zIndex={1000}
      >
        {filteredLanguages.map((item, index) => (
          <LanguageItem
            key={index}
            onClick={() => handleLanguage(item)}
            text={item.language_identity}
            code={item.language_code}
          />
        ))}
      </SelectionViewer>

      <SelectionViewer
        id={countrySelectId}
        isOpen={countrySelectIsOpen}
        onClose={countrySelectController.close}
        titleProp={{
          text: t('country'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: countrySelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: "Search countries...",
          onChange: handleCountrySearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
        }}
        noResultProp={{
          view: <NoResultsView text="No results found." buttonText="Try Again" onButtonClick={loadCountries} />,
        }}
        errorProp={{
          view: <ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={loadCountries} />,
        }}
        layoutProp={{
          gapBetweenHandleAndTitle: "16px",
          gapBetweenTitleAndSearch: "8px",
          gapBetweenSearchAndContent: "16px",
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        snapPoints={[0, 1]}
        initialSnap={1}
        minHeight="65dvh"
        maxHeight="90dvh"
        closeThreshold={0.2}
        selectionState={countrySelectionState}
        zIndex={1000}
      >
        {filteredCountries.map((item, index) => (
          <CountryItem
            key={index}
            onClick={() => handleCountry(item)}
            text={item.country_identity}
            image={item.country_image}
            isoCode={item.country_two_iso_code}
            phoneCode={item.country_phone_code}
          />
        ))}
      </SelectionViewer>

    </main>
  );
}