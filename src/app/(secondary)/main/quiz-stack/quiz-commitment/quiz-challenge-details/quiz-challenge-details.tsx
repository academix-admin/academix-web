'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-challenge-details.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { TimelapseManager, useTimelapseManager, TimelapseType } from '@/lib/managers/TimelapseManager';

interface QuizChallengeDetailsProps {
  poolsId: string;
  membersCount: number;
  minimumMembers: number;
  maximumMembers: number;
  fee: number;
  status: string;
  jobEndAt?: string;
}

export default function QuizChallengeDetails({
  poolsId,
  membersCount,
  minimumMembers,
  maximumMembers,
  fee,
  status,
  jobEndAt
}: QuizChallengeDetailsProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const timelapseManager = useTimelapseManager();

  const formatPlainTime = (time: number | null): string => {
    if (time === null || time <= 0) {
      return "-";
    }

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleTimeUpdate = useCallback((remaining: number) => {
    setRemainingTime(Math.floor(remaining / 1000)); // Convert to seconds
  }, []);

  useEffect(() => {
    if (!timelapseManager.current || !jobEndAt) return;

    const endTime = new Date(jobEndAt);
    const startTime = new Date();

    // Validate end time is in the future
    if (endTime <= startTime) {
      console.log('End time is in the past');
      return;
    }

    try {
      if (timelapseManager.current.isTimerInitialized) {
        // Reset existing timer with new parameters
        timelapseManager.current.reset();
        timelapseManager.current.setupLapse(startTime, endTime, TimelapseType.second);
        timelapseManager.current.addListener(handleTimeUpdate);
        timelapseManager.current.start();
      } else {
        // Initialize new timer
        timelapseManager.current.setupLapse(startTime, endTime, TimelapseType.second);
        timelapseManager.current.addListener(handleTimeUpdate);
        timelapseManager.current.start();
      }

      return () => {
        timelapseManager.current?.removeListener(handleTimeUpdate);
        timelapseManager.current?.pause();
      };
    } catch (error) {
      console.error('Quiz timer error:', error);
    }
  }, [jobEndAt, status, handleTimeUpdate]);


  const getMembersText = () => {
    if (maximumMembers > minimumMembers) {
      return t('minimum_members', {count: minimumMembers});
    } else {
      return t('maximum_members', {count: maximumMembers});
    }
  };

  return (
    <div className={styles.performanceCard}>
    <div className={`${styles.performanceItem} ${styles[`performanceItem_${theme}`]}`}>
      <h2 className={`${styles.details} ${styles[`details_${theme}`]}`}>
        {t('details_text')}
      </h2>

      <div className={styles.membersSection}>
        <div className={styles.membersCount}>
          <div className={styles.membersNumber}>{membersCount}</div>
          <div className={styles.membersLimit}>{getMembersText()}</div>
        </div>

          <div className={styles.membersButton}>
            <span className={styles.personIcon}>👤</span>
            <span className={styles.membersText}>{t('members_text')}</span>
            <span className={styles.arrowIcon}>→</span>
          </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>{t('entry_fee')}</div>
          <div className={styles.feeAmount}>
            <span className={styles.currencySymbol}>A</span>
            <span className={styles.feeNumber}>{fee}</span>
          </div>
        </div>

        <div className={styles.verticalDivider}></div>

        <div className={styles.detailItem}>
          <div className={styles.statusHeader}>
            <span className={styles.statusLabel}>{status}</span>
            {jobEndAt && (
              <span className={styles.infoIcon}>ℹ️</span>
            )}
          </div>
          <div className={styles.timer}>
            {formatPlainTime(remainingTime)}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}