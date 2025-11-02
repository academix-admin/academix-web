'use client';

import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-timer.module.css';
import { useLanguage } from '@/context/LanguageContext';

interface QuizTimerProps {
  quizTimerValue: number;
}

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

// Common Timer Section Component
const TimerSection = ({
  quizTimerValue,
  size = 'mobile'
}: {
  quizTimerValue: number;
  size?: 'mobile' | 'tablet' | 'web';
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const containerClasses = {
    mobile: `${styles.mobileTimerContainer} ${styles[`mobileTimerContainer_${theme}`]}`,
    tablet: `${styles.tabletTimerContainer} ${styles[`tabletTimerContainer_${theme}`]}`,
    web: `${styles.webTimerContainer} ${styles[`webTimerContainer_${theme}`]}`
  };

  const timerValueClasses = {
    mobile: styles.mobileTimerValue,
    tablet: styles.tabletTimerValue,
    web: styles.webTimerValue
  };

  return (
    <div className={`${styles.timerSection} ${styles[`${size}TimerSection`]}`}>
      <div className={containerClasses[size]}>
        <div className={styles.timerContent}>
          {/* Status Row */}
          <div className={styles.statusRow}>
            <span className={`${styles.status} ${styles[`status_${theme}`]}`}>
              {t('ongoing_quiz')}
            </span>
          </div>

          {/* Timer Display */}
          <div className={styles.timerDisplay}>
            <div className={`${styles.timerValue} ${timerValueClasses[size]} ${styles[`timerValue_${theme}`]}`}>
              {formatPlainTime(quizTimerValue)}
            </div>
            <div className={`${styles.remainingLabel} ${styles[`remainingLabel_${theme}`]}`}>
              {t('remaining_time')}
            </div>
          </div>
        </div>
      </div>

      {/* Skip Button */}
      <div className={styles.skipButtonContainer}>
        <button className={styles.skipButton}>
          {t('skip_text')}
        </button>
      </div>
    </div>
  );
};

// Web View
const WebView = ({
  quizTimerValue
}: QuizTimerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`${styles.webQuizContainer} ${styles[`webQuizContainer_${theme}`]}`}>
      {/* Header */}
      <div className={`${styles.webQuizHeader} ${styles[`webQuizHeader_${theme}`]}`}>
        <div className={styles.webHeaderLeft}>
          <button className={`${styles.webMenuButton} ${styles[`webMenuButton_${theme}`]}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>

        <div className={styles.timerTextContainer}>
          <span className={`${styles.timerText} ${styles[`timerText_${theme}`]}`}>
            {t('timer_text')}
          </span>
        </div>

        <button className={`${styles.webExitButton} ${styles[`webExitButton_${theme}`]}`}>
          <svg fill="none" height="22" viewBox="0 0 26 22" width="24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
              fill="#FF0000"
            />
          </svg>
        </button>
      </div>

      {/* Timer Section - Centered with max width */}
      <div className={styles.webTimerWrapper}>
        <TimerSection quizTimerValue={quizTimerValue} size="web" />
      </div>
    </div>
  );
};

// Tablet View
const TabletView = ({
  quizTimerValue
}: QuizTimerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`${styles.tabletQuizContainer} ${styles[`tabletQuizContainer_${theme}`]}`}>
      {/* Header */}
      <div className={`${styles.tabletQuizHeader} ${styles[`tabletQuizHeader_${theme}`]}`}>
        <div className={styles.tabletHeaderMain}>
          <button className={`${styles.tabletMenuButton} ${styles[`tabletMenuButton_${theme}`]}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>

        <div className={styles.timerTextContainer}>
          <span className={`${styles.timerText} ${styles[`timerText_${theme}`]}`}>
            {t('timer_text')}
          </span>
        </div>

        <button className={`${styles.tabletExitButton} ${styles[`tabletExitButton_${theme}`]}`}>
          <svg fill="none" height="20" viewBox="0 0 26 22" width="22" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
              fill="#FF0000"
            />
          </svg>
        </button>
      </div>

      {/* Timer Section - Centered with max width */}
      <div className={styles.tabletTimerWrapper}>
        <TimerSection quizTimerValue={quizTimerValue} size="tablet" />
      </div>
    </div>
  );
};

// Mobile View
const MobileView = ({
  quizTimerValue
}: QuizTimerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.mobileQuizContainer}>
      {/* Header */}
      <div className={styles.mobileQuizHeader}>
        <button className={`${styles.mobileMenuButton} ${styles[`mobileMenuButton_${theme}`]}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>

        <div className={styles.timerTextContainer}>
          <span className={`${styles.timerText} ${styles[`timerText_${theme}`]}`}>
            {t('timer_text')}
          </span>
        </div>

        <button className={`${styles.mobileExitButton} ${styles[`mobileExitButton_${theme}`]}`}>
          <svg fill="none" height="22" viewBox="0 0 26 22" width="24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* Timer Section - Full width on mobile */}
      <TimerSection quizTimerValue={quizTimerValue} size="mobile" />
    </div>
  );
};

export default function QuizTimer({ quizTimerValue }: QuizTimerProps) {
  return (
    <>
      {/* Web View */}
      <div className={styles.webOnly}>
        <WebView quizTimerValue={quizTimerValue} />
      </div>

      {/* Tablet View */}
      <div className={styles.tabletOnly}>
        <TabletView quizTimerValue={quizTimerValue} />
      </div>

      {/* Mobile View */}
      <div className={styles.mobileOnly}>
        <MobileView quizTimerValue={quizTimerValue} />
      </div>
    </>
  );
}