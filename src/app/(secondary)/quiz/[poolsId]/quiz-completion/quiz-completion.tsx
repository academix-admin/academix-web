'use client';

import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-completion.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { QuizPool } from '@/models/user-display-quiz-topic-model';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';

interface QuizCompletionProps {
  quizPool: QuizPool | null;
  clickMenu: () => void;
  clickExit: () => void;
  refreshLoading: boolean;
  clickContinueRefresh: () => void;
}


const StatusSection = ({
  quizPool,
  size = 'mobile'
}: {
  quizPool: QuizPool;
  size?: 'mobile' | 'tablet' | 'web';
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const containerClasses = {
    mobile: `${styles.mobileStatusContainer} ${styles[`mobileStatusContainer_${theme}`]}`,
    tablet: `${styles.tabletStatusContainer} ${styles[`tabletStatusContainer_${theme}`]}`,
    web: `${styles.webStatusContainer} ${styles[`webStatusContainer_${theme}`]}`
  };

  const isEnded = (endTime: string | null | undefined, job: string | null | undefined) => {
    if (!endTime) return false;
    const endDate = new Date(endTime);
    const now = new Date();
    return endDate < now && job === 'PoolJob.pool_ended';
  };

  const formatTime = (timeAt: string | null | undefined) => {
    if (!timeAt) return '-';
    // You can implement your date formatting logic here
    return new Date(timeAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const timestamps = [
    {
      label: isEnded(quizPool.poolsJobEndAt, quizPool.poolsJob)
        ? capitalize(t('ended_text'))
        : capitalize(t('ending_text')),
      value: formatTime(quizPool.poolsJobEndAt),
    },
    {
      label: capitalize(t('graded_text')),
      value: formatTime(quizPool.poolsGradedAt),
    },
    {
      label: capitalize(t('ranked_text')),
      value: formatTime(quizPool.poolsRankedAt),
    },
    {
      label: capitalize(t('rewarded_text')),
      value: formatTime(quizPool.poolsRewardedAt),
    },
    {
      label: capitalize(t('completed_text')),
      value: formatTime(quizPool.poolsCompletedAt),
    },
  ];

  const StatusRow = ({ label, value, showTopBorder = false }: { label: string; value: string; showTopBorder?: boolean }) => (
    <div className={`${styles.statusRow} ${showTopBorder ? styles.statusRowWithBorder : ''} ${styles[`statusRow_${theme}`]}`}>
      <div className={`${styles.statusLabel} ${styles[`statusLabel_${theme}`]}`}>
        {label}
      </div>
      <div className={`${styles.statusValue} ${styles[`statusValue_${theme}`]}`}>
        {value}
      </div>
    </div>
  );

  return (
    <div className={containerClasses[size]}>
      <div className={`${styles.statusTable} ${styles[`statusTable_${theme}`]}`}>
        {timestamps.map((timestamp, index) => (
          <StatusRow
            key={timestamp.label}
            label={timestamp.label}
            value={timestamp.value}
            showTopBorder={index !== 0}
          />
        ))}
      </div>
    </div>
  );
};

// Web View
const WebView = ({
  quizPool,
  clickMenu,
  clickExit,
  refreshLoading,
  clickContinueRefresh
}: QuizCompletionProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if(!quizPool)return null;

  return (
    <div className={`${styles.webQuizContainer} ${styles[`webQuizContainer_${theme}`]}`}>
      {/* Header */}
      <div className={`${styles.webQuizHeader} ${styles[`webQuizHeader_${theme}`]}`}>
        <div className={styles.webHeaderLeft}>
          <button onClick={clickMenu} className={`${styles.webMenuButton} ${styles[`webMenuButton_${theme}`]}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>

        <div className={styles.completionTextContainer}>
          <span className={`${styles.completionText} ${styles[`completionText_${theme}`]}`}>
            {t('completion_text')}
          </span>
        </div>

        <button onClick={clickExit} className={`${styles.webExitButton} ${styles[`webExitButton_${theme}`]}`}>
          <svg fill="none" height="22" viewBox="0 0 26 22" width="24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
              fill="#FF0000"
            />
          </svg>
        </button>
      </div>

      <div className={styles.webQuizBody}>
        <StatusSection quizPool={quizPool} size="web" />

        {/* Check Result Button with spacing */}
        <div className={styles.webButtonContainer}>
          <button
            className={styles.webCheckResultButton}
            onClick={clickContinueRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading
              ? <div className={styles.spinner}></div>
              : t(quizPool.poolsCompletedAt ? 'check_result_text' : 'refresh_text')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Tablet View
const TabletView = ({
  quizPool,
  clickMenu,
  clickExit,
  refreshLoading,
  clickContinueRefresh
}: QuizCompletionProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if(!quizPool)return null;

  return (
    <div className={`${styles.tabletQuizContainer} ${styles[`tabletQuizContainer_${theme}`]}`}>
      {/* Header */}
      <div className={`${styles.tabletQuizHeader} ${styles[`tabletQuizHeader_${theme}`]}`}>
        <div className={styles.tabletHeaderMain}>
          <button onClick={clickMenu} className={`${styles.tabletMenuButton} ${styles[`tabletMenuButton_${theme}`]}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>

        <div className={styles.completionTextContainer}>
          <span className={`${styles.completionText} ${styles[`completionText_${theme}`]}`}>
            {t('completion_text')}
          </span>
        </div>

        <button onClick={clickExit} className={`${styles.tabletExitButton} ${styles[`tabletExitButton_${theme}`]}`}>
          <svg fill="none" height="20" viewBox="0 0 26 22" width="22" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
              fill="#FF0000"
            />
          </svg>
        </button>
      </div>

      <div className={styles.tabletQuizBody}>
        <StatusSection quizPool={quizPool} size="tablet" />

        {/* Check Result Button with spacing */}
        <div className={styles.tabletButtonContainer}>
          <button
            className={`${styles.tabletCheckResultButton}`}
            onClick={clickContinueRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading
              ? <div className={styles.spinner}></div>
              : t(quizPool.poolsCompletedAt ? 'check_result_text' : 'refresh_text')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Mobile View
const MobileView = ({
  quizPool,
  clickMenu,
  clickExit,
  refreshLoading,
  clickContinueRefresh
}: QuizCompletionProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if(!quizPool)return null;

  return (
    <div className={styles.mobileQuizContainer}>
      {/* Header */}
      <div className={styles.mobileQuizHeader}>
        <button onClick={clickMenu} className={`${styles.mobileMenuButton} ${styles[`mobileMenuButton_${theme}`]}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>

        <div className={styles.completionTextContainer}>
          <span className={`${styles.completionText} ${styles[`completionText_${theme}`]}`}>
            {t('completion_text')}
          </span>
        </div>

        <button onClick={clickExit} className={`${styles.mobileExitButton} ${styles[`mobileExitButton_${theme}`]}`}>
          <svg fill="none" height="22" viewBox="0 0 26 22" width="24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className={styles.mobileQuizBody}>
         <StatusSection quizPool={quizPool} size="mobile" />
      </div>
      
      <div className={`${styles.mobileQuizFooter} ${styles[`mobileQuizFooter_${theme}`]}`}>
          <button
            className={`${styles.mobileCheckResultButton}`}
            onClick={clickContinueRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading
              ? <div className={styles.spinner}></div>
              : t(quizPool.poolsCompletedAt ? 'check_result_text' : 'refresh_text')}
          </button>
      </div>
    </div>
  );
};

export default function QuizCompletion({ quizPool, clickMenu, clickExit, refreshLoading, clickContinueRefresh }: QuizCompletionProps) {
  if(!quizPool)return null;
  return (
    <>
      {/* Web View */}
      <div className={styles.webOnly}>
        <WebView quizPool={quizPool} clickMenu={clickMenu} clickExit={clickExit} refreshLoading={refreshLoading} clickContinueRefresh={clickContinueRefresh} />
      </div>

      {/* Tablet View */}
      <div className={styles.tabletOnly}>
        <TabletView quizPool={quizPool} clickMenu={clickMenu} clickExit={clickExit} refreshLoading={refreshLoading} clickContinueRefresh={clickContinueRefresh} />
      </div>

      {/* Mobile View */}
      <div className={styles.mobileOnly}>
        <MobileView quizPool={quizPool} clickMenu={clickMenu} clickExit={clickExit} refreshLoading={refreshLoading} clickContinueRefresh={clickContinueRefresh} />
      </div>
    </>
  );
}