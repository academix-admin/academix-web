'use client';

import { use, useEffect, useState } from 'react';
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

const quizConfig: Config = {
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
    'quiz': quizConfig
  };
  return configMap[req || ''] || defaultConfig;
};

// Data for rules
const rulesData = {
  en: {
    sections: [
      {
        type: "warning",
        content: "Ensure you verify topic, challenge, game mode and payment details before joining the pool",
        hasImage: true
      },
      {
        type: "warning",
        content: "Observe carefully the status of the quiz pool to avoid not participating in quiz pool"
      },
      {
        title: "1. Waiting time",
        items: [
          "Quiz pool is open during this period to allow participants join to meet minimum requirement for the pool",
          "Note: Players can still decide to leave if they joined."
        ]
      },
      {
        title: "2. Extended time",
        items: [
          "Quiz pool is open during this period to still allow participants join in case minimum requirement wasn't meet for the pool.",
          "Note: Players can still decide to leave if they joined",
          "Note: If minimum is not met, quiz is closed automatically and charges are refunded."
        ]
      },
      {
        title: "3. Starting time",
        items: [
          "Quiz pool is active, allowing players to prepare for the quiz they have selected to participate",
          "Note: Players cannot leave pool at this point and charges are non-refundable."
        ]
      },
      {
        title: "4. Pool period",
        items: [
          "Quiz pool is available for players to participate and interact by answering questions."
        ]
      },
      {
        title: "5. Pool closed",
        items: [
          "Quiz pool is now ended from being active to players and interacting is no longer possible."
        ]
      },
      {
        type: "warning",
        content: "Redeem codes have rules that apply"
      },
      {
        title: "Position-based rewards",
        items: [
          "1st, 2nd, 3rd means players must have this position to get the shared payout.",
          "Top, Mid, Bot means players must fall within the category to get the shared payout."
        ]
      }
    ]
  }
};

type StringOrNull = string | null;

interface Params {
  col: StringOrNull;
  lan: StringOrNull;
  req: StringOrNull;
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


interface RulesPageProps {
  searchParams: Promise<Partial<Params>>;
}

export default function Rules({ searchParams }: RulesPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { initialized } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;
  const rules = rulesData[resolvedLang as keyof typeof rulesData] || rulesData.en;

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  // Determine background style - SIMPLIFIED APPROACH
  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor && config.backgroundColor[resolvedTheme]) {
      return {
        background: config.backgroundColor[resolvedTheme],
        color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
      } as React.CSSProperties;
    }
    return {};
  };

  // Determine container class
  const getContainerClass = () => {
    const baseClass = styles.container;
    if (config.backgroundColor) {
      return baseClass; // Don't apply CSS class when using config background
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]}`;
  };


  return (
    <main
      className={getContainerClass()}
      style={getBackgroundStyle()}
    >
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
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

            <h1 className={styles.title}>{t('rules_text', resolvedLang)}</h1>

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
        <div className={styles.rulesContainer}>
          {/* Rules Content */}
          <div className={styles.rulesContent}>
            {rules.sections.map((section, index) => (
              <div key={index} className={styles.ruleSection}>
                {section.type === "warning" ? (
                  <div className={`${styles.warningCard} ${styles[`warning_${resolvedTheme}`]}`}>
                    <div className={styles.warningHeader}>
                      <span className={styles.warningIcon}>⚠️</span>
                      <span className={styles.warningText}>{section.content}</span>
                    </div>
                    {section.hasImage && (
                      <div className={styles.imagePlaceholder}>
                        [Image]
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`${styles.sectionCard} ${styles[`sectionCard_${resolvedTheme}`]}`}>
                    <h3 className={styles.sectionTitle}>{section.title}</h3>
                    <ul className={styles.sectionList}>
                      {section.items?.map((item, itemIndex) => (
                        <li key={itemIndex} className={styles.sectionItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}