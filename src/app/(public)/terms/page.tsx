'use client';

import { use, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { Header } from '@academix-admin/header';

interface Config {
  showHeader: boolean;
  showTitle: boolean;
  showDescription: boolean;
  backgroundColor: Record<string, string> | null;
}

const iosConfig: Config = { showHeader: false, showTitle: false, showDescription: false, backgroundColor: { 'light': '#fff', 'dark': '#212121' } };
const androidConfig: Config = { showHeader: false, showTitle: false, showDescription: false, backgroundColor: { 'light': '#fff', 'dark': '#232323' } };
const profileConfig: Config = { showHeader: false, showTitle: false, showDescription: false, backgroundColor: null };
const landingConfig: Config = { showHeader: false, showTitle: true, showDescription: true, backgroundColor: null };
const defaultConfig: Config = { showHeader: true, showTitle: false, showDescription: false, backgroundColor: null };

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = { 'ios': iosConfig, 'android': androidConfig, 'profile': profileConfig, 'landing': landingConfig };
  return configMap[req || ''] || defaultConfig;
};

type StringOrNull = string | null;

interface Params {
  col: StringOrNull;
  lan: StringOrNull;
  req: StringOrNull;
  [key: string]: string | null;
}

const useAppParams = <T extends Record<string, StringOrNull> = Params>(
  fallbackParams?: Partial<T>
): T => {
  const searchParams = useSearchParams();
  const params: Record<string, StringOrNull> = {};

  if (fallbackParams) {
    for (const key in fallbackParams) {
      const value = fallbackParams[key];
      params[key] = value ?? null;
    }
  }

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (fallbackParams) {
    for (const key of Object.keys(fallbackParams)) {
      if (!(key in params)) params[key] = null;
    }
  }

  return params as T;
};

interface TermsPageProps {
  searchParams: Promise<Partial<Params>>;
}

export default function Terms({ searchParams }: TermsPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { initialized, hasValidSession } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor && config.backgroundColor[resolvedTheme]) {
      return {
        background: config.backgroundColor[resolvedTheme],
        color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
      } as React.CSSProperties;
    }
    return {};
  };

  const getContainerClass = () => {
    const baseClass = styles.container;
    if (config.backgroundColor) {
      return `${baseClass} ${styles[`container_${req}`]}`;
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]} ${styles[`container_${req}`]}`;
  };

  const goBack = () => {
    if (hasValidSession) { router.replace('/main'); return; }
    if (window.history.length <= 1) { router.replace('/main'); } else { router.back(); }
  };

  return (
    <main className={getContainerClass()} style={getBackgroundStyle()}>
      {config.showHeader && (
        <Header
        title={t('terms_of_service', resolvedLang)}
        theme={resolvedTheme as 'light' | 'dark'}
        showBack={(canGoBack || hasValidSession)}
        onBack={goBack}
        rightContent={(
          (!hasValidSession) && (
            <Link className={styles.logoContainer} href="/">
                <Image className={styles.logo} src="/assets/image/academix-logo.png" alt="Academix Logo" width={40} height={40} priority />
              </Link>
          )
        )}
      />
      )}

      <div className={`${styles.innerBody} ${req ? styles[`innerBody_${req}`] : ''}`}>
        {config.showTitle && (
          <h1 className={`${styles.bigTitle} ${styles[`bigTitle_${resolvedTheme}`]}`}>
            {t('terms_of_service', resolvedLang)}
          </h1>
        )}
        {config.showDescription && (
          <h4 className={`${styles.description} ${styles[`description_${resolvedTheme}`]}`}>
            {t('terms_description', resolvedLang)}
          </h4>
        )}
        
        <div className={styles.contentContainer}>
          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_acceptance_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_acceptance_text', resolvedLang)}</p>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_eligibility_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_eligibility_text', resolvedLang)}</p>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_account_title', resolvedLang)}</h2>
            <ul className={styles.list}>
              <li>{t('terms_account_accurate', resolvedLang)}</li>
              <li>{t('terms_account_secure', resolvedLang)}</li>
              <li>{t('terms_account_responsible', resolvedLang)}</li>
              <li>{t('terms_account_notify', resolvedLang)}</li>
            </ul>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_adc_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_adc_text', resolvedLang)}</p>
            <ul className={styles.list}>
              <li>{t('terms_adc_rate', resolvedLang)}</li>
              <li>{t('terms_adc_non_refundable', resolvedLang)}</li>
              <li>{t('terms_adc_withdrawal', resolvedLang)}</li>
            </ul>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_conduct_title', resolvedLang)}</h2>
            <ul className={styles.list}>
              <li>{t('terms_conduct_cheat', resolvedLang)}</li>
              <li>{t('terms_conduct_abuse', resolvedLang)}</li>
              <li>{t('terms_conduct_violate', resolvedLang)}</li>
              <li>{t('terms_conduct_impersonate', resolvedLang)}</li>
            </ul>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_ip_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_ip_text', resolvedLang)}</p>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_termination_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_termination_text', resolvedLang)}</p>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_liability_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_liability_text', resolvedLang)}</p>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_changes_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_changes_text', resolvedLang)}</p>
          </div>

          <div className={`${styles.section} ${styles[`section_${resolvedTheme}`]}`}>
            <h2 className={styles.sectionTitle}>{t('terms_contact_title', resolvedLang)}</h2>
            <p className={styles.sectionText}>{t('terms_contact_text', resolvedLang)}</p>
            <p className={styles.contactInfo}>support@academix.com</p>
          </div>

          <div className={`${styles.footer} ${styles[`footer_${resolvedTheme}`]}`}>
            <p>{t('terms_last_updated', resolvedLang)}: January 2025</p>
            <p>© 2025 Jimstech Innovations Nigeria Limited</p>
          </div>
        </div>
      </div>
    </main>
  );
}
