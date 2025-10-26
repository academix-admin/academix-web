'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-starter.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { TimelapseManager, useTimelapseManager, TimelapseType } from '@/lib/managers/TimelapseManager';

interface QuizStarterProps {
  title: string;
  challenge: string;
  mode: string;
  status: string;
  jobEndAt?: string;
  onContinueClick: () => void;
}

export default function QuizStarter({
  title,
  challenge,
  mode,
  status,
  jobEndAt,
  onContinueClick
}: QuizStarterProps) {
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

  const formatStatus = useCallback((status: string) => {
    switch (status) {
      case 'PoolJob.waiting':
        return t('waiting_time');
      case 'PoolJob.extended_waiting':
        return t('extended_time');
      case 'PoolJob.pool_period':
        return t('pool_time');
      case 'PoolJob.start_pool':
        return t('starting_time');
      case 'PoolJob.pool_ended':
        return t('quiz_closed');
      default:
        return t('open_quiz');
    }
  }, [t]);

  const getIsContinueEnabled = useCallback((): boolean => {
    if (!jobEndAt) return false;

    const currentTime = new Date();
    const endTime = new Date(jobEndAt);

    return (
      (status === 'PoolJob.pool_period' && currentTime < endTime) ||
      (status === 'PoolJob.start_pool' && currentTime >= endTime)
    );
  }, [status, jobEndAt]);

  return (
    <div className={styles.quizStarterCard}>
      {/* Title Section */}
      <div className={styles.titleSection}>
        <h1 className={`${styles.title} ${styles[`title_${theme}`]}`}>
          {title}
        </h1>
      </div>

      {/* Challenge Section */}
      <div className={styles.challengeSection}>
        <span className={`${styles.challenge} ${styles[`challenge_${theme}`]}`}>
          {challenge}
        </span>
      </div>

      {/* Mode Section */}
      <div className={styles.modeSection}>
        <span className={`${styles.mode} ${styles[`mode_${theme}`]}`}>
          {mode}
        </span>
      </div>

      {/* Timer Section */}
      <div className={styles.timerSection}>
        <div className={`${styles.timerContainer} ${styles[`timerContainer_${theme}`]}`}>
          <div className={styles.timerContent}>
            {/* Status Row */}
            <div className={styles.statusRow}>
              <span className={`${styles.status} ${styles[`status_${theme}`]}`}>
                {formatStatus(status)}
              </span>
            </div>

            {/* Timer Display */}
            <div className={styles.timerDisplay}>
              <div className={`${styles.timerValue} ${styles[`timerValue_${theme}`]}`}>
                {formatPlainTime(remainingTime)}
              </div>
              <div className={`${styles.remainingLabel} ${styles[`remainingLabel_${theme}`]}`}>
                {t('remaining')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className={styles.buttonSection}>
        <button
          className={styles.continueButton}
          onClick={onContinueClick}
          disabled={!getIsContinueEnabled()}
        >
          {t('continue')}
        </button>
      </div>
    </div>
  );
}