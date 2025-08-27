'use client';

import { useEffect, useState, useCallback, useMemo} from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step6.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup, Referral} from '@/lib/stacks/signup-stack';
import { useNav } from "@/lib/NavigationStack";

const NoRewardView = ({
  onRewardClick,
  onContinueClick,
  continueLoading
}: {
      onRewardClick: () => void;
      onContinueClick: () => void;
      continueLoading: boolean;
}) => {
  const { t, tNode, lang } = useLanguage();
  const { theme } = useTheme();


  return (


              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.rewardButton}
                  onClick={onRewardClick}
                >
                  {t('reward')}
                </button>
                <button
                type="submit"
                className={styles.continueButton}
                disabled={continueLoading}
                aria-disabled={continueLoading}
                onClick={onContinueClick}
               >
                    {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
                </button>
               </div>
  );
};

const RewardView = ({
  onRemoveClick,
    onContinueClick,
    continueLoading
}: {
      onRemoveClick: () => void;
            onContinueClick: () => void;
            continueLoading: boolean;
}) => {
  const { t, tNode, lang } = useLanguage();
  const { theme } = useTheme();
  const { signup, signup$, __meta  } = useSignup();

  const [userNameState, setUserNameState] = useState('initial');
  const [usernameInputValue, setUsernameInputValue] = useState('');
  const [isFormValid, setIsFormValid] = useState(true);


    useEffect(() => {
        if(!!signup.referral &&  __meta.isHydrated){
                    setUserNameState('exists');
                    setUsernameInputValue(signup?.referral?.users_username.replace('@', '') || '')
            }
    }, [signup.referral,  __meta.isHydrated]);

   const isEmail = (value: string): boolean => {
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;
      return emailRegex.test(value);
    };

    const containsUpperCase = (value: string): boolean => {
      return /[A-Z]/.test(value);
    };

    const getSpecialCharacters = (value: string): string[] => {
      const specialCharactersRegExp = /[^a-zA-Z0-9]/g;
      const matches = value.match(specialCharactersRegExp);
      return matches ? matches : [];
    };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      const cleanValue = value.replace('@', '');
      setUsernameInputValue(cleanValue);

      if (cleanValue.length === 0) {
        setUserNameState('initial');
        setIsFormValid(false);
        return;
      }

      // Format validation
      if (isEmail(cleanValue) || containsUpperCase(cleanValue) ||
          !getSpecialCharacters(cleanValue).every(c => c === '.' || c === '_')) {

        setUserNameState('wrongFormat');
                setIsFormValid(false);
        return;
      }

        setUserNameState('data');
                setIsFormValid(true);
    };

const changeUsername =  () => {
                    setUserNameState('initial');
                            signup$.setField({ field: 'referral', value: null });

    };
const onSearchClick = async () => {

        setUserNameState('checking');
    try {
      const { data: rpcResult, error } = await supabaseBrowser.rpc('get_referral_data', {
        p_username: `@${usernameInputValue}`
      });
      if (error) throw error;

      if (rpcResult) {
        signup$.setField({ field: 'referral', value: rpcResult as Referral });
      } else {
                setUserNameState('empty');
      }
    } catch (err) {
      console.error(err);
                      setUserNameState('error');
    }
  };


  return (
      <>
                 {userNameState === 'checking' && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

                    {userNameState === 'exists' && (<div  className={styles.resultContainer}>

                           <div className={styles.userNameContainer}> <span className={`${styles.userNameResult} ${styles[`userNameResult_${theme}`]}`}>{signup.referral?.users_username || 'null'} </span> <svg role="button" onClick={changeUsername} fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg">
                                                                                                                                                                                                               <path clipRule="evenodd" d="M7.01434 2.646H1.7173C0.791151 2.646 0.0410156 3.43687 0.0410156 4.41109V13.2349C0.0410156 14.2099 0.791151 15 1.7173 15H10.9368C11.863 15 12.6131 14.2099 12.6131 13.2349V6.77622L9.33263 10.2297C9.04616 10.5343 8.67308 10.7448 8.26317 10.8331L6.01611 11.3065C4.54937 11.6148 3.25696 10.2539 3.55031 8.71049L3.99955 6.34453C4.08085 5.91784 4.28033 5.52532 4.57284 5.2178L7.01434 2.646Z"
                                                                                                                                                                                                                   fill="white"
                                                                                                                                                                                                                   fillRule="evenodd" />
                                                                                                                                                                                                               <path clipRule="evenodd" d="M14.1602 1.09759C14.0755 0.884274 13.9512 0.688657 13.7939 0.520896C13.6393 0.356828 13.4528 0.225576 13.2458 0.135042C13.0418 0.0459845 12.8215 0 12.5987 0C12.376 0 12.1557 0.0459845 11.9517 0.135042C11.7447 0.225576 11.5582 0.356828 11.4036 0.520896L10.9459 1.00259L13.3363 3.51939L13.7939 3.03686C13.9529 2.87038 14.0773 2.67442 14.1602 2.46017C14.3329 2.0222 14.3329 1.53556 14.1602 1.09759ZM12.152 4.76696L9.7608 2.24932L5.757 6.46621C5.69793 6.52879 5.65809 6.60687 5.64218 6.69122L5.19294 9.05802C5.13427 9.36637 5.39325 9.63805 5.68576 9.57638L7.93365 9.10385C8.01544 9.08573 8.08989 9.04363 8.14738 8.98301L12.152 4.76696Z"
                                                                                                                                                                                                                   fill="white"
                                                                                                                                                                                                                   fillRule="evenodd" />
                                                                                                                                                                                                           </svg> </div>
                           <h2 className={`${styles.userNameResult} ${styles[`nameResult_${theme}`]}`}>{signup.referral?.users_names || 'null'}  </h2>

                        </div>)}
                    {userNameState != 'exists' && (<label htmlFor="username" className={styles.label}>{t('username_label')}</label>)}
                    {userNameState != 'exists' && (<div className={styles.usernameInputContainer}>
                       <span className={`${styles.prefix} ${styles[`prefix_${theme}`]}`}>@</span>
                       <input
                                                 autoFocus={userNameState === 'exists' ? false : true}
                                                 type="text"
                                                 id="username_check"
                                                 name="username"
                                                 value={usernameInputValue}
                                                 onChange={handleUserNameChange}
                                                 placeholder={t('username_placeholder')}
                                                 className={styles.input}
                                                 required
                                                 disabled={continueLoading}

                                                 autoCapitalize="none"
                       />
                   </div>)}
                                             {userNameState === 'wrongFormat' && (
                                               <p className={`${styles.errorText} ${styles[`errorText_${theme}`]}`}>{t('username_wrong_format')}</p>
                                             )}
                                             {userNameState === 'error' && (
                                               <p className={`${styles.errorText} ${styles[`errorText_${theme}`]}`}>{t('username_error')}</p>
                                             )}
                                             {userNameState === 'empty' && (
                                               <p className={`${styles.errorText} ${styles[`errorText_${theme}`]}`}>{t('username_empty')}</p>
                                             )}
              <div className={styles.actionsRow}>
    <button
                  type="button"
                  className={styles.removeButton}
                  onClick={onRemoveClick}
                >
                  {t('remove')}
                </button>
              {userNameState != 'exists' && (<button
                className={styles.searchButton}
                disabled={!isFormValid || userNameState === 'checking'}
                aria-disabled={!isFormValid || userNameState === 'checking'}
                onClick={onSearchClick}
              >
                    {userNameState === 'checking' ? <span className={styles.spinner}></span> : t('search')}
              </button>)}
              {userNameState === 'exists' && (<button
                                                           type="submit"
                                                           className={styles.continueButton}
                                                           disabled={signup.referral === null  || continueLoading}
                                                           aria-disabled={signup.referral === null  || continueLoading}
                                                           onClick={onContinueClick}
                                                          >
                                                               {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
                                                           </button>)}
                        </div>
                                </>

  );
};

export default function SignUpStep6() {
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { signup, signup$, __meta  } = useSignup();
  const nav = useNav();
  const isTop = nav.isTop();


  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);

  const [rewardState, showRewardState] = useState(false);

  useEffect(() => {
    if(!signup.fullName && __meta.isHydrated && isTop){nav.go('step1');}
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));

  }, [signup.fullName,__meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
      if(__meta.isHydrated && signup.referral != null)showRewardState(true);
  }, [signup.referral, __meta.isHydrated]);


  const handleSubmit = () => {
    setContinueLoading(true);
    signup$.setStep(7);
    nav.push('step7');
    setContinueLoading(false);
  };

  const handleReward = ()=>{
      showRewardState(prev => !prev);
                                  signup$.setField({ field: 'referral', value: null });

   }



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
          id="signup-step6"
          src="/assets/lottie/sign_up_step_6_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 6, total: 7 })}</p>

        <div  className={styles.form}>
          <div  className={styles.formGroup}>
           <label htmlFor="referral" className={styles.label}>
                        {t('referral_optional')}
            </label>
          <div className={`${styles.rewardSection} ${styles[`rewardSection_${theme}`]}`}>
          <div className={`${styles.rewardInfo} ${styles[`rewardInfo_${theme}`]}`}>
                {tNode('referral_reward_info', {
                  amount: <strong>500</strong>,
                  threshold: <strong>700</strong>,
                  hours: <strong>24</strong>
                })}
              </div>
          </div>

            {!rewardState && (<NoRewardView onRewardClick={handleReward} onContinueClick={handleSubmit} continueLoading={continueLoading} />)}
            {rewardState && (<RewardView onRemoveClick={handleReward} onContinueClick={handleSubmit} continueLoading={continueLoading} />)}

          </div>


        </div>
      </div>

    </main>
  );
}