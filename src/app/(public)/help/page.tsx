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
interface Params { col: StringOrNull; lan: StringOrNull; req: StringOrNull; [key: string]: string | null; }

const useAppParams = <T extends Record<string, StringOrNull> = Params>(fallbackParams?: Partial<T>): T => {
  const searchParams = useSearchParams();
  const params: Record<string, StringOrNull> = {};
  if (fallbackParams) { for (const key in fallbackParams) { params[key] = fallbackParams[key] ?? null; } }
  searchParams.forEach((value, key) => { params[key] = value; });
  if (fallbackParams) { for (const key of Object.keys(fallbackParams)) { if (!(key in params)) params[key] = null; } }
  return params as T;
};

interface HelpPageProps { searchParams: Promise<Partial<Params>>; }

export default function Help({ searchParams }: HelpPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { initialized, hasValidSession } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  const config = getConfig(req);
  const resolvedTheme = col || theme;

  useEffect(() => { setCanGoBack(window.history.length > 1); }, []);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor && config.backgroundColor[resolvedTheme]) {
      return { background: config.backgroundColor[resolvedTheme], color: resolvedTheme === 'dark' ? '#ffffff' : '#000000' } as React.CSSProperties;
    }
    return {};
  };

  const getContainerClass = () => {
    const baseClass = styles.container;
    if (config.backgroundColor) return `${baseClass} ${styles[`container_${req}`]}`;
    return `${baseClass} ${styles[`container_${resolvedTheme}`]} ${styles[`container_${req}`]}`;
  };

  const goBack = () => {
    if (hasValidSession) { router.replace('/main'); return; }
    if (window.history.length <= 1) { router.replace('/main'); } else { router.back(); }
  };

  return (
    <main className={getContainerClass()} style={getBackgroundStyle()}>
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {(canGoBack || hasValidSession) && (
              <button className={styles.backButton} onClick={goBack} aria-label="Go back">
                <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
                </svg>
              </button>
            )}
            <h1 className={styles.title}>{t('help_text')}</h1>
            {!hasValidSession && (
              <Link className={styles.logoContainer} href="/">
                <Image className={styles.logo} src="/assets/image/academix-logo.png" alt="Academix Logo" width={40} height={40} priority />
              </Link>
            )}
          </div>
        </header>
      )}

      <div className={`${styles.innerBody} ${styles[`innerBody_${req}`]}`}>
        <div className={styles.content}>
          <h2 className={styles.sectionTitle}>{t('help_center')}</h2>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{t('faq_question_1')}</h3>
            <p className={styles.paragraph}>{t('faq_answer_1')}</p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{t('faq_question_2')}</h3>
            <p className={styles.paragraph}>{t('faq_answer_2')}</p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{t('faq_question_3')}</h3>
            <p className={styles.paragraph}>{t('faq_answer_3')}</p>
          </div>
          <div className={styles.contactSection}>
            <h3 className={styles.contactTitle}>{t('need_more_help')}</h3>
            <p className={styles.paragraph}>{t('contact_support_desc')}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
