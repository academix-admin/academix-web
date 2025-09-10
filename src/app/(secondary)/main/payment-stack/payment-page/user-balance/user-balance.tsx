'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './user-balance.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserBalanceModel } from '@/models/user-balance';
import { ComponentStateProps } from '@/hooks/use-component-state';

export default function UserBalance({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();
  const [balanceVisible, setBalanceVisible] = useState(false);

  const [userBalance, demandUserBalance, setUserBalance] = useDemandState<UserBalanceModel | null>(
    null,
    {
      key: "userBalance",
      persist: true,
      ttl: 3600,
      scope: "secondary_flow",
      deps: [lang],
    }
  );

  useEffect(() => {
    if(!userData)return;
    demandUserBalance(async ({ get, set }) => {
      onStateChange?.('loading');
      try {
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );
        if(!paramatical)return;
        const { data, error } = await supabaseBrowser.rpc("get_user_balance", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;
        const balance = new UserBalanceModel(data);

        if (balance) {
          set(balance);
            onStateChange?.('data');
        }
      } catch (err) {
        console.error("[HomeExperience] demand error:", err);
      }
    });
  }, [lang, userData, demandUserBalance]);

    useEffect(() => {
        if(userBalance){
            onStateChange?.('data');
        }else{
           onStateChange?.('none');
        }
    }, [userBalance]);


  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat(lang, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!userBalance || !userData) return null;

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('payment_details')}
      </h2>

      <div className={styles.paymentCard}>
        <div className={styles.cardHeader}>
          <span className={styles.balanceLabel}>{t('current_balance')}</span>
          <button
            className={styles.eyeButton}
            onClick={() => setBalanceVisible(!balanceVisible)}
            aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {balanceVisible ? (
                // Open eye SVG
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="white"/>
              ) : (
                // Closed eye SVG
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="white"/>
              )}
            </svg>
          </button>
        </div>

        <div className={styles.balanceAmount}>
          <div className={styles.currencySymbol}>
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" fill="white"/>
            </svg>
          </div>
          <div className={styles.amount}>
            {balanceVisible ? formatBalance(userBalance.usersBalanceAmount) : '*****'}
          </div>
        </div>

        <div className={styles.userInfo}>
          <div className={styles.nameSection}>
            <div className={styles.nameLabel}>{t('full_name')}</div>
            <div className={styles.userName}>{userData.usersNames.toUpperCase()}</div>
          </div>
          <div className={styles.institution}>ADC</div>
        </div>
      </div>
    </div>
  );
}