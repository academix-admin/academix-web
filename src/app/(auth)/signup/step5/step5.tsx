'use client';

import { useEffect, useState, useCallback, useMemo,} from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step5.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStack, signupConfig, Role} from '@/lib/stacks/signup-stack';
import { useDemandState } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';


interface RoleItemProps {
  onClick: () => void;
  role: Role;
  selected: boolean;
}

const RoleItem = ({ onClick, role, selected }: RoleItemProps) => {
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      className={`
        ${styles.roleCard}
        ${selected ? styles.roleCardSelected : `${styles.roleCardUnselected} ${styles[`roleCardUnselected_${theme}`]}`}
        ${styles[`roleCard_${theme}`]}
      `}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className={styles.radioCircle}>
        {selected && <div className={styles.radioDot} />}
      </div>
      <div className={styles.roleInfo}>
        <span className={styles.roleTitle}>{role.roles_identity }</span>
        <span className={styles.roleTier}>Tier {role.roles_level}</span>
      </div>
    </div>
  );
};


export default function SignUpStep5() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { signup, signup$, __meta  } = useStack('signup', signupConfig, 'signup_flow');
  const nav = useNav();
  const isTop = nav.isTop();

  const [roles, demandRoles, setRoles] = useDemandState<Role[]>([], {
      key: 'roles',
      scope: 'signup_flow',
      persist: true,
      ttl: 3600,
      deps: [lang],
    });

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [roleState, setRoleState] = useState('initial');

  useEffect(() => {
    if(!signup.fullName && __meta.isHydrated && isTop){nav.go('step1');}
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName,__meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    loadRoles();
  }, []);


  useEffect(() => {
    setIsFormValid(!!signup.role);
  }, [signup.role]);

  useEffect(() => {
    if(roles.length <= 0 && roleState === 'data')setRoleState("empty");
  }, [roles]);

    const loadRoles = useCallback(() => {
  demandRoles(async ({ set, get }) => {
        const check = get().length;
              if(!check || check === 0)setRoleState("loading");
        try {
          const { data, error } = await supabaseBrowser.rpc('fetch_roles', { p_locale: lang });
          if (error) throw error;
          if(data.length > 0){
                      set(data || []);
                      setRoleState("data");
                  }else{
                      setRoleState("empty");
                  }
        } catch (err) {
                    setRoleState("error");

          console.error('Failed to fetch roles:', err);
        }
      });
    }, [lang]);


 const handleRole = (role: Role) => {
   signup$.setField({ field: 'role', value: role });
 };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    signup$.setStep(6);
    nav.push('step6');
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
          id="signup-step5"
          src="/assets/lottie/sign_up_step_5_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 5, total: signupConfig.totalSteps })}</p>

        <div  className={styles.form}>
          <div  className={styles.formGroup}>
           <label htmlFor="role" className={styles.label}>
                        {t('choose_role')}
            </label>
            <div className={styles.roleState}>
             {roleState === 'loading' && roles.length <= 0 && (<LoadingView text={t('loading')}/>)}
             {roleState === 'empty' && roles.length <= 0  && (<NoResultsView text="No results found." buttonText="Try Again" onButtonClick={loadRoles} />)}
             {roleState === 'error' && roles.length <= 0 && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={loadRoles} />)}
            </div>
            {roles.length > 0 && (
                <div className={styles.rolesGrid}>
                  {[...roles].reverse().map((role) => (
                    <RoleItem
                      key={role.roles_id}
                      onClick={() => handleRole(role)}
                      role={role}
                      selected={signup.role?.roles_id === role.roles_id}
                    />
                  ))}
                </div>
                )}
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

    </main>
  );
}