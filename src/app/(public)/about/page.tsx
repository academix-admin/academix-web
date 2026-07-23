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

interface AboutPageProps {
  searchParams: Promise<Partial<Params>>;
}

export default function About({ searchParams }: AboutPageProps) {
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
        title={t('about_text', resolvedLang)}
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
            {t('about_text', resolvedLang)}
          </h1>
        )}
        {config.showDescription && (
          <h4 className={`${styles.description} ${styles[`description_${resolvedTheme}`]}`}>
            {t('about_description', resolvedLang)}
          </h4>
        )}
        
        <div className={styles.cardsContainer}>
          {/* Project Card */}
          <div className={`${styles.card} ${styles[`card_${resolvedTheme}`]}`}>
            <div className={styles.cardIcon}>🎓</div>
            <h3 className={styles.cardTitle}>{t('about_academix', resolvedLang)}</h3>
            <p className={styles.cardText}>{t('about_description', resolvedLang)}</p>
          </div>

          {/* Mission Card */}
          <div className={`${styles.card} ${styles[`card_${resolvedTheme}`]}`}>
            <div className={styles.cardIcon}>🎯</div>
            <h3 className={styles.cardTitle}>{t('our_mission', resolvedLang)}</h3>
            <p className={styles.cardText}>{t('mission_description', resolvedLang)}</p>
          </div>

          {/* Vision Card */}
          <div className={`${styles.card} ${styles[`card_${resolvedTheme}`]}`}>
            <div className={styles.cardIcon}>🚀</div>
            <h3 className={styles.cardTitle}>{t('our_vision', resolvedLang)}</h3>
            <p className={styles.cardText}>{t('vision_description', resolvedLang)}</p>
          </div>
        </div>

        {/* Company Section */}
        <div className={`${styles.companySection} ${styles[`companySection_${resolvedTheme}`]}`}>
          <div className={styles.companyIcon}>🏢</div>
          <h2 className={styles.companyTitle}>Jimstech Innovations Nigeria Limited</h2>
          <p className={styles.companyText}>
            Academix is proudly developed and maintained by Jimstech Innovations Nigeria Limited, 
            a technology company dedicated to creating innovative educational solutions that empower learners worldwide.
          </p>
          <div className={styles.companyDetails}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Company:</span>
              <span className={styles.detailValue}>Jimstech Innovations Nigeria Limited</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Product:</span>
              <span className={styles.detailValue}>Academix</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Focus:</span>
              <span className={styles.detailValue}>Educational Technology & Gamification</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
