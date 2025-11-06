'use client';

import { useTheme } from '@/context/ThemeContext';
import styles from './side-tracker.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { QuizPool } from '@/models/user-display-quiz-topic-model';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { QuestionTrackerState } from '../page';
import TrackerSection from '../tracker-section/tracker-section'

interface SideTrackerProps {
  trackerState: QuestionTrackerState[];
  onRetry: (questionId: string) => void;
  onExitClick: () => void;
}

// Web View
const WebView = ({
  trackerState,
  onRetry,
  onExitClick
}: SideTrackerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!trackerState) return null;

  return (
    <div className={`${styles.webQuizContainer} ${styles[`webQuizContainer_${theme}`]}`}>
      {/* Header */}
      <div className={`${styles.webQuizHeader} ${styles[`webQuizHeader_${theme}`]}`}>
        <div className={styles.trackerTextContainer}>
          <span className={`${styles.trackerText} ${styles[`trackerText_${theme}`]}`}>
            {t('tracker_text')}
          </span>
        </div>

        <button onClick={onExitClick} className={`${styles.webExitButton} ${styles[`webExitButton_${theme}`]}`}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6L18 18M6 18L18 6"
              stroke="#FF0000"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.webQuizBody}>
        <TrackerSection trackerState={trackerState} onRetry={onRetry} size="web"  containerClass={''} />
      </div>
    </div>
  );
};

// Tablet View
const TabletView = ({
  trackerState,
  onRetry,
  onExitClick
}: SideTrackerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!trackerState) return null;

  return (
    <div className={`${styles.tabletQuizContainer} ${styles[`tabletQuizContainer_${theme}`]}`}>
      {/* Header */}
      <div className={`${styles.tabletQuizHeader} ${styles[`tabletQuizHeader_${theme}`]}`}>
        <div className={styles.trackerTextContainer}>
          <span className={`${styles.trackerText} ${styles[`trackerText_${theme}`]}`}>
            {t('tracker_text')}
          </span>
        </div>

        <button onClick={onExitClick} className={`${styles.tabletExitButton} ${styles[`tabletExitButton_${theme}`]}`}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6L18 18M6 18L18 6"
              stroke="#FF0000"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.tabletQuizBody}>
        <TrackerSection trackerState={trackerState} onRetry={onRetry} size="tablet" containerClass={''} />
      </div>
    </div>
  );
};

// Mobile View
const MobileView = ({
  trackerState,
  onRetry,
  onExitClick
}: SideTrackerProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!trackerState) return null;

  return (
    <div className={styles.mobileQuizContainer}>
      {/* Header */}
      <div className={styles.mobileQuizHeader}>
        <div className={styles.trackerTextContainer}>
          <span className={`${styles.trackerText} ${styles[`trackerText_${theme}`]}`}>
            {t('tracker_text')}
          </span>
        </div>

        <button onClick={onExitClick} className={`${styles.mobileExitButton} ${styles[`mobileExitButton_${theme}`]}`}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6L18 18M6 18L18 6"
              stroke="#FF0000"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.mobileQuizBody}>
         <TrackerSection trackerState={trackerState} onRetry={onRetry} size="mobile"  containerClass={''}/>
      </div>
    </div>
  );
};

export default function SideTracker({ trackerState, onRetry, onExitClick }: SideTrackerProps) {
  return (
    <>
      {/* Web View */}
      <div className={styles.webOnly}>
        <WebView trackerState={trackerState} onRetry={onRetry} onExitClick={onExitClick} />
      </div>

      {/* Tablet View */}
      <div className={styles.tabletOnly}>
        <TabletView trackerState={trackerState} onRetry={onRetry} onExitClick={onExitClick} />
      </div>

      {/* Mobile View */}
      <div className={styles.mobileOnly}>
        <MobileView trackerState={trackerState} onRetry={onRetry} onExitClick={onExitClick} />
      </div>
    </>
  );
}