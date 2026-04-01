'use client';

import { useTheme } from '@/context/ThemeContext';
import styles from './tracker-section.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { QuizPool } from '@/models/user-display-quiz-topic-model';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { QuestionTrackerState } from '../page';

// Format time function
const formatPlainTime = (time: number | null) => {
  if (time == null || time <= 0) {
    return "-";
  }

  const totalMilliseconds = Math.round(time * 1000);
  const minutes = Math.floor(totalMilliseconds / (60 * 1000));
  const remainingMilliseconds = totalMilliseconds % (60 * 1000);
  const seconds = Math.floor(remainingMilliseconds / 1000);
  const milliseconds = remainingMilliseconds % 1000;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s ${milliseconds}ms`;
  } else if (seconds > 0) {
    return `${seconds}s ${milliseconds}ms`;
  } else {
    return `${milliseconds}ms`;
  }
};

// Show question text with masking for unattempted questions
const showQuestion = (question: string, status: string) => {
  if (status !== 'initial') {
    return question;
  }
  return '*'.repeat(question.length);
};

// Status badge component
const StatusBadge = ({ status, time, onRetry, canResubmit, questionId, questionStatus, options_selected }: {
  status: string;
  time: number | null | undefined;
  onRetry: (questionId: string) => void;
  canResubmit: boolean;
  questionId: string;
  questionStatus?: string | null;
  options_selected: string[];
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (status === 'loading') {
    return (
      <div className={`${styles.statusLoading} ${styles[`statusLoading_${theme}`]}`}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  if (status === 'error' || status === 'missed') {

    return (
      <button
        className={`${styles.retryButton} ${styles[`retryButton_${theme}`]} ${
          !canResubmit ? styles.retryButtonDisabled : ''
        }`}
        onClick={() => canResubmit && onRetry(questionId)}
        disabled={!canResubmit}
      >
        {capitalize(canResubmit ? t('save_text') : t('missed_text'))}
      </button>
    );
  }

  if (status === 'data') {
    return (
      <div className={`${styles.statusCompleted} ${styles[`statusCompleted_${theme}`]}`}>
        {options_selected.length > 0 && (
          <div className={styles.optionsSelected}>
            {options_selected.map((opt, i) => (
              <span key={i} className={`${styles.optionChip} ${styles[`optionChip_${theme}`]}`}>{opt}</span>
            ))}
          </div>
        )}
        <div className={styles.completedContent}>
          {questionStatus === 'Question.completed' && (
            <>
              <span style={{color: 'green'}}>{capitalize(t('correct_text'))}</span>
              <div className={`${styles.statusIndicator} ${styles.statusCorrect}`}>
                <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </>
          )}
          {questionStatus === 'Question.failed' && (
            <>
              <span style={{color: 'red'}}>{capitalize(t('failed_text'))}</span>
              <div className={`${styles.statusIndicator} ${styles.statusWrong}`}>
                <svg className={styles.statusIcon} viewBox="0 0 24 24" fill="white">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </div>
            </>
          )}
          {!questionStatus && (
            <span>{capitalize(t('completed_text'))}</span>
          )}
        </div>
        {time && (
          <div className={`${styles.timeBadge} ${styles[`timeBadge_${theme}`]}`}>
            <svg className={styles.timeIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <span>{formatPlainTime(time)}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// Individual question card component
const QuestionCard = ({
  question,
  index,
  status,
  time,
  onRetry,
  canResubmit,
  questionId,
  questionStatus,
  options_selected
}: {
  question: string;
  index: number;
  status: string;
  time: number | null | undefined;
  onRetry: (questionId: string) => void;
  canResubmit: boolean;
  questionId: string;
  questionStatus?: string | null;
  options_selected: string[];
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`${styles.questionCard} ${styles[`questionCard_${theme}`]}`}>
      <div className={styles.questionHeader}>
        <div className={`${styles.questionText} ${styles[`questionText_${theme}`]}`}>
          <span className={`${styles.questionNumber} ${styles[`questionNumber_${theme}`]}`}>
            {t('question_text_count', {count: index + 1})}
          </span>{" "}
          {showQuestion(question, status)}
        </div>
      </div>

      <div className={styles.questionStatus}>
        <StatusBadge
          status={status}
          time={time}
          onRetry={onRetry}
          canResubmit={canResubmit}
          questionId={questionId}
          questionStatus={questionStatus}
          options_selected={options_selected}
        />
      </div>
    </div>
  );
};

export default function TrackerSection ({
  trackerState,
  onRetry,
  size = 'mobile',
  containerClass
}: {
  trackerState: QuestionTrackerState[];
  onRetry: (questionId: string) => void;
  size?: 'mobile' | 'tablet' | 'web';
  containerClass: string;
}) {
  const { theme } = useTheme();

  const gridClasses = {
    mobile: styles.mobileGrid,
    tablet: styles.tabletGrid,
    web: styles.webGrid
  };

  return (
    <div className={`${containerClass} ${gridClasses[size]}`}>
      {trackerState.map((item, index) => (
        <QuestionCard
          key={item.questionId}
          question={item.question}
          index={index}
          status={item.status}
          time={item.time}
          onRetry={onRetry}
          canResubmit={item.canResubmit}
          questionId={item.questionId}
          questionStatus={item.questionStatus}
          options_selected={item.options_selected}
        />
      ))}
    </div>
  );
};