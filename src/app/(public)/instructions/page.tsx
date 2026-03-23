'use client';

import { use, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Role } from '@/lib/stacks/signup-stack';
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

interface InstructionsPageProps { searchParams: Promise<Partial<Params>>; }

interface StepColors { light: string; dark: string; }
interface StepConfig {
  title: string;
  colors: { background: StepColors; number: StepColors; title: StepColors; text: StepColors; };
  items: string[];
  typeBackground?: StepColors;
  types?: string[];
}

export default function Instructions({ searchParams }: InstructionsPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode } = useLanguage();
  const { initialized, hasValidSession } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan);
  
  const stepsConfig: StepConfig[] = [
    { 
      title: t('sign_up', resolvedLang), 
      colors: { background: { light: '#E8F0FF', dark: '#0D1B2A' }, number: { light: '#1A73E8', dark: '#1A73E8' }, title: { light: '#1A73E8', dark: '#A5CCFF' }, text: { light: '#1A73E8', dark: '#A5CCFF' } }, 
      items: [t('step_create_account', resolvedLang), t('step_choose_account_type', resolvedLang)], 
      typeBackground: { light: '#1A73E8', dark: '#2563EB' }, 
      types: roles.map(role => role.roles_identity)
    },
    { 
      title: t('step_complete_account', resolvedLang), 
      colors: { background: { light: '#EDFDF2', dark: '#0F1F17' }, number: { light: '#2F855A', dark: '#2F855A' }, title: { light: '#2F855A', dark: '#88E3B5' }, text: { light: '#2F855A', dark: '#88E3B5' } }, 
      items: [
        t('step_verify_details', resolvedLang),
        ...(() => {
          const selected = roles[selectedRoleIndex];
          const buyIn = selected?.roles_buy_in ?? 0;
          return buyIn > 0 ? [t('step_pay_buy_in', { amount: buyIn.toLocaleString() }, resolvedLang)] : [];
        })(),
        t('step_obtain_kyc', resolvedLang),
      ] 
    },
    { 
      title: t('step_setup_profile', resolvedLang), 
      colors: { background: { light: '#E6FAF8', dark: '#0D1F1E' }, number: { light: '#319795', dark: '#319795' }, title: { light: '#319795', dark: '#98D7D6' }, text: { light: '#319795', dark: '#98D7D6' } }, 
      items: [t('step_setup_profile_preferences', resolvedLang), t('step_topup_wallet', resolvedLang)] 
    },
    { 
      title: t('step_play_quiz', resolvedLang), 
      colors: { background: { light: '#F5EAFE', dark: '#1A0D2A' }, number: { light: '#9F7AEA', dark: '#9F7AEA' }, title: { light: '#9F7AEA', dark: '#C1A5FA' }, text: { light: '#9F7AEA', dark: '#C1A5FA' } }, 
      items: [t('step_join_quiz_challenge', resolvedLang), t('step_answer_best', resolvedLang)] 
    },
    { 
      title: t('step_get_rewarded', resolvedLang), 
      colors: { background: { light: '#FFF9E6', dark: '#2A210D' }, number: { light: '#D69E2E', dark: '#D69E2E' }, title: { light: '#D69E2E', dark: '#FFDA8F' }, text: { light: '#D69E2E', dark: '#FFDA8F' } }, 
      items: [t('step_get_paid_lose', resolvedLang), t('step_refer_friends', resolvedLang), t('step_earn_streaks', resolvedLang), t('step_redeem_missions', resolvedLang)] 
    },
    { 
      title: t('step_earn_value', resolvedLang), 
      colors: { background: { light: '#F7F7F7', dark: '#1A1A1A' }, number: { light: '#000000', dark: '#000000' }, title: { light: '#000000', dark: '#DCD5D5' }, text: { light: '#000000', dark: '#DCD5D5' } }, 
      items: [t('step_exchange_tokens', resolvedLang), t('step_view_statistics', resolvedLang)] 
    }
  ];

  const getThemeColor = (colors: StepColors) => colors[resolvedTheme as keyof StepColors] || colors.light;

  useEffect(() => { setCanGoBack(window.history.length > 1); }, []);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_roles', {
          p_locale: resolvedLang,
        });
        if (error) throw error;
        setRoles(data ?? []);
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    }
    fetchRoles();
  }, [resolvedLang]);

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
            <h1 className={styles.title}>{t('instructions_text', resolvedLang)}</h1>
            {!hasValidSession && (
              <Link className={styles.logoContainer} href="/">
                <Image className={styles.logo} src="/assets/image/academix-logo.png" alt="Academix Logo" width={40} height={40} priority />
              </Link>
            )}
          </div>
        </header>
      )}

      <div className={`${styles.innerBody} ${req ? styles[`innerBody_${req}`] : ''}`}>
        {config.showTitle && (
          <h1 className={`${styles.bigTitle} ${styles[`bigTitle_${resolvedTheme}`]}`}>
            {tNode('what_academix_title', {
              academix: <span className={`${styles.academixText} ${styles[`academixText_${resolvedTheme}`]}`}>Academix</span>
            }, resolvedLang)}
          </h1>
        )}
        {config.showDescription && (
          <h4 className={`${styles.description} ${styles[`description_${resolvedTheme}`]}`}>
            {t('what_academix_is_desc', resolvedLang)}
          </h4>
        )}
        <div className={styles.stepsContainer}>
          {stepsConfig.map((step, index) => (
            <div key={index} className={styles.step} style={{ backgroundColor: getThemeColor(step.colors.background) }}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber} style={{ backgroundColor: getThemeColor(step.colors.number), color: '#fff' }}>{index + 1}</span>
                <h3 className={styles.stepTitle} style={{ color: getThemeColor(step.colors.title) }}>{step.title}</h3>
              </div>
              <ul className={styles.stepItems}>
                {step.items.map((item, i) => (
                  <li key={i} className={styles.stepItem} style={{ color: getThemeColor(step.colors.text) }}>
                    <span dangerouslySetInnerHTML={{ __html: item.replace(/\*(.*?)\*/g, `<strong style="color: ${getThemeColor(step.colors.title)}">$1</strong>`) }} />
                  </li>
                ))}
              </ul>
              {step.types && <select className={styles.stepSelect} style={{ backgroundColor: step.typeBackground?.[resolvedTheme as keyof StepColors] || getThemeColor(step.colors.title) }} onChange={(e) => setSelectedRoleIndex(Number(e.target.value))}>{step.types.map((type, i) => <option key={i} value={i}>{type}</option>)}</select>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}