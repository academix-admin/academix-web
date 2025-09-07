'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './home-statistics.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserEngagementModel } from '@/models/user-engagement';
import CachedLottie from '@/components/CachedLottie';
import { ComponentStateProps } from '@/hooks/use-component-state';

export default function HomeStatistics({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();

  const [userEngagement, demandUserEngagement, setUserEngagement] = useDemandState<UserEngagementModel | null>(
    null,
    {
      key: "engagementData",
      persist: true,
      ttl: 3600,
      scope: "secondary_flow",
      deps: [lang, userData],
    }
  );

    useEffect(() => {
      if(!userEngagement){
          onStateChange?.('none');
      }else{
          onStateChange?.('data');
      }
    }, [userEngagement]);

  if (!userEngagement) return null;

  const questions = userEngagement.userEngagementProgressQuestions;
  const quiz = userEngagement.userEngagementProgressQuizCount;
  const time = userEngagement.userEngagementProgressTime;

  const wrapNumber = (number: number) => {
    if (number < 1000) {
      return number.toString();
    } else if (number < 1000000) {
      return `${(number / 1000).toFixed(1)}K`;
    } else if (number < 1000000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    } else {
      return `${(number / 1000000000).toFixed(1)}B`;
    }
  };

  const formatTime = (time: number) => {
    const milliseconds = Math.floor(time) * 1000;

    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={styles.statisticsContainer}>
      <h2 className={`${styles.statisticsTitle} ${styles[`statisticsTitle_${theme}`]}`}>
        {t('statistics_text')}
      </h2>

      <div className={styles.statisticsWrapper}>
        <div className={styles.statisticsGrid}>
          {/* Questions */}
          <div className={styles.statisticsCard}>
            <div className={styles.cardIcon}>
              <CachedLottie
                id="statistics-question"
                src="/assets/lottie/question_lottie_1.json"
                className={styles.lottieIcon}
                restoreProgress
              />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{t('questions_text')}</span>
              <span className={styles.cardValue}>{wrapNumber(questions)}</span>
            </div>
          </div>

          {/* Quizzes */}
          <div className={styles.statisticsCard}>
            <div className={styles.cardIcon}>
              <CachedLottie
                id="statistics-quiz"
                src="/assets/lottie/quiz_lottie_1.json"
                className={styles.lottieIcon}
                restoreProgress
              />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{t('quizzes_text')}</span>
              <span className={styles.cardValue}>{wrapNumber(quiz)}</span>
            </div>
          </div>

          {/* Time */}
          <div className={styles.statisticsCard}>
            <div className={styles.cardIcon}>
              <CachedLottie
                id="statistics-time"
                src="/assets/lottie/time_lottie_1.json"
                className={styles.lottieIcon}
                restoreProgress
              />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{t('time_text')}</span>
              <span className={styles.cardValue}>{formatTime(time)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}