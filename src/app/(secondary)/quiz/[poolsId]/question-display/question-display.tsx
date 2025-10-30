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

interface UseQuestionTimerProps {
  questionId: string;
  timeLimit: number;
  onTimeUp: () => void;
  autoStart?: boolean;
}

const useQuestionTimer = ({
  questionId,
  timeLimit,
  onTimeUp,
  autoStart = true
}: UseQuestionTimerProps) => {
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const [isActive, setIsActive] = useState(autoStart);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Update the callback ref when onTimeUp changes
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setIsActive(true);
    setIsTimeUp(false);
    setRemainingTime(timeLimit);

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearTimer();
          setIsTimeUp(true);
          setIsActive(false);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeLimit, clearTimer]);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (remainingTime > 0 && !isTimeUp) {
      setIsActive(true);

      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearTimer();
            setIsTimeUp(true);
            setIsActive(false);
            onTimeUpRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [remainingTime, isTimeUp, clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setIsActive(autoStart);
    setIsTimeUp(false);
    setRemainingTime(timeLimit);

    if (autoStart) {
      startTimer();
    }
  }, [timeLimit, autoStart, clearTimer, startTimer]);

  // Initialize timer when questionId changes
  useEffect(() => {
    resetTimer();

    return () => {
      clearTimer();
    };
  }, [questionId, resetTimer, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

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
    clearTimer
  };
};

// True/False Component
const TrueFalseComponent = ({ optionData, optionSelection }: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
}) => {
  const { theme } = useTheme();

  return (
    <div className={styles.trueFalseContainer}>
      {optionData.map((option) => (
        <button
          key={option.optionsId}
          className={`${styles.trueFalseButton}`}
          onClick={() => optionSelection(option.optionsId, option.optionsIdentity)}
        >
          <span className={styles.trueFalseText}>
            {option.optionsIdentity}
          </span>
          {option.optionSelected && (
            <div className={styles.selectionIndicator}>✓</div>
          )}
        </button>
      ))}
    </div>
  );
};

// Multiple Choice Component
const MultipleChoiceComponent = ({ optionData, optionSelection }: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
}) => {
  const { theme } = useTheme();

  return (
    <div className={styles.multipleChoiceContainer}>
      {optionData.map((option) => (
        <div
          key={option.optionsId}
          className={`${styles.multipleChoiceOption} ${
            option.optionSelected ? styles.multipleChoiceSelected : ''
          }`}
          onClick={() => optionSelection(option.optionsId,option.optionsIdentity)}
        >
          <div className={styles.optionCircle}>
            {option.optionSelected && <div className={styles.optionCircleSelected} />}
          </div>
          <span className={styles.optionText}>{option.optionsIdentity}</span>
        </div>
      ))}
    </div>
  );
};

// Slider Component
const SliderComponent = ({ optionData, optionSelection }: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
}) => {
  const [sliderValue, setSliderValue] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);
    // For slider, we might want to pass the value as answer
    if (optionData[0]) {
      optionSelection(optionData[0].optionsId, value.toString());
    }
  };

  return (
    <div className={styles.sliderContainer}>
      <input
        type="range"
        min={optionData[0]?.optionsMin || 0}
        max={optionData[0]?.optionsMax || 100}
        value={sliderValue}
        onChange={handleSliderChange}
        className={styles.slider}
      />
      <div className={styles.sliderLabels}>
        <span>{optionData[0]?.optionsMin || 0}</span>
        <span>{sliderValue}</span>
        <span>{optionData[0]?.optionsMax || 100}</span>
      </div>
    </div>
  );
};

// Fill Gap Component
const FillGapComponent = ({ optionData, optionSelection }: {
  optionData: OptionModel[];
  optionSelection: (optionId: string, answer?: string) => void;
}) => {
  const [answer, setAnswer] = useState('');

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAnswer(value);
    if (optionData[0]) {
      optionSelection(optionData[0].optionsId, value);
    }
  };

  return (
    <div className={styles.fillGapContainer}>
      <input
        type="text"
        value={answer}
        onChange={handleAnswerChange}
        placeholder="Type your answer here..."
        className={styles.fillGapInput}
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

  const renderOptionType = (type: string) => {
    switch (type) {
      case 'QuestionType.true_false':
        return <TrueFalseComponent optionData={question.optionData} optionSelection={(optionId, answer) => onAnswer(questionId, optionId)} />;
      case 'QuestionType.multiple_choice':
        return <MultipleChoiceComponent optionData={question.optionData} optionSelection={(optionId, answer) => onAnswer(questionId, optionId)} />;
      case 'QuestionType.one_choice':
        return <MultipleChoiceComponent optionData={question.optionData} optionSelection={(optionId, answer) => onAnswer(questionId, optionId)} />;
      case 'QuestionType.slider':
        return <SliderComponent optionData={question.optionData} optionSelection={(optionId, answer) => onAnswer(questionId, optionId, answer)} />;
      case 'QuestionType.fill_gap':
        return <FillGapComponent optionData={question.optionData} optionSelection={(optionId, answer) => onAnswer(questionId, optionId, answer)} />;
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

  return (
    <div className={styles.quizContainer}>
      {/* Header */}
      <div className={styles.quizHeader}>
        <button className={styles.menuButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>

        <div className={styles.questionTypeIndicator}>
          <QuestionTypeIcon type={question.typeData.questionTypeLocalIdentity} />
          <span className={styles.questionTypeText}>
            {getQuestionTypeName(question.typeData.questionTypeLocalIdentity)}
          </span>
        </div>

        <button className={styles.exitButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className={styles.quizBody}>
        {image && (
          <div className={styles.questionImageContainer}>
            <Image
              src={image}
              alt="Question visual"
              width={400}
              height={200}
              className={styles.questionImage}
            />
          </div>
        )}

        <div className={styles.questionTextContainer}>
          <div className={styles.questionCounter}>
            {getQuestionNumber()}/{totalNumber}
          </div>
          <h3 className={styles.questionText}>
            {question.questionData.questionsText}
          </h3>
        </div>

        <div className={styles.optionsContainer}>
          {renderOptionType(question.typeData.questionTypeLocalIdentity)}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.quizFooter}>
        <div className={styles.timeProgressBar}>
            <div
              style={{ width: `${progress}%` }}
              className={styles.timeProgressFill}
            />
          </div>
        <div className={styles.footerContent}>
          <div className={styles.timeInfo}>
            <div className={styles.remainingText}>{t('remaining_time')}</div>
            <div className={styles.timeValue}>{remainingTime}s</div>
          </div>

          <button
            className={`${styles.submitButton} ${
              !hasSelectedOption || isSubmitting ? styles.submitButtonDisabled : ''
            }`}
            onClick={handleManualSubmit}
            disabled={!hasSelectedOption || isSubmitting}
          >
            {isSubmitting ? (
              <div className={styles.progressSpinner}></div>
            ) : (
              t('submit')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}