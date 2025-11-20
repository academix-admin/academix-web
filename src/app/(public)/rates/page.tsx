'use client';

import { use, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider'


interface Config {
  showHeader: boolean;
  backgroundColor: Record<string, string> | null;
}

const iosConfig: Config = {
  showHeader: false,
  backgroundColor: { 'light': '#fff', 'dark': '#212121' }
};

const androidConfig: Config = {
  showHeader: false,
  backgroundColor: { 'light': '#fff', 'dark': '#232323' }
};

const paymentConfig: Config = {
  showHeader: false,
  backgroundColor: null
};

const defaultConfig: Config = {
  showHeader: true,
  backgroundColor: null
};

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = {
    'ios': iosConfig,
    'android': androidConfig,
    'payment': paymentConfig
  };
  return configMap[req || ''] || defaultConfig;
};


type StringOrNull = string | null;

interface Params {
  col: StringOrNull;
  lan: StringOrNull;
  req: StringOrNull;
  to: StringOrNull;
  [key: string]: string | null;
}

const useAppParams = <
  T extends Record<string, StringOrNull> = Params
>(
  fallbackParams?: Partial<T>
): T => {
  const searchParams = useSearchParams();

  // ✅ Start with a clean object that only has string | null values
  const params: Record<string, StringOrNull> = {};

  if (fallbackParams) {
    for (const key in fallbackParams) {
      const value = fallbackParams[key];
      params[key] = value ?? null; // ✅ ensure no undefined
    }
  }

  // ✅ Merge URL search params
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // ✅ Ensure all fallback keys exist
  if (fallbackParams) {
    for (const key of Object.keys(fallbackParams)) {
      if (!(key in params)) params[key] = null;
    }
  }

  return params as T;
};


interface RatesPageProps {
  searchParams: Promise<Partial<Params>>;
}

export default function Rates({ searchParams }: RatesPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req, to } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { initialized } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [calledFind, setCalledFind] = useState(false);
  const [activeSection, setActiveSection] = useState('academix-ratio');

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;

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
      return baseClass;
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]}`;
  };

  const goBack = () => {
    if (initialized) {
      router.replace('/main');
      return;
    }
    if (window.history.length <= 1) {
      router.replace('/main');
    } else {
      router.back();
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  };

  useLayoutEffect(() => {
    if (calledFind) return;

    const targetSection = to || window.location.hash.replace('#', '');

    if (targetSection) {
      setCalledFind(true);
      setActiveSection(targetSection);

      // Small delay to ensure the next paint cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = document.getElementById(targetSection);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });
    }
  }, [to, calledFind]);

  return (
    <main
      className={getContainerClass()}
      style={getBackgroundStyle()}
    >
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {(canGoBack || initialized) && (
              <button
                className={styles.backButton}
                onClick={goBack}
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

            <h1 className={styles.title}>{t('rates_text')}</h1>

            {!initialized && <Link className={styles.logoContainer} href="/">
              <Image
                className={styles.logo}
                src="/assets/image/academix-logo.png"
                alt="Academix Logo"
                width={40}
                height={40}
                priority
              />
            </Link>}
          </div>
        </header>
      )}

      <div className={`${styles.innerBody} ${styles[`innerBody_${req}`]}`}>

      </div>
    </main>
  );
}