'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './academix-ratio.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useAcademixRatio } from '@/lib/stacks/academix-ratio-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ComponentStateProps } from '@/hooks/use-component-state';

export default function AcademixRatio({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();

  const [academixRatioData, demandAcademixRatio, setAcademixRatio] = useAcademixRatio(lang);

  useEffect(() => {
    demandAcademixRatio(async ({ get, set }) => {
      if(!userData)return;
      onStateChange?.('loading');
      try {
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );
        if(!paramatical)return;
        const { data, error } = await supabaseBrowser.rpc("get_user_academix_ratio", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;

        const academixRatio = (data.academix_ratio as number | null)?.toFixed(2) || 0;

        if (data.status === "AcademixRatio.success") {
          set(Number(academixRatio));
                onStateChange?.('data');

        }
      } catch (err) {
        console.error("[Academix Ratio] demand error:", err);
      }
    });
  }, [lang, userData, demandAcademixRatio]);

    useEffect(() => {
        if(academixRatioData){
            onStateChange?.('data');
        }else{
           onStateChange?.('none');
        }
    }, [academixRatioData]);

  if (!academixRatioData) return null;

 return (
  <div className={styles.academixRatioContainer}>
    <h2
      className={`${styles.academixRatioTitle} ${styles[`academixRatioTitle_${theme}`]}`}
    >
      {t('academix_ratio')}
    </h2>

    <div className={styles.academixRatioSection}>
      <div className={styles.academixRatioValueContainer}>
        <div className={styles.academixRatioIconWrapper}>
          <svg
            className={styles.academixRatioIcon}
            version="1.1"
            viewBox="0 0 1600 2000"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m0 0 4 1-2 4-13 20-10 17-7 11-8 15-10 23-13 35-6 22-5 32-1 14v75l3 32 7 36 9 31 13 40 10 27 14 32 11 26 12 26 17 33 13 25 12 22 16 30 12 21 15 28 10 17 13 24 11 20 9 16 16 31 12 21 8 16 12 23 15 30 14 33 10 22 11 28 17 50 6 20 5 26 7 43 2 15 1 2 4-1 9-16 8-16 11-23 13-31 6-16 11-35 9-30 9-36 11-60 8-47 6-45 4-44 3-56 4 2 12 19 9 15 15 29 19 38 12 30 9 24 12 34 15 49 9 34 6 30 11 68 4 32 2 25 1 20v105l-3 38-6 45-7 42-7 36-9 35-12 39-14 41-13 33-11 25-23 46-10 18-10 16-12 19-8 12-11 15-13 17-11 14-11 13-7 7-9 11-9 10-12 13-16 16-10 8-11 10-11 9-17 13-14 10-18 13-20 12-22 13-46 23-21 9-31 11-27 9-37 10-26 5-43 5-61 5-17 1h-67l-27-2-45-6-38-7-40-10-41-13-29-10-24-11-25-11-19-10-28-17-19-12-12-9-23-16-12-10-9-7-12-10-11-9-15-14-7-7-10-8-19-19-7-8-11-11-8-10-11-13-9-10-10-13-14-18-13-19-8-11-13-20-15-25-15-26-13-24-17-35-16-39-14-36-8-22-17-60-8-32-6-31-5-36-6-57-2-28v-71l3-36 6-47 5-30 8-32 9-30 14-44 11-26 13-30 13-29 8-14 13-25 10-17 13-21 10-16 11-16 13-18 7-11 8-10 8-11 2-2h3l6 53 4 26 7 31 12 42 10 30 12 25 14 22 11 13 4 5 8 7 12 9 4 2-2-14-3-46-1-35v-23l2-38 4-35 6-36 8-39 11-44 9-27 14-36 13-30 19-38 9-15 10-16 13-20 13-19 11-14 9-13 5-7h2l2-4 11-12 8-10 14-15 9-9 5-6 17-17 8-7 12-12 11-9 13-11 9-8 19-14 15-12 22-16 16-11 29-19 14-8 10-7 18-10 10-6 27-15 19-10 25-12 32-16 27-11 31-14 39-15 12-5z"
              fill="#EA745D"
              transform="translate(1014,33)"
            />
            <path
              d="m0 0 3 1 8 58 6 34 8 33 12 38 8 20 12 26 8 17 13 23 12 19 16 24 12 17 14 19 10 13 12 16 10 13 9 11 13 17 16 21 8 11 12 17 11 16 14 22 13 22 11 21 7 16 11 28 9 27 5 22 3 20 2 19 1 16v67l-2 29-2 25 4-1 8-9 12-17 10-17 15-29 11-27 9-25 8-26 7-28 8-48 4-28 4 1 4 9 8 20 9 29 10 41 5 28 3 27 1 12v36l-2 23-3 23-6 28-7 23-6 19-6 13-8 16-8 15-6 11-8 13-10 15-10 13-14 15-4 5-8 7-16 16-11 9-14 11-21 14-13 8-23 13-10 6-19 9-16 8-19 8-17 6-24 5-15 3-6 1v3l-13 1h-67l-27-2-45-6-18-3 4-2-17-9-20-9-24-11-18-10-11-7-12-8-17-12-17-14-8-7-12-11-21-21-5-6v-2h-2l-11-14-3-4v-2h-2l-9-13-9-14-8-13-16-28-8-16-11-27-7-17-8-26-6-25-5-27-4-34-1-22v-32l2-29 4-29 6-29 6-22 9-24 13-27 13-22 11-17 9-15 3 3 7 20 12 28 8 17 10 18 12 19 11 16 14 19 11 13 7 8 9 10 10 9 9 7h2l-8-20-10-32-9-37-3-16-4-26-3-25-2-41v-79l2-39 4-33 6-31 10-34 12-34 9-21 9-19 14-24 10-15 12-16 11-14 11-12 15-15 14-11 19-14 24-16z"
              fill="#FDCE65"
              transform="translate(760,867)"
            />
          </svg>
        </div>
        <span className={styles.academixRatioValue}>{academixRatioData}</span>
      </div>

      <svg
        className={`${styles.academixRatioArrow} ${styles[`academixRatioArrow_${theme}`]}`}
        xmlns="http://www.w3.org/2000/svg"
        width="9"
        height="15"
        viewBox="0 0 9 15"
        fill="none"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.21663 6.07858C8.49753 6.35983 8.65531 6.74108 8.65531 7.13858C8.65531 7.53608 8.49753 7.91733 8.21663 8.19858L2.56063 13.8566C2.27923 14.1378 1.89763 14.2958 1.49977 14.2957C1.10192 14.2956 0.72039 14.1375 0.439127 13.8561C0.157865 13.5747 -9.37265e-05 13.1931 4.17234e-08 12.7952C9.38099e-05 12.3974 0.158233 12.0158 0.439627 11.7346L5.03563 7.13858L0.439627 2.54258C0.166254 2.25981 0.0148813 1.88098 0.0181122 1.48768C0.0213432 1.09438 0.178919 0.718084 0.456901 0.43984C0.734883 0.161595 1.11103 0.00366479 1.50432 6.29798e-05C1.89762 -0.00353884 2.2766 0.147477 2.55963 0.420583L8.21763 6.07758L8.21663 6.07858Z"
          fill="currentColor"
        />
      </svg>
    </div>
  </div>
);
}