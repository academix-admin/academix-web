'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './question-display.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { UserData } from '@/models/user-data';
import Image from 'next/image';
import { PoolQuestion, OptionModel } from '@/models/pool-question-model';

interface QuestionDisplayProps {
  question: PoolQuestion;
  getQuestionNumber: ()=>number;
  totalNumber: number;
  onAnswer: (questionId: string, optionId: string, answer?: string) => void;
  onSubmit: (questionId: string, timeTaken: number) => void;
}

interface BaseViewProps {
  question: PoolQuestion;
  getQuestionNumber: () => number;
  totalNumber: number;
  remainingTime: number;
  progress: number;
  hasSelectedOption: boolean;
  isSubmitting: boolean;
  handleManualSubmit: () => void;
  renderOptionType: (type: string, displayType?: DisplayType) => React.ReactNode;
}

interface UseQuestionTimerProps {
  questionId: string;
  timeLimit: number; // in seconds
  onTimeUp: () => void;
  autoStart?: boolean;
}

export const useQuestionTimer = ({
  questionId,
  timeLimit,
  onTimeUp,
  autoStart = true,
}: UseQuestionTimerProps) => {
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const [isActive, setIsActive] = useState(autoStart);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const startTimestampRef = useRef<number | null>(null);
  const pausedOffsetRef = useRef<number>(0); // time spent paused (ms)

  // Keep callback fresh
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const computeRemaining = useCallback(() => {
    if (!startTimestampRef.current) return timeLimit;
    const now = Date.now();
    const elapsed = Math.floor((now - startTimestampRef.current - pausedOffsetRef.current) / 1000);
    return Math.max(timeLimit - elapsed, 0);
  }, [timeLimit]);

  const tick = useCallback(() => {
    const remaining = computeRemaining();
    setRemainingTime(remaining);

    if (remaining <= 0) {
      clearTimer();
      setIsActive(false);
      setIsTimeUp(true);
      onTimeUpRef.current();
    }
  }, [computeRemaining, clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    setIsActive(true);
    setIsTimeUp(false);
    setRemainingTime(timeLimit);

    startTimestampRef.current = Date.now();
    pausedOffsetRef.current = 0;

    intervalRef.current = setInterval(tick, 1000);
  }, [timeLimit, clearTimer, tick]);

  const pauseTimer = useCallback(() => {
    if (!isActive) return;
    setIsActive(false);
    clearTimer();

    // Record paused offset
    if (startTimestampRef.current) {
      pausedOffsetRef.current += Date.now() - (startTimestampRef.current + pausedOffsetRef.current);
    }
  }, [isActive, clearTimer]);

  const resumeTimer = useCallback(() => {
    if (isActive || isTimeUp || remainingTime <= 0) return;
    setIsActive(true);

    // Adjust start time so total elapsed remains correct
    startTimestampRef.current = Date.now() - pausedOffsetRef.current;
    intervalRef.current = setInterval(tick, 1000);
  }, [isActive, isTimeUp, remainingTime, tick]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setIsActive(autoStart);
    setIsTimeUp(false);
    setRemainingTime(timeLimit);
    pausedOffsetRef.current = 0;
    startTimestampRef.current = autoStart ? Date.now() : null;

    if (autoStart) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [timeLimit, autoStart, clearTimer, tick]);

  // Auto start/reset when questionId changes
  useEffect(() => {
    resetTimer();
    return () => clearTimer();
  }, [questionId, resetTimer, clearTimer]);

  // Background tab visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        // When returning to foreground, re-sync immediately
        tick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive, tick]);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  const progress = (remainingTime / timeLimit) * 100;

  return {
    remainingTime,
    isActive,
    isTimeUp,
    progress,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    clearTimer,
  };
};


// Types
type DisplayType = 'mobile' | 'tablet' | 'web';

// True/False Component
const TrueFalseComponent = ({
  optionData,
  optionSelection,
  displayType = 'mobile'
}: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
  displayType?: DisplayType;
}) => {
  const { theme } = useTheme();

  const getContainerClass = () => {
    switch (displayType) {
      case 'web': return styles.trueFalseContainerWeb;
      case 'tablet': return styles.trueFalseContainerTablet;
      case 'mobile':
      default: return styles.mobileTrueFalseContainer;
    }
  };

  const getButtonClass = () => {
    const baseClass = displayType === 'web' ? styles.trueFalseButtonWeb :
                     displayType === 'tablet' ? styles.trueFalseButtonTablet :
                     styles.mobileTrueFalseButton;

    return `${baseClass} ${styles[`trueFalseButton_${theme}`]}`;
  };

  const getTextClass = () => {
    switch (displayType) {
      case 'web': return styles.trueFalseTextWeb;
      case 'tablet': return styles.trueFalseTextTablet;
      case 'mobile':
      default: return styles.mobileTrueFalseText;
    }
  };

  const getIndicatorClass = () => {
    switch (displayType) {
      case 'web': return styles.selectionIndicatorWeb;
      case 'tablet': return styles.selectionIndicatorTablet;
      case 'mobile':
      default: return styles.mobileSelectionIndicator;
    }
  };

  return (
    <div className={getContainerClass()}>
      {optionData.map((option) => (
        <button
          key={option.optionsId}
          className={`${getButtonClass()} ${option.optionSelected ? styles.trueFalseSelected : ''}`}
          onClick={() => optionSelection(option.optionsId, option.optionsIdentity)}
        >
          <span className={getTextClass()}>
            {option.optionsIdentity}
          </span>
          {option.optionSelected && (
            <svg
              className={getIndicatorClass()}
              fill="none"
              height="24"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                clipRule="evenodd"
                d="M2.25 0C1.65326 0 1.08097 0.237053 0.65901 0.65901C0.237053 1.08097 0 1.65326 0 2.25V6.75C0 7.34674 0.237053 7.91903 0.65901 8.34099C1.08097 8.76295 1.65326 9 2.25 9H6.75C7.34674 9 7.91903 8.76295 8.34099 8.34099C8.76295 7.91903 9 7.34674 9 6.75V2.25C9 1.65326 8.76295 1.08097 8.34099 0.65901C7.91903 0.237053 7.34674 0 6.75 0H2.25ZM6.1785 3.9078C6.21892 3.86466 6.25045 3.81398 6.27128 3.75866C6.29212 3.70333 6.30185 3.64445 6.29993 3.58536C6.29801 3.52628 6.28447 3.46815 6.26008 3.4143C6.23569 3.36044 6.20094 3.31192 6.1578 3.2715C6.11466 3.23108 6.06398 3.19955 6.00866 3.17872C5.95333 3.15788 5.89445 3.14815 5.83536 3.15007C5.77628 3.15199 5.71815 3.16553 5.6643 3.18992C5.61044 3.21431 5.56192 3.24906 5.5215 3.2922L4.13415 4.7727L3.4488 4.16385C3.35901 4.0892 3.24371 4.05238 3.12727 4.06117C3.01084 4.06995 2.90237 4.12365 2.8248 4.21093C2.74722 4.2982 2.7066 4.41222 2.71153 4.52888C2.71646 4.64555 2.76654 4.75573 2.8512 4.83615L3.8637 5.73615C3.95131 5.81397 4.06582 5.85455 4.18288 5.84926C4.29994 5.84396 4.41032 5.79321 4.49055 5.7078L6.1785 3.9078Z"
                fill="orange"
                fillRule="evenodd"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
};

// Multiple Choice Component
const MultipleChoiceComponent = ({
  optionData,
  optionSelection,
  displayType = 'mobile'
}: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
  displayType?: DisplayType;
}) => {
  const { theme } = useTheme();

  const getContainerClass = () => {
    switch (displayType) {
      case 'web': return styles.multipleChoiceContainerWeb;
      case 'tablet': return styles.multipleChoiceContainerTablet;
      case 'mobile':
      default: return styles.mobileMultipleChoiceContainer;
    }
  };

  const getOptionClass = () => {
    const baseClass = displayType === 'web' ? styles.multipleChoiceOptionWeb :
                     displayType === 'tablet' ? styles.multipleChoiceOptionTablet :
                     styles.mobileMultipleChoiceOption;

    return `${baseClass} ${styles[`multipleChoiceOption_${theme}`]}`;
  };

  const getImageContainerClass = () => {
    switch (displayType) {
      case 'web': return styles.optionImageContainerWeb;
      case 'tablet': return styles.optionImageContainerTablet;
      case 'mobile':
      default: return styles.mobileOptionImageContainer;
    }
  };

  const getImageClass = () => {
    switch (displayType) {
      case 'web': return styles.optionImageWeb;
      case 'tablet': return styles.optionImageTablet;
      case 'mobile':
      default: return styles.mobileOptionImage;
    }
  };

  const getTextClass = () => {
    switch (displayType) {
      case 'web': return styles.optionTextWeb;
      case 'tablet': return styles.optionTextTablet;
      case 'mobile':
      default: return styles.mobileOptionText;
    }
  };

  const getIndicatorClass = () => {
    switch (displayType) {
      case 'web': return styles.selectionIndicatorWeb;
      case 'tablet': return styles.selectionIndicatorTablet;
      case 'mobile':
      default: return styles.mobileSelectionIndicator;
    }
  };

  const getImageSize = () => {
    switch (displayType) {
      case 'web': return { width: 60, height: 60 };
      case 'tablet': return { width: 50, height: 50 };
      case 'mobile':
      default: return { width: 50, height: 50 };
    }
  };

  const imageSize = getImageSize();

  return (
    <div className={getContainerClass()}>
      {optionData.map((option) => (
        <div
          key={option.optionsId}
          className={`${getOptionClass()} ${option.optionSelected ? styles.multipleChoiceSelected : ''}`}
          onClick={() => optionSelection(option.optionsId, option.optionsIdentity)}
        >
          {option.optionsImage && (
            <div className={getImageContainerClass()}>
              <Image
                src={option.optionsImage}
                alt="Option visual"
                width={imageSize.width}
                height={imageSize.height}
                className={getImageClass()}
              />
            </div>
          )}
          <span className={getTextClass()}>{option.optionsIdentity}</span>
          {option.optionSelected && (
            <svg
              className={getIndicatorClass()}
              fill="none"
              height="24"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                clipRule="evenodd"
                d="M2.25 0C1.65326 0 1.08097 0.237053 0.65901 0.65901C0.237053 1.08097 0 1.65326 0 2.25V6.75C0 7.34674 0.237053 7.91903 0.65901 8.34099C1.08097 8.76295 1.65326 9 2.25 9H6.75C7.34674 9 7.91903 8.76295 8.34099 8.34099C8.76295 7.91903 9 7.34674 9 6.75V2.25C9 1.65326 8.76295 1.08097 8.34099 0.65901C7.91903 0.237053 7.34674 0 6.75 0H2.25ZM6.1785 3.9078C6.21892 3.86466 6.25045 3.81398 6.27128 3.75866C6.29212 3.70333 6.30185 3.64445 6.29993 3.58536C6.29801 3.52628 6.28447 3.46815 6.26008 3.4143C6.23569 3.36044 6.20094 3.31192 6.1578 3.2715C6.11466 3.23108 6.06398 3.19955 6.00866 3.17872C5.95333 3.15788 5.89445 3.14815 5.83536 3.15007C5.77628 3.15199 5.71815 3.16553 5.6643 3.18992C5.61044 3.21431 5.56192 3.24906 5.5215 3.2922L4.13415 4.7727L3.4488 4.16385C3.35901 4.0892 3.24371 4.05238 3.12727 4.06117C3.01084 4.06995 2.90237 4.12365 2.8248 4.21093C2.74722 4.2982 2.7066 4.41222 2.71153 4.52888C2.71646 4.64555 2.76654 4.75573 2.8512 4.83615L3.8637 5.73615C3.95131 5.81397 4.06582 5.85455 4.18288 5.84926C4.29994 5.84396 4.41032 5.79321 4.49055 5.7078L6.1785 3.9078Z"
                fill="orange"
                fillRule="evenodd"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
};

// Slider Component
const SliderComponent = ({
  optionData,
  optionSelection,
  displayType = 'mobile'
}: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
  displayType?: DisplayType;
}) => {
  const [sliderValue, setSliderValue] = useState(50);
  const { theme } = useTheme();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);
    if (optionData[0]) {
      optionSelection(optionData[0].optionsId, value.toString());
    }
  };

  const getContainerClass = () => {
    switch (displayType) {
      case 'web': return styles.sliderContainerWeb;
      case 'tablet': return styles.sliderContainerTablet;
      case 'mobile':
      default: return styles.mobileSliderContainer;
    }
  };

  const getSliderClass = () => {
    const baseClass = displayType === 'web' ? styles.sliderWeb :
                     displayType === 'tablet' ? styles.sliderTablet :
                     styles.mobileSlider;

    return `${baseClass} ${styles[`slider_${theme}`]}`;
  };

  const getLabelsClass = () => {
    switch (displayType) {
      case 'web': return styles.sliderLabelsWeb;
      case 'tablet': return styles.sliderLabelsTablet;
      case 'mobile':
      default: return styles.mobileSliderLabels;
    }
  };

  return (
    <div className={getContainerClass()}>
      <input
        type="range"
        min={optionData[0]?.optionsMin || 0}
        max={optionData[0]?.optionsMax || 100}
        value={sliderValue}
        onChange={handleSliderChange}
        className={getSliderClass()}
      />
      <div className={getLabelsClass()}>
        <span>{optionData[0]?.optionsMin || 0}</span>
        <span className={styles.sliderCurrentValue}>{sliderValue}</span>
        <span>{optionData[0]?.optionsMax || 100}</span>
      </div>
    </div>
  );
};

// Fill Gap Component
const FillGapComponent = ({
  optionData,
  optionSelection,
  displayType = 'mobile'
}: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
  displayType?: DisplayType;
}) => {
  const [answer, setAnswer] = useState('');
  const { theme } = useTheme();

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAnswer(value);
    if (optionData[0]) {
      optionSelection(optionData[0].optionsId, value);
    }
  };

  const getContainerClass = () => {
    switch (displayType) {
      case 'web': return styles.fillGapContainerWeb;
      case 'tablet': return styles.fillGapContainerTablet;
      case 'mobile':
      default: return styles.mobileFillGapContainer;
    }
  };

  const getInputClass = () => {
    const baseClass = displayType === 'web' ? styles.fillGapInputWeb :
                     displayType === 'tablet' ? styles.fillGapInputTablet :
                     styles.mobileFillGapInput;

    return `${baseClass} ${styles[`fillGapInput_${theme}`]}`;
  };

  return (
    <div className={getContainerClass()}>
      <input
        type="text"
        value={answer}
        onChange={handleAnswerChange}
        placeholder="Type your answer here..."
        className={getInputClass()}
      />
    </div>
  );
};

// Question Type Icons with proper sizing
const QuestionTypeIcon = ({ type }: { type: string }) => {
  const getIconSize = (type: string) => {
    switch (type) {
      case 'QuestionType.true_false':
        return { width: 20, height: 20 };
      case 'QuestionType.multiple_choice':
        return { width: 20, height: 20 };
      case 'QuestionType.one_choice':
        return { width: 16, height: 16 };
      case 'QuestionType.slider':
        return { width: 20, height: 20 };
      case 'QuestionType.fill_gap':
        return { width: 20, height: 20 };
      default:
        return { width: 16, height: 16 };
    }
  };

  const size = getIconSize(type);

  switch (type) {
    case 'QuestionType.true_false':
      return (
        <svg
          fill="none"
          height={size.height}
          width={size.width}
          viewBox="0 0 114 63"
          xmlns="http://www.w3.org/2000/svg"
          style={{ minWidth: size.width, minHeight: size.height }}
        >
          <rect fill="#1C6B1E" height="63" rx="31.5" width="113.4" x="0.299805" />
          <rect fill="#2DAB31" height="56.7" rx="24.5" width="105.84" x="4.08008" y="3.78003" />
          <circle cx="32.4301" cy="32.13" fill="white" r="28.35" />
          <circle cx="31.8001" cy="32.76" fill="#1C6B1E" r="22.68" />
          <path d="M34.1204 41.6H29.4681V26.8812H24.8743V24.725H38.7142V26.8812H34.1204V41.6Z" fill="white" />
          <path d="M86.5247 41.6H81.8724V24.725H93.9896V26.8812H86.5247V32.0961H92.2904V34.2406H86.5247V41.6Z" fill="white" fillOpacity="0.68" />
        </svg>
      );
    case 'QuestionType.multiple_choice':
      return (
        <svg
          fill="none"
          height={size.height}
          width={size.width}
          viewBox="0 0 105 104"
          xmlns="http://www.w3.org/2000/svg"
          style={{ minWidth: size.width, minHeight: size.height }}
        >
          <path d="M0 16C0 7.16346 7.16345 0 16 0H44.6229C47.3843 0 49.6229 2.23858 49.6229 5V43.8398C49.6229 46.6012 47.3843 48.8398 44.6229 48.8398H5C2.23857 48.8398 0 46.6012 0 43.8398V16Z" fill="#1C6B1E" />
          <path d="M54.877 5.00001C54.877 2.23858 57.1155 0 59.877 0H88.4999C97.3364 0 104.5 7.16344 104.5 16V43.8398C104.5 46.6012 102.261 48.8398 99.4999 48.8398H59.877C57.1155 48.8398 54.877 46.6012 54.877 43.8398V5.00001Z" fill="#1C6B1E" />
          <path d="M54.877 60.1603C54.877 57.3989 57.1155 55.1603 59.877 55.1603H99.4999C102.261 55.1603 104.5 57.3989 104.5 60.1603V88C104.5 96.8366 97.3364 104 88.4999 104H59.877C57.1155 104 54.877 101.761 54.877 99.0001V60.1603Z" fill="#1C6B1E" />
          <path d="M0 60.1603C0 57.3989 2.23858 55.1603 5 55.1603H44.6229C47.3843 55.1603 49.6229 57.3989 49.6229 60.1603V99.0001C49.6229 101.761 47.3843 104 44.6229 104H16C7.16344 104 0 96.8366 0 88.0001V60.1603Z" fill="#1C6B1E" />
          <path d="M32.9453 22.9258V23.1484C32.9297 23.8047 32.8594 24.4844 32.7344 25.1875C32.6172 25.8906 32.4492 26.5938 32.2305 27.2969C32.0117 28 31.75 28.6953 31.4453 29.3828C31.1406 30.0703 30.7969 30.7266 30.4141 31.3516C30.0391 31.9844 29.6328 32.5742 29.1953 33.1211C28.7578 33.6758 28.2969 34.1641 27.8125 34.5859L26.0664 33.5781C26.3399 33.1172 26.586 32.6133 26.8047 32.0664C27.0313 31.5273 27.2344 30.9609 27.4141 30.3672C27.5938 29.7734 27.7461 29.1641 27.8711 28.5391C28.0039 27.9141 28.1133 27.293 28.1992 26.6758C28.2852 26.0586 28.3477 25.4531 28.3867 24.8594C28.4336 24.2578 28.4571 23.6875 28.4571 23.1484C28.4571 22.7266 28.4531 22.25 28.4453 21.7188C28.4453 21.1797 28.4141 20.6328 28.3516 20.0781C28.2969 19.5234 28.2031 18.9844 28.0703 18.4609C27.9375 17.9297 27.7383 17.457 27.4727 17.043C27.2149 16.6289 26.8789 16.2969 26.4649 16.0469C26.0586 15.7969 25.5508 15.6719 24.9414 15.6719C24.4024 15.6719 23.9375 15.7656 23.5469 15.9531C23.1641 16.1328 22.836 16.3789 22.5625 16.6914C22.2969 16.9961 22.0821 17.3516 21.918 17.7578C21.7617 18.1641 21.6367 18.5938 21.543 19.0469C21.4571 19.4922 21.3985 19.9453 21.3672 20.4062C21.3438 20.8594 21.3321 21.2891 21.3321 21.6953V24.9648H26.3828V26.8984H21.3321V31H16.6797V22.4219C16.6797 21.1953 16.875 20.0547 17.2656 19C17.6563 17.9453 18.2071 17.0312 18.918 16.2578C19.6367 15.4766 20.4961 14.8672 21.4961 14.4297C22.5039 13.9844 23.625 13.7617 24.8594 13.7617C25.6953 13.7617 26.4766 13.8828 27.2031 14.125C27.9375 14.3594 28.6055 14.6875 29.2071 15.1094C29.8086 15.5234 30.3438 16.0195 30.8125 16.5977C31.2891 17.168 31.6836 17.793 31.9961 18.4727C32.3164 19.1523 32.5586 19.8711 32.7227 20.6289C32.8867 21.3867 32.961 22.1523 32.9453 22.9258Z" fill="white" />
          <path d="M88.0567 22.5391C88.0567 23.3594 87.9473 24.1406 87.7285 24.8828C87.5098 25.6172 87.2012 26.2969 86.8028 26.9219C86.4121 27.5469 85.9434 28.1133 85.3965 28.6211C84.8496 29.1211 84.2442 29.5469 83.5801 29.8984C82.9238 30.25 82.2168 30.5234 81.459 30.7188C80.709 30.9062 79.9356 31 79.1387 31H71.6973V14.125H79.1387C79.9356 14.125 80.709 14.2188 81.459 14.4062C82.209 14.5938 82.9121 14.8633 83.5684 15.2148C84.2324 15.5586 84.8379 15.9805 85.3848 16.4805C85.9395 16.9805 86.4121 17.543 86.8028 18.168C87.2012 18.7852 87.5098 19.4648 87.7285 20.207C87.9473 20.9414 88.0567 21.7188 88.0567 22.5391ZM83.334 22.5391C83.334 21.625 83.2207 20.7578 82.9942 19.9375C82.7754 19.1094 82.4317 18.3828 81.9629 17.7578C81.4942 17.1328 80.8965 16.6367 80.1699 16.2695C79.4512 15.9023 78.5879 15.7188 77.5801 15.7188H76.3496V29.3594H77.5801C78.5723 29.3594 79.4278 29.1758 80.1465 28.8086C80.8731 28.4336 81.4707 27.9336 81.9395 27.3086C82.416 26.6758 82.7676 25.9492 82.9942 25.1289C83.2207 24.3086 83.334 23.4453 83.334 22.5391Z" fill="white" />
          <path d="M32.8047 81.5782C32.8047 82.0548 32.7266 82.5001 32.5703 82.9142C32.4141 83.3282 32.1992 83.7072 31.9258 84.0509C31.6524 84.3868 31.3321 84.6876 30.9649 84.9532C30.6055 85.2189 30.2149 85.4415 29.793 85.6212C29.3789 85.8009 28.9492 85.9376 28.5039 86.0314C28.0586 86.1173 27.6211 86.1603 27.1914 86.1603H17.2656V69.2853H26.336C26.7344 69.2853 27.1524 69.3165 27.5899 69.379C28.0274 69.4337 28.4531 69.5236 28.8672 69.6486C29.2891 69.7736 29.6875 69.9376 30.0625 70.1407C30.4453 70.3439 30.7774 70.5939 31.0586 70.8907C31.3477 71.1798 31.5742 71.5157 31.7383 71.8986C31.9102 72.2814 31.9961 72.7189 31.9961 73.2111C31.9961 73.6798 31.9024 74.1056 31.7149 74.4884C31.5274 74.8712 31.2735 75.215 30.9531 75.5197C30.6406 75.8165 30.2774 76.0822 29.8633 76.3165C29.4571 76.5431 29.0274 76.7423 28.5742 76.9142C29.1446 77.0704 29.6836 77.2775 30.1914 77.5353C30.7071 77.7931 31.1563 78.1095 31.5391 78.4845C31.9297 78.8595 32.2383 79.3048 32.4649 79.8204C32.6914 80.3282 32.8047 80.9142 32.8047 81.5782ZM27.2735 73.6212C27.2735 72.6681 27.0196 71.9728 26.5117 71.5353C26.0117 71.0978 25.2969 70.879 24.3672 70.879H21.918V76.3517H23.9688C24.3906 76.3517 24.8008 76.3009 25.1992 76.1993C25.5977 76.09 25.9492 75.9259 26.2539 75.7072C26.5664 75.4806 26.8125 75.1954 26.9922 74.8517C27.1797 74.5079 27.2735 74.0978 27.2735 73.6212ZM28.0938 81.2853C28.0938 80.8243 28.0352 80.3947 27.918 79.9962C27.8008 79.59 27.6211 79.2423 27.3789 78.9532C27.1367 78.6564 26.8321 78.4259 26.4649 78.2618C26.1055 78.09 25.6797 78.004 25.1875 78.004H21.918V84.5197H24.7774C25.2539 84.5197 25.6953 84.4415 26.1016 84.2853C26.5078 84.129 26.8594 83.9103 27.1563 83.629C27.4531 83.3478 27.6836 83.0079 27.8477 82.6095C28.0117 82.2111 28.0938 81.7697 28.0938 81.2853Z" fill="white" />
          <path d="M87.6113 73.4689L85.6074 74.3126C85.4512 73.8048 85.2403 73.34 84.9746 72.9181C84.7168 72.4962 84.4043 72.1368 84.0371 71.84C83.6778 71.5353 83.2676 71.3009 82.8067 71.1368C82.3457 70.965 81.8418 70.879 81.2949 70.879C80.709 70.879 80.1699 70.9767 79.6778 71.172C79.1934 71.3595 78.7559 71.6212 78.3653 71.9572C77.9824 72.2931 77.6465 72.6837 77.3574 73.129C77.0684 73.5743 76.8262 74.0509 76.6309 74.5587C76.4356 75.0587 76.291 75.5782 76.1973 76.1173C76.1035 76.6564 76.0567 77.1837 76.0567 77.6993C76.0567 78.5197 76.1504 79.3361 76.3379 80.1486C76.5332 80.9611 76.8379 81.6915 77.252 82.34C77.6738 82.9884 78.2168 83.5157 78.8809 83.922C79.5449 84.3204 80.3496 84.5197 81.2949 84.5197C81.7949 84.5197 82.2676 84.4376 82.7129 84.2736C83.1582 84.1017 83.5606 83.8712 83.9199 83.5822C84.2871 83.2853 84.6074 82.9376 84.8809 82.5392C85.1543 82.1407 85.3731 81.7111 85.5371 81.2501L87.5645 82.0587C87.2676 82.8009 86.8613 83.4532 86.3457 84.0157C85.8301 84.5704 85.2403 85.0314 84.5762 85.3986C83.9199 85.7657 83.2129 86.0392 82.4551 86.2189C81.7051 86.4064 80.9473 86.5001 80.1817 86.5001C79.3535 86.5001 78.5567 86.3986 77.791 86.1954C77.0332 85.9923 76.3262 85.7032 75.6699 85.3282C75.0137 84.9532 74.416 84.5001 73.877 83.9689C73.3457 83.4376 72.8887 82.8478 72.5059 82.1993C72.1309 81.5509 71.8379 80.8478 71.627 80.09C71.4238 79.3243 71.3223 78.5275 71.3223 77.6993C71.3223 76.8712 71.4238 76.0782 71.627 75.3204C71.8379 74.5548 72.1309 73.8478 72.5059 73.1993C72.8887 72.5431 73.3457 71.9493 73.877 71.4181C74.416 70.8868 75.0137 70.4337 75.6699 70.0587C76.3262 69.6837 77.0332 69.3947 77.791 69.1915C78.5567 68.9884 79.3535 68.8868 80.1817 68.8868C80.9785 68.8868 81.7559 68.9806 82.5137 69.1681C83.2793 69.3556 83.9903 69.6407 84.6465 70.0236C85.3028 70.3986 85.8848 70.8751 86.3926 71.4532C86.9082 72.0236 87.3145 72.6954 87.6113 73.4689Z" fill="white" />
        </svg>
      );
    case 'QuestionType.one_choice':
      return (
        <svg width={size.width} height={size.height} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
    case 'QuestionType.slider':
      return (
        <svg
          fill="none"
          height={size.height}
          width={size.width}
          viewBox="0 0 108 63"
          xmlns="http://www.w3.org/2000/svg"
          style={{ minWidth: size.width, minHeight: size.height }}
        >
          <rect fill="#1C6B1E" height="63" rx="16" width="106.981" x="0.509766" />
          <rect fill="white" fillOpacity="0.68" height="6.19672" rx="3.09836" width="99.3396" x="4.33008" y="27.8854" />
          <rect fill="white" height="35.6604" rx="7.72642" width="15.4528" x="19.5283" y="15.4529" />
        </svg>
      );
    case 'QuestionType.fill_gap':
      return (
        <svg
          fill="none"
          height={size.height}
          width={size.width}
          viewBox="0 0 102 143"
          xmlns="http://www.w3.org/2000/svg"
          style={{ minWidth: size.width, minHeight: size.height }}
        >
          <rect fill="#1C6B1E" height="106.474" rx="8" width="101.688" y="36.3868" />
          <path d="M95.0061 13.939C93.9934 10.3646 92.0705 7.11029 89.4233 4.49061C86.776 1.87093 85.7161 1.32265 82.1162 0.332596C81.061 0.0738301 80.3004 0.073895 79.2452 0.332661C78.2223 0.647498 76.6192 0.719037 75.8556 1.46532L68.9131 9.09452L15.8183 62.2095C14.8108 63.1291 11.8658 67.6576 11.6872 69.0057L10.3455 76.0664C10.1952 77.0318 10.2799 78.0189 10.5926 78.945C10.9104 79.8647 11.4294 80.7072 12.1109 81.4023C12.7888 82.1044 13.6221 82.631 14.5472 82.9469C15.2133 83.1575 15.896 83.2629 16.5951 83.2629C16.8893 83.298 17.1836 83.298 17.4778 83.2629L28.2469 80.3328C29.5677 80.0934 31.7812 78.9743 32.7664 78.0674L92.2851 19.179C93.0229 18.4161 94.757 17.2042 95.0634 16.1906C95.3529 15.1611 95.2259 14.9853 95.0061 13.939ZM89.8157 15.6942C89.7776 15.8662 89.2508 15.6942 89.5685 16.1506L83.6014 19.179L75.6923 10.1174L80.2118 4.86343C80.3421 4.73739 80.2032 4.92234 80.3751 4.86344C80.514 4.82777 81.3417 4.86343 81.3417 4.86343C84.0088 5.6045 83.6882 6.39511 85.6588 8.32972C87.6293 10.2643 88.4718 10.8733 89.2508 13.5155C89.2631 13.6453 89.8514 15.5688 89.8157 15.6942ZM69.6991 95.058H11.6872C10.9849 95.058 10.3113 94.7806 9.81468 94.2869C9.31806 93.7931 9.03906 93.1235 9.03906 92.4252C9.03906 91.7269 9.31806 91.0572 9.81468 90.5635C10.3113 90.0697 10.9849 89.7923 11.6872 89.7923H69.6638C70.3661 89.7923 71.0396 90.0697 71.5363 90.5635C72.0329 91.0572 72.3119 91.7269 72.3119 92.4252C72.3119 93.1235 72.0329 93.7931 71.5363 94.2869C71.0396 94.7806 70.3661 95.058 69.6638 95.058H69.6991Z" fill="white" />
          <path d="M89.3659 4.4906C92.0132 7.11028 93.936 10.3646 94.9487 13.939C95.1685 14.9853 95.2955 15.1611 95.0061 16.1906C94.6996 17.2042 92.9655 18.4161 92.2277 19.179L74.8931 36.3868H41.6311L68.8557 9.09451L75.7982 1.46531C76.5619 0.719029 78.165 0.647489 79.1878 0.332653C80.2431 0.0738863 81.0037 0.0738258 82.0589 0.332592C85.6587 1.32265 86.7186 1.87093 89.3659 4.4906Z" fill="#4E9E50" fillOpacity="0.51" />
          <rect fill="white" height="5.21045" rx="2.3" width="72.3118" x="9.03906" y="99.8185" />
          <rect fill="white" height="5.21045" rx="2.3" width="81.3508" x="9.03906" y="111.146" />
        </svg>
      );
    default:
      return null;
  }
};

const getQuestionTypeName = (type: string) => {
  switch (type) {
    case 'QuestionType.true_false':
      return 'True/False';
    case 'QuestionType.multiple_choice':
      return 'Multiple Choice';
    case 'QuestionType.one_choice':
      return 'Single Choice';
    case 'QuestionType.slider':
      return 'Slider';
    case 'QuestionType.fill_gap':
      return 'Fill Gap';
    default:
      return 'Question';
  }
};

function formatQuizTime(time?: number): string {
  if (time == null || time < 0) {
    return "0s";
  }

  const totalSeconds = Math.floor(time); // truncate decimals
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`; // e.g., "3m 42s"
  } else {
    return `${seconds}s`; // e.g., "42s" or "0s"
  }
}


// Web View
const WebView = ({
  question,
  getQuestionNumber,
  totalNumber,
  remainingTime,
  progress,
  hasSelectedOption,
  isSubmitting,
  handleManualSubmit,
  renderOptionType
}: BaseViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const image = question.questionData.questionsImage;
  const optionsCount = question.optionData.length;

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

          <div className={styles.webQuizInfo}>
            <span className={`${styles.webQuestionCounter} ${styles[`webQuestionCounter_${theme}`]}`}>
               {t('question_count', {x: getQuestionNumber(), y: totalNumber})}
            </span>
            <div className={`${styles.webQuestionType} ${styles[`webQuestionType_${theme}`]}`}>
              <QuestionTypeIcon type={question.typeData.questionTypeLocalIdentity} />
              <span>{getQuestionTypeName(question.typeData.questionTypeLocalIdentity)}</span>
            </div>
          </div>
        </div>

        <div className={styles.webTimerSection}>
          <div className={`${styles.webTimeDisplay} ${styles[`webTimeDisplay_${theme}`]}`}>
            <span className={`${styles.webRemainingText} ${styles[`webRemainingText_${theme}`]}`}>{t('remaining_time')}</span>
            <span className={`${styles.webTimeValue} ${styles[`webTimeValue_${theme}`]}`}>{formatQuizTime(remainingTime)}</span>
          </div>
          <div className={styles.webProgressContainer}>
            <div
              className={`${styles.webProgressBar} ${styles[`webProgressBar_${theme}`]}`}
            >
              <div
                style={{ width: `${progress}%` }}
                className={`${styles.webProgressFill} ${styles[`webProgressFill_${theme}`]}`}
              />
            </div>
          </div>
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

      {/* Main Content */}
      <div className={styles.webQuizContent}>
        {/* Left Panel - Question */}
        <div className={styles.webQuestionPanel}>
          {image && (
            <div className={styles.webQuestionImageContainer}>
              <Image
                src={image}
                alt="Question visual"
                width={600}
                height={300}
                className={styles.webQuestionImage}
              />
            </div>
          )}

          <div className={`${styles.webQuestionCard} ${styles[`webQuestionCard_${theme}`]}`}>
            <h3 className={styles.webQuestionText}>
              <span className={styles.webQuestionNumber}>
                {getQuestionNumber()}/{totalNumber}
              </span>{" "}
                {question.questionData.questionsText}
                {optionsCount > 1 && <span>{" "}</span>}
                {optionsCount > 1 && (
                    <span className={styles.optionsCount}>
                       {t('options_count', {count: optionsCount})}
                    </span>
                )}
            </h3>
          </div>
        </div>

        {/* Right Panel - Options */}
        <div className={`${styles.webOptionsPanel} ${styles[`webOptionsPanel_${theme}`]}`}>
          <div className={`${styles.webOptionsCard} ${styles[`webOptionsCard_${theme}`]}`}>
            <div className={styles.webOptionsWrapper}>
              <div className={styles.webOptionsContent}>
                {renderOptionType(question.typeData.questionTypeLocalIdentity,'web')}
              </div>

              <div className={styles.webSubmitSection}>
                <button
                  className={`${styles.webSubmitButton} ${
                    !hasSelectedOption || isSubmitting ? styles.webSubmitButtonDisabled : ''
                  } ${styles[`webSubmitButton_${theme}`]}`}
                  onClick={handleManualSubmit}
                  disabled={!hasSelectedOption || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className={styles.progressSpinner}></div>
                  ) : (
                    t('submit_text')
                  )}
                </button>

                <div className={`${styles.webProgressHint} ${styles[`webProgressHint_${theme}`]}`}>
                  <span>{t('progress_text', {current: getQuestionNumber(), total: totalNumber})}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tablet View
const TabletView = ({
  question,
  getQuestionNumber,
  totalNumber,
  remainingTime,
  progress,
  hasSelectedOption,
  isSubmitting,
  handleManualSubmit,
  renderOptionType
}: BaseViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const image = question.questionData.questionsImage;
  const optionsCount = question.optionData.length;

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

          <div className={styles.tabletQuizInfo}>
            <div className={`${styles.tabletQuestionType} ${styles[`tabletQuestionType_${theme}`]}`}>
              <QuestionTypeIcon type={question.typeData.questionTypeLocalIdentity} />
              <span>{getQuestionTypeName(question.typeData.questionTypeLocalIdentity)}</span>
            </div>
          </div>
        </div>

        <div className={styles.tabletTimerSection}>
          <div className={`${styles.tabletTimeDisplay} ${styles[`tabletTimeDisplay_${theme}`]}`}>
            <span>{formatQuizTime(remainingTime)}</span>
          </div>
          <div className={styles.tabletProgressContainer}>
            <div
              className={`${styles.tabletProgressBar} ${styles[`tabletProgressBar_${theme}`]}`}
            >
              <div
                style={{ width: `${progress}%` }}
                className={`${styles.tabletProgressFill} ${styles[`tabletProgressFill_${theme}`]}`}
              />
            </div>
          </div>
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

      {/* Content */}
      <div className={styles.tabletQuizContent}>
        {image && (
          <div className={styles.tabletQuestionImageContainer}>
            <Image
              src={image}
              alt="Question visual"
              width={500}
              height={250}
              className={styles.tabletQuestionImage}
            />
          </div>
        )}

        <div className={styles.tabletQuestionSection}>
          <div className={`${styles.tabletQuestionCard} ${styles[`tabletQuestionCard_${theme}`]}`}>
            <h2 className={`${styles.tabletQuestionText} ${styles[`tabletQuestionText_${theme}`]}`}>
            <span className={styles.tabletQuestionCounterInline}>
                {getQuestionNumber()}/{totalNumber}
            </span>{" "}
              {question.questionData.questionsText}
              {optionsCount > 1 && <span>{" "}</span>}
              {optionsCount > 1 && (
                <span className={styles.optionsCount}>
                  {" "}{t('options_count', {count: optionsCount})}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className={styles.tabletOptionsSection}>
          <div className={styles.tabletOptionsContainer}>
            {renderOptionType(question.typeData.questionTypeLocalIdentity, 'tablet')}
          </div>
        </div>

        <div className={styles.tabletFooter}>
          <button
            className={`${styles.tabletSubmitButton} ${
              !hasSelectedOption || isSubmitting ? styles.tabletSubmitButtonDisabled : ''
            } ${styles[`tabletSubmitButton_${theme}`]}`}
            onClick={handleManualSubmit}
            disabled={!hasSelectedOption || isSubmitting}
          >
            {isSubmitting ? (
              <div className={styles.progressSpinner}></div>
            ) : (
              t('submit_text')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Mobile View (unchanged as requested)
const MobileView = ({
  question,
  getQuestionNumber,
  totalNumber,
  remainingTime,
  progress,
  hasSelectedOption,
  isSubmitting,
  handleManualSubmit,
  renderOptionType
}: BaseViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const image = question.questionData.questionsImage;
  const optionsCount = question.optionData.length;

  return (
    <div className={styles.mobileQuizContainer}>
      {/* Header */}
      <div className={styles.mobileQuizHeader}>
        <button className={`${styles.mobileMenuButton} ${styles[`mobileMenuButton_${theme}`]}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" strokeWidth="2"/>
          </svg>
        </button>

        <div className={`${styles.mobileQuestionTypeIndicator} ${styles[`mobileQuestionTypeIndicator_${theme}`]}`}>
          <QuestionTypeIcon type={question.typeData.questionTypeLocalIdentity} />
          <span  className={`${styles.mobileQuestionTypeText} ${styles[`mobileQuestionTypeText_${theme}`]}`}>
            {getQuestionTypeName(question.typeData.questionTypeLocalIdentity)}
          </span>
        </div>

        <button className={`${styles.mobileExitButton} ${styles[`mobileExitButton_${theme}`]}`}>
          <svg fill="none" height="22" viewBox="0 0 26 22" width="24" xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z"
                  fill="#FF0000" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className={styles.mobileQuizBody}>
        {image && (
          <div className={styles.mobileQuestionImageContainer}>
            <Image
              src={image}
              alt="Question visual"
              width={400}
              height={200}
              className={styles.mobileQuestionImage}
            />
          </div>
        )}

        <div className={`${styles.mobileQuestionTextContainer} ${styles[`mobileQuestionTextContainer_${theme}`]}`}>
          <h3 className={styles.questionText}>
            <span className={styles.mobileQuestionCounterInline}>
              {getQuestionNumber()}/{totalNumber}
            </span>{" "}
            {question.questionData.questionsText}
            {optionsCount > 1 && <span>{" "}</span>}
            {optionsCount > 1 && (
              <span className={styles.optionsCount}>
                {t('options_count', {count: optionsCount})}
              </span>
            )}
          </h3>
        </div>

        <div className={styles.mobileOptionsContainer}>
          {renderOptionType(question.typeData.questionTypeLocalIdentity, 'mobile')}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.mobileQuizFooter}>
        <div className={styles.mobileTimeProgressBar}>
            <div
              style={{ width: `${progress}%` }}
              className={`${styles.mobileTimeProgressFill} ${styles[`mobileTimeProgressFill_${theme}`]}`}
            />
          </div>
        <div  className={`${styles.mobileFooterContent} ${styles[`mobileFooterContent_${theme}`]}`}>
          <div className={styles.mobileTimeInfo}>
            <div className={styles.mobileRemainingText}>{t('remaining_time')}</div>
            <div className={styles.mobileTimeValue}>{formatQuizTime(remainingTime)}</div>
          </div>

          <button
            className={`${styles.mobileSubmitButton} ${
              !hasSelectedOption || isSubmitting ? styles.mobileSubmitButtonDisabled : ''
            }`}
            onClick={handleManualSubmit}
            disabled={!hasSelectedOption || isSubmitting}
          >
            {isSubmitting ? (
              <div className={styles.progressSpinner}></div>
            ) : (
              t('submit_text')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestionDisplay({ question, onAnswer, onSubmit, getQuestionNumber, totalNumber }: QuestionDisplayProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const questionId = question.poolsQuestionId;
  const timeLimit = question.timeData.questionTimeValue;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    remainingTime,
    progress,
    clearTimer
  } = useQuestionTimer({
    questionId,
    timeLimit,
    onTimeUp: () => {
      handleAutoSubmit();
    },
    autoStart: true
  });

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timeTaken = timeLimit - remainingTime;
    onSubmit(questionId, timeTaken);
    setIsSubmitting(false);
  }, [questionId, timeLimit, remainingTime, onSubmit, isSubmitting]);

  const handleManualSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timeTaken = timeLimit - remainingTime;
    onSubmit(questionId, timeTaken);
    setIsSubmitting(false);
  }, [questionId, timeLimit, remainingTime, onSubmit, isSubmitting]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const hasSelectedOption = question.optionData.some(o => o.optionSelected);
  const image = question.questionData.questionsImage;

  const renderOptionType = (type: string,displayType: DisplayType = 'mobile') => {
    const commonProps = {
      optionData: question.optionData,
      displayType,
    };

    switch (type) {
      case 'QuestionType.true_false':
        return <TrueFalseComponent {...commonProps} optionSelection={(optionId, answer) => onAnswer(questionId, optionId)} />;
      case 'QuestionType.multiple_choice':
        return <MultipleChoiceComponent {...commonProps} optionSelection={(optionId, answer) => onAnswer(questionId, optionId)} />;
      case 'QuestionType.one_choice':
        return <MultipleChoiceComponent {...commonProps} optionSelection={(optionId, answer) => onAnswer(questionId, optionId)} />;
      case 'QuestionType.slider':
        return <SliderComponent {...commonProps} optionSelection={(optionId, answer) => onAnswer(questionId, optionId, answer)} />;
      case 'QuestionType.fill_gap':
        return <FillGapComponent {...commonProps} optionSelection={(optionId, answer) => onAnswer(questionId, optionId, answer)} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Web View */}
      <div className={styles.webOnly}>
        <WebView
          question={question}
          getQuestionNumber={getQuestionNumber}
          totalNumber={totalNumber}
          remainingTime={remainingTime}
          progress={progress}
          hasSelectedOption={hasSelectedOption}
          isSubmitting={isSubmitting}
          handleManualSubmit={handleManualSubmit}
          renderOptionType={renderOptionType}
        />
      </div>

      {/* Tablet View */}
      <div className={styles.tabletOnly}>
        <TabletView
          question={question}
          getQuestionNumber={getQuestionNumber}
          totalNumber={totalNumber}
          remainingTime={remainingTime}
          progress={progress}
          hasSelectedOption={hasSelectedOption}
          isSubmitting={isSubmitting}
          handleManualSubmit={handleManualSubmit}
          renderOptionType={renderOptionType}
        />
      </div>

      {/* Mobile View */}
      <div className={styles.mobileOnly}>
        <MobileView
          question={question}
          getQuestionNumber={getQuestionNumber}
          totalNumber={totalNumber}
          remainingTime={remainingTime}
          progress={progress}
          hasSelectedOption={hasSelectedOption}
          isSubmitting={isSubmitting}
          handleManualSubmit={handleManualSubmit}
          renderOptionType={renderOptionType}
        />
      </div>
    </>
  )
}