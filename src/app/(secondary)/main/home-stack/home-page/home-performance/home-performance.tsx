'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './home-performance.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { DailyPerformanceModel } from '@/models/daily-performance';

export default function HomePerformance() {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();

  const [performanceData, demandPerformanceData, setPerformanceData] = useDemandState<DailyPerformanceModel | null>(
    null,
    {
      key: "performanceData",
      persist: true,
      ttl: 3600,
      scope: "secondary_flow",
      deps: [lang, userData],
    }
  );

  useEffect(() => {
    if(!userData)return;
    demandPerformanceData(async ({ get, set }) => {
      try {
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );
        if(!paramatical)return;
        const { data, error } = await supabaseBrowser.rpc("get_user_daily_performance", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;
        const dailyPerformance = new DailyPerformanceModel(data.user_daily_performance);

        if (data.status === "PerformanceStatus.success") {
          set(dailyPerformance);
        }
      } catch (err) {
        console.error("[HomePerformance] demand error:", err);
      }
    });
  }, [lang, userData, demandPerformanceData]);

  if (!performanceData) return null;

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString() + 'K';
  };

  return (
    <div className={styles.performanceContainer}>
        <h2 className={`${styles.performanceTitle} ${styles[`performanceTitle_${theme}`]}`}>
          {t('performance_text')}
        </h2>
      <div className={styles.performanceSection}>
        <div className={styles.performanceGrid}>
          <div className={styles.performanceItem}>
            <div className={styles.performanceContent}>
              <span className={styles.performanceLabel}>{t('quiz_text')}</span>
              <div className={styles.performanceValueContainer}>
                <span className={styles.performanceValue}>{performanceData.dailyPerformanceQuiz}</span>
                <div className={styles.performanceStatus}>
                  <svg width="16" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="#249E27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.performanceItem}>
            <div className={styles.performanceContent}>
              <span className={styles.performanceLabel}>{t('earning_text')}</span>
              <div className={styles.performanceValueContainer}>
                <span className={styles.performanceValue}>{formatValue(performanceData.dailyPerformanceEarnings)}</span>
                <div className={styles.performanceStatus}>
                  <svg width="16" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M6 12L10 8L6 4" stroke="#249E27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}