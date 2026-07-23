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
  const { t, lang } = useLanguage();
  const { initialized, hasValidSession } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;

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
        <Header
        title={t('help_text', resolvedLang)}
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

      <div className={`${styles.innerBody} ${styles[`innerBody_${req}`]}`}>
        <div className={styles.content}>
          <h2 className={styles.sectionTitle}>{t('help_center', resolvedLang)}</h2>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{t('faq_question_1', resolvedLang)}</h3>
            <p className={styles.paragraph}>{t('faq_answer_1', resolvedLang)}</p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{t('faq_question_2', resolvedLang)}</h3>
            <p className={styles.paragraph}>{t('faq_answer_2', resolvedLang)}</p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>{t('faq_question_3', resolvedLang)}</h3>
            <p className={styles.paragraph}>{t('faq_answer_3', resolvedLang)}</p>
          </div>
          <div className={styles.contactSection}>
            <h3 className={styles.contactTitle}>{t('need_more_help', resolvedLang)}</h3>
            <p className={styles.paragraph}>{t('contact_support_desc', resolvedLang)}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
