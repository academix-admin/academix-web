'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './page.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import Image from 'next/image';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { FriendsModel } from '@/models/friends-model';
import { PaginateModel } from '@/models/paginate-model';
import { QuizPool, BackendQuizPool } from '@/models/user-display-quiz-topic-model';
import { BackendPoolQuestion, PoolQuestion } from '@/models/pool-question-model';
import { BackendPoolMemberModel, PoolMemberModel } from '@/models/pool-member';
import { StateStack } from '@/lib/state-stack';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';


// Quiz state types
type QuizState =
  | 'loading'
  | 'quizPlay'
  | 'notFound'
  | 'quizTime'
  | 'quizEnd'
  | 'questionTrack'
  | 'quizReward'
  | 'error';

type SubmissionStatus = 'initial' | 'loading' | 'submitted' | 'error';

interface SubmissionState {
  status: SubmissionStatus;
  questionId: string;
  time?: number;
}

interface QuizSession {
  currentQuestionId: string | null;
  totalQuestions: number;
  submissions: Map<string, SubmissionState>;
  completedQuestions: PoolQuestion[];
  pendingQuestions: PoolQuestion[];
}

interface QuizResult {
  userResult: PoolMemberModel | null;
  rankResults: PoolMemberModel[];
}

// Component Props Interfaces
interface QuestionDisplayProps {
  question: PoolQuestion;
  onAnswer: (questionId: string, optionId: string, answer?: string) => void;
  onSubmit: (questionId: string, timeTaken: number) => void;
}

interface QuizProgressProps {
  current: number;
  total: number;
  submissions: Map<string, SubmissionState>;
  onQuestionSelect: (questionId: string) => void;
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

// Question Display
const QuestionDisplay = ({ question, onAnswer, onSubmit }: QuestionDisplayProps) => {
  const questionId = question.poolsQuestionId;
  const timeLimit = question.timeData.questionTimeValue;

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the custom timer hook
  const {
    remainingTime,
    isActive,
    isTimeUp,
    progress,
    pauseTimer,
    clearTimer
  } = useQuestionTimer({
    questionId,
    timeLimit,
    onTimeUp: () => {
      console.log(`Auto-submitting question: ${questionId}`);
      handleAutoSubmit();
    },
    autoStart: true
  });

  // Auto-submit handler
  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const timeTaken = timeLimit - remainingTime;

    onSubmit(questionId, timeTaken);
    setIsSubmitting(false);
  }, [questionId, timeLimit, remainingTime, onSubmit, isSubmitting]);

  // Manual submit handler
  const handleManualSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timeTaken = timeLimit - remainingTime;

    onSubmit(questionId, timeTaken);
    setIsSubmitting(false);

  }, [questionId, timeLimit, remainingTime, onSubmit, isSubmitting, pauseTimer]);

  // Option selection handler
  const handleOptionClick = useCallback((optionId: string) => {
    if (isSubmitting) return;

    const questionType = question.typeData.questionTypeLocalIdentity;

    if (questionType.includes('slider')) {
      const answer = prompt('Enter your value:');
      if (answer !== null) {
        onAnswer(questionId, optionId, answer);
      }
    } else {
      onAnswer(questionId, optionId);
    }
  }, [questionId, question.typeData.questionTypeLocalIdentity, onAnswer, isSubmitting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // Derived values
  const hasSelectedOption = question.optionData.some(o => o.optionSelected);

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '20px',
      margin: '10px',
      opacity: isSubmitting ? 0.7 : 1
    }}>
      {/* Header */}
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>{question.questionData.questionsText}</h3>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <span>Type: {question.typeData.questionTypeIdentity}</span>
          <span style={{ marginLeft: '15px' }}>ID: {questionId}</span>
          <span style={{ marginLeft: '15px' }}>Time: {timeLimit}s</span>
          <span style={{ marginLeft: '15px' }}>Status: {isActive ? 'Running' : 'Paused'}</span>
        </div>
      </div>

      {/* Timer Progress */}
      <div style={{ margin: '15px 0' }}>
        <div style={{
          width: '100%',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
          overflow: 'hidden',
          marginBottom: '5px'
        }}>
          <div
            style={{
              width: `${progress}%`,
              height: '20px',
              backgroundColor: progress > 20 ? '#4CAF50' : progress > 10 ? '#FF9800' : '#f44336',
              transition: 'width 1s linear',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            {progress.toFixed(0)}%
          </div>
        </div>
        <p style={{
          margin: 0,
          fontWeight: 'bold',
          color: isTimeUp ? '#f44336' : '#333'
        }}>
          {isTimeUp ? 'Time Up!' : `Time Remaining: ${remainingTime}s`}
        </p>
      </div>

      {/* Options */}
      <div style={{ margin: '20px 0' }}>
        {question.optionData.map(option => (
          <button
            key={option.optionsId}
            onClick={() => handleOptionClick(option.optionsId)}
            disabled={isSubmitting || isTimeUp}
            style={{
              margin: '5px',
              padding: '12px 16px',
              backgroundColor: option.optionSelected ? '#4CAF50' : '#e0e0e0',
              color: option.optionSelected ? 'white' : '#333',
              border: `2px solid ${option.optionSelected ? '#388E3C' : '#ccc'}`,
              borderRadius: '6px',
              cursor: (isSubmitting || isTimeUp) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || isTimeUp) ? 0.6 : 1,
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              if (!isSubmitting && !isTimeUp && !option.optionSelected) {
                e.currentTarget.style.backgroundColor = '#d6d6d6';
              }
            }}
            onMouseOut={(e) => {
              if (!isSubmitting && !isTimeUp && !option.optionSelected) {
                e.currentTarget.style.backgroundColor = '#e0e0e0';
              }
            }}
          >
            {option.optionsIdentity} {option.optionSelected ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <div style={{ textAlign: 'center', marginTop: '25px' }}>
        <button
          onClick={handleManualSubmit}
          disabled={!hasSelectedOption || isSubmitting || isTimeUp}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: !hasSelectedOption || isSubmitting || isTimeUp ? '#cccccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (!hasSelectedOption || isSubmitting || isTimeUp) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '150px'
          }}
          onMouseOver={(e) => {
            if (hasSelectedOption && !isSubmitting && !isTimeUp) {
              e.currentTarget.style.backgroundColor = '#1976D2';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseOut={(e) => {
            if (hasSelectedOption && !isSubmitting && !isTimeUp) {
              e.currentTarget.style.backgroundColor = '#2196F3';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isSubmitting ? (
            <>⏳ Submitting...</>
          ) : isTimeUp ? (
            <>⏰ Time Expired</>
          ) : (
            <>🚀 Submit Answer</>
          )}
        </button>

        {/* Status indicator */}
        <div style={{
          marginTop: '10px',
          fontSize: '12px',
          color: '#666',
          height: '15px'
        }}>
          {isSubmitting && 'Submitting your answer...'}
          {isTimeUp && !isSubmitting && 'Time expired - answer submitted automatically'}
          {!isActive && !isTimeUp && !isSubmitting && 'Timer paused'}
        </div>
      </div>
    </div>
  );
};

// Quiz Progress Component
const QuizProgress = ({ current, total, submissions, onQuestionSelect }: QuizProgressProps) => {
  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '10px' }}>
      <h3>Progress: {current}/{total}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {Array.from(submissions.entries()).map(([questionId, submission]) => (
          <button
            key={questionId}
            onClick={() => onQuestionSelect(questionId)}
            style={{
              padding: '10px',
              backgroundColor: submission.status === 'submitted' ? '#4CAF50' :
                             submission.status === 'loading' ? '#FFC107' :
                             submission.status === 'error' ? '#f44336' : '#e0e0e0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              minWidth: '50px'
            }}
          >
            Q{questionId.slice(-3)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Quiz Component
export default function Quiz({ params }: { params: Promise<{ poolsId: string }> }) {
  const { poolsId } = use(params);
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData } = useUserData();
  const isMountedRef = useRef(true);

  // Main quiz state
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [poolMembers, setPoolMembers] = useState<PoolMemberModel[]>([]);
  const [closed, setClosed] = useState<boolean>(false);
  const [quizTimerValue, setQuizTimerValue] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // Quiz session state
  const [quizSession, setQuizSession] = useState<QuizSession>({
    currentQuestionId: null,
    totalQuestions: 0,
    submissions: new Map(),
    completedQuestions: [],
    pendingQuestions: []
  });

  const [quizModel, demandQuizModel, setQuizModel, ] = useDemandState<QuizPool | null>(null, {
    key: "quizPool",
    persist: false,
    scope: "quiz_pool_flow",
    deps: [lang],
  });

  // Refs
  const quizStreamRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if quiz has ended
  const checkEnd = useCallback((): boolean => {
    if (closed) return true;
    if (!quizModel) return false;

    // Quiz is closed if submissions are not allowed or pool status is closed
    const isClosed = !quizModel.poolsAllowSubmission ||
                    quizModel.poolsStatus === 'Pools.closed';

    if (isClosed) {
      setClosed(true);
    }

    return isClosed;
  }, [closed, quizModel]);

  // Check if a question is valid for submission but not yet submitted
  const validForNotSubmitted = useCallback((question: PoolQuestion): boolean => {
    return (
      question.questionTime == null && // Not yet timed/submitted
      question.optionData.some(option => option.optionSelected) // Has selected options
    );
  }, []);

  // Initialize quiz session with questions
  const initializeQuizSession = useCallback((questions: PoolQuestion[]) => {
    const completedQuestions: PoolQuestion[] = [];
    const pendingQuestions: PoolQuestion[] = [];

    // Split questions based on questionTime (completed vs pending)
    questions.forEach(q => {
      if (q.questionTime != null) {
        completedQuestions.push(q);
      } else {
        pendingQuestions.push(q);
      }
    });

    // Shuffle pending questions for random order
    const shuffledPending = [...pendingQuestions].sort(() => Math.random() - 0.5);

    // Create initial submissions map
    const initialSubmissions = new Map(
      questions.map(q => [q.poolsQuestionId, {
        status: q.questionTime != null ? 'submitted' as SubmissionStatus : 'initial',
        questionId: q.poolsQuestionId
      }])
    );

    setQuizSession({
      totalQuestions: questions.length,
      submissions: initialSubmissions,
      completedQuestions,
      currentQuestionId: shuffledPending[0]?.poolsQuestionId || null,
      pendingQuestions: shuffledPending
    });
  }, []);


  // Start real-time quiz stream
  const startQuizStream = useCallback(() => {
    if (!poolsId) return;

    // Create a dedicated channel for this quiz
    const channel = supabaseBrowser
      .channel(`quiz-stream-${poolsId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pools_table',
          filter: `pools_id=eq.${poolsId}`,
        },
        (payload: RealtimePostgresChangesPayload<BackendQuizPool>) => {
          if (payload.new) setQuizModel(new QuizPool(payload.new as BackendQuizPool));
        }
      )
      .subscribe();

    quizStreamRef.current = channel;

    // Cleanup function
    return () => {
      if (quizStreamRef.current) {
        supabaseBrowser.removeChannel(quizStreamRef.current);
      }
    };
  }, [poolsId, setQuizModel]);

  // Handle answer selection
  const handleAnswer = useCallback((questionId: string, optionId: string, answer?: string) => {
    setQuizSession(prev => {
      // Find the current question in pending questions
      const currentQuestion = prev.pendingQuestions.find(q => q.poolsQuestionId === questionId);
      if (!currentQuestion) return prev;

      const questionType = currentQuestion.typeData.questionTypeLocalIdentity;

      // Update question with new option selection
      const updatedQuestion = currentQuestion.copyWith({
        optionData: currentQuestion.optionData.map(option => {
          if (option.optionsId === optionId) {
            if (questionType === 'QuestionType.slider') {
              // For slider questions, update the option identity with the answer
              return option.copyWith({
                optionSelected: true,
                optionsIdentity: answer
              });
            }
            // Toggle selection for other question types
            return option.copyWith({ optionSelected: !option.optionSelected });
          }

          // For single-choice questions, deselect other options
          if ((questionType === 'QuestionType.true_false' || questionType === 'QuestionType.one_choice') && option.optionSelected) {
            return option.copyWith({ optionSelected: false });
          }

          return option;
        })
      });

      // Replace the old question with updated one
      const newPendingQuestions = [
        ...prev.pendingQuestions.filter(q => q.poolsQuestionId !== questionId),
        updatedQuestion
      ];

      return {
        ...prev,
        pendingQuestions: newPendingQuestions
      };
    });
  }, []);

  // Submit question to backend
  const submitQuestionToBackend = useCallback(async (question: PoolQuestion, timeTaken: number) => {
    if (!userData) throw new Error('User not authenticated');

    // Get user paramatical data for submission
    const paramatical = await getParamatical(
      userData.usersId,
      lang,
      userData.usersSex,
      userData.usersDob
    );

    if (!paramatical) return;

    const submission = quizSession.submissions.get(question.poolsQuestionId);
    if (submission?.status === 'loading' || submission?.status === 'submitted') {
            console.log(' MAIN: Question already being processed, skipping', question.poolsQuestionId);
            return;
    }

    // Update submission status to loading
    setQuizSession(prev => {
      const newSubmissions = new Map(prev.submissions);
      newSubmissions.set(question.poolsQuestionId, {
        status: 'loading',
        questionId: question.poolsQuestionId,
        time: timeTaken
      });
      return { ...prev, submissions: newSubmissions };
    });

    try {
      // Call backend RPC function to submit question
      const { data, error } = await supabaseBrowser.rpc("submit_question_tracker", {
        p_user_id: userData.usersId,
        p_submission: question.submission(timeTaken),
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age
      });

      if (error) throw error;

      console.log(data);

      if (data.status === 'Submission.success' || data.status === 'Submission.duplicate') {
        // Update submission status to successful
      setQuizSession(prev => {
        // Map through completedQuestions and update the specific question with questionTime
        const updatedCompletedQuestions = prev.completedQuestions.map(q => {
          if (q.poolsQuestionId === question.poolsQuestionId) {
            return q.copyWith({
              questionTime: timeTaken
            });
          }
          return q;
        });

        // Update submission status to successful
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(question.poolsQuestionId, {
          status: 'submitted',
          questionId: question.poolsQuestionId,
          time: timeTaken
        });

        return {
          ...prev,
          completedQuestions: updatedCompletedQuestions,
          submissions: newSubmissions
        };
      });

      } else if (data.status === 'Submission.no_active') {
        // Update submission status to error
        setQuizSession(prev => {
          const newSubmissions = new Map(prev.submissions);
          newSubmissions.set(question.poolsQuestionId, {
            status: 'error',
            questionId: question.poolsQuestionId,
            time: timeTaken
          });
          return { ...prev, submissions: newSubmissions };
        });
        setClosed(true);
        determineState();
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      // Update submission status to error on exception
      setQuizSession(prev => {
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(question.poolsQuestionId, {
          status: 'error',
          questionId: question.poolsQuestionId,
          time: timeTaken
        });
        return { ...prev, submissions: newSubmissions };
      });

    }
  }, [userData, lang, quizSession]);

  // Handle question submission
  const handleSubmitQuestion = useCallback(
    (questionId: string, timeTaken: number) => {
      setQuizSession(prev => {

        const currentQuestion = prev.pendingQuestions.find(q => q.poolsQuestionId === questionId);
        if (!currentQuestion) return prev;

        const newPending = prev.pendingQuestions.filter(q => q.poolsQuestionId !== questionId);
        const isAlreadyCompleted = prev.completedQuestions.some(q => q.poolsQuestionId === questionId);
        const newCompleted = isAlreadyCompleted
          ? prev.completedQuestions
          : [...prev.completedQuestions, currentQuestion];

        // Submit to backend
        submitQuestionToBackend(currentQuestion, timeTaken);

        // Get next question (you can keep your shuffle logic here if needed)\
        const shuffledPending = [...newPending].sort(() => Math.random() - 0.5);
        const nextQuestionId = shuffledPending.length > 0 ? shuffledPending[0].poolsQuestionId : null;

        return {
          ...prev,
          pendingQuestions: shuffledPending,
          completedQuestions: newCompleted,
          currentQuestionId: nextQuestionId
        };
      });
    },
    [submitQuestionToBackend]
  );

  // Automatically submit questions that are valid but not submitted
  const automateSubmit = useCallback(async () => {
    if (closed) return;

    // Find questions that are valid for submission but not yet submitted
    const questionsToSubmit = quizSession.completedQuestions.filter(validForNotSubmitted);

    for (const question of questionsToSubmit) {
      if (closed) break;

      // Create PoolQuestion instance - this should never be null
      const poolQuestion = PoolQuestion.from(question);

      // Calculate time taken (use existing timeTaken or fallback to question time value)
      const timeTaken = poolQuestion.timeTaken ?? question.timeData.questionTimeValue;

      submitQuestionToBackend(question, timeTaken);
    }
  }, [quizSession.completedQuestions, validForNotSubmitted, submitQuestionToBackend, closed]);

  // Check if user can resubmit a question
  const canResubmit = useCallback((questionId: string): boolean => {
    const question = quizSession.completedQuestions.find(q => q.poolsQuestionId === questionId);
    if (question) {
      return validForNotSubmitted(question);
    }
    return false;
  }, [quizSession.completedQuestions, validForNotSubmitted]);

  // Get current question object
  const getCurrentQuestion = useCallback((questionId: string | null): PoolQuestion | null => {
    if (!questionId) return null;

    // Find question in pending questions
    const currentQuestion = quizSession.pendingQuestions.find(q => q.poolsQuestionId === questionId);
    return currentQuestion || null;
  }, [quizSession.pendingQuestions]);

  // Fetch quiz results
  const fetchQuizResults = useCallback(async () => {
    if (!userData || !poolsId) return;

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      const { data, error } = await supabaseBrowser.rpc("get_quiz_result", {
        p_user_id: userData.usersId,
        p_pool_id: poolsId,
        p_locale: paramatical?.locale,
        p_country: paramatical?.country,
        p_gender: paramatical?.gender,
        p_age: paramatical?.age
      });

      if (error) throw error;

      if (data) {
        const resultModel = data;
        setQuizResult({
          userResult: resultModel.user_result ? new PoolMemberModel(resultModel.user_result) : null,
          rankResults: resultModel.rank_results?.map((r: any) => new PoolMemberModel(r)) || []
        });

      }
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    }
  }, [userData, poolsId, lang]);

  // Fetch pool members for leaderboard
  const fetchPoolMembers = useCallback(async (paginate = false) => {
    if (!userData || !poolsId) return;

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      const paginateModel = new PaginateModel();

      const { data, error } = await supabaseBrowser.rpc("fetch_pool_members", {
        p_user_id: userData.usersId,
        p_pool_id: poolsId,
        p_locale: paramatical?.locale,
        p_country: paramatical?.country,
        p_gender: paramatical?.gender,
        p_age: paramatical?.age,
        p_limit_by: 20,
        p_for_ranking: true,
        p_after_pool_members: paginateModel.toJson()
      });

      if (error) throw error;

      if (data) {
        const members = data.map((member: any) => new PoolMemberModel(member));
        setPoolMembers(prev => paginate ? [...prev, ...members] : members);
      }
    } catch (error) {
      console.error('Error fetching pool members:', error);
    }
  }, [userData, poolsId, lang]);

  const cleanUpQuizTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
  }, []);

  const setupTimeLapse = useCallback((quizPool: QuizPool | null): boolean => {
    if (!quizPool) return false;

    const end = new Date(quizPool.poolsJobEndAt!);
    const status = quizPool.poolsJob;

    if (status !== 'PoolJob.pool_period') {
      return false;
    }

    if (isTimerActive) return true;

    if (!checkEnd()) {
      const now = new Date();
      const duration = Math.floor((end.getTime() - now.getTime()) / 1000);

      try {
        cleanUpQuizTimer();

        if (duration >= 0) {
          setQuizTimerValue(duration);
          setIsTimerActive(true);

          timerRef.current = setInterval(() => {
            setQuizTimerValue(prev => {
              const newValue = prev - 1;

              if (newValue <= 0 || checkEnd()) {
                cleanUpQuizTimer();
                if (status === 'PoolJob.pool_period') {
                  determineState();
                }
                return 0;
              }

              return newValue;
            });
          }, 1000);

          return true;
        }
        return false;
      } catch (error) {
        console.error('Error setting up quiz timer:', error);
        cleanUpQuizTimer();
        return false;
      }
    }
    return false;
  }, [isTimerActive, cleanUpQuizTimer, checkEnd]);

  // Determine state transitions
  const determineState = useCallback(() => {
    if(!quizModel)return;

    const completedQuestions = quizSession.completedQuestions;
    const pendingQuestions = quizSession.pendingQuestions;

    // Check if quiz has ended
    if (checkEnd() || (quizSession.currentQuestionId && pendingQuestions.length === 0)) {
      if (quizState !== 'quizEnd') {
        setQuizState('quizEnd');
      }
      return;
    }

    // Check if there are questions that need automatic submission
    const hasUnsubmittedValidQuestions = completedQuestions.some(validForNotSubmitted);

    if (pendingQuestions.length === 0 && hasUnsubmittedValidQuestions && completedQuestions.length === quizSession.totalQuestions) {
      setQuizState('questionTrack');
      automateSubmit();
      return;
    }

    // Check if all questions are completed and submitted
    const allSubmitted = completedQuestions.filter(validForNotSubmitted).length === 0 &&
                       completedQuestions.length === quizSession.totalQuestions;

    if (setupTimeLapse(quizModel) && pendingQuestions.length === 0 && allSubmitted) {
       setQuizState('quizTime');
      return;
    }

    // Default to quiz play state if there are pending questions
    if (pendingQuestions.length > 0 && quizState !== 'quizPlay') {
      setQuizState('quizPlay');
      return;
    }

    if (!quizSession.currentQuestionId && pendingQuestions.length === 0 && quizState !== 'quizEnd') {
        setQuizState('quizEnd');
        return;
    }

  }, [quizSession, quizModel, checkEnd, validForNotSubmitted, automateSubmit, quizState]);

  // Monitor quiz session and quiz model to determine state transitions
  useEffect(() => {
    if(!quizModel)return;
    determineState();
  }, [quizSession, quizModel]);

  useEffect(() => {
    if(quizSession.currentQuestionId)return;
    determineState();
  }, [quizSession.currentQuestionId]);

  // Fetch initial quiz data
  useEffect(() => {
    if (!userData) return;

    demandQuizModel(async ({ get, set }) => {
      setQuizState('loading');
      try {
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );

        if (!paramatical) {
          setQuizState('error');
          return;
        }

        const { data, error } = await supabaseBrowser.rpc("authorized_quiz_pool_questions", {
          p_user_id: userData.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
          p_pool_id: poolsId
        });

        if (error) {
          console.error("[QuizModel] error:", error);
          setQuizState('error');
          return;
        }

        if (!data) {
          setQuizState('error');
          return;
        }

        if (data.status === 'Pool.allowed') {
          const quizPool = new QuizPool(data.pools_quiz);
          const poolQuestions = (data.pools_question || []).map((row: BackendPoolQuestion) => new PoolQuestion(row));

          set(quizPool);
          initializeQuizSession(poolQuestions);
          startQuizStream();
        } else {
          set(null);
          setQuizState('notFound');
        }

      } catch (err) {
        console.error("[QuizModel] error:", err);
        setQuizState('error');
      }
    });
  }, [demandQuizModel, poolsId, userData, lang, initializeQuizSession, startQuizStream]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (quizStreamRef.current) {
        supabaseBrowser.removeChannel(quizStreamRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanUpQuizTimer();
    };
  }, [cleanUpQuizTimer]);

  useEffect(() => {
    isMountedRef.current = true;
    // Cleanup function
    return () => {
      if (isMountedRef.current) {
        StateStack.core.clearScope('quiz_pool_flow');
      }
      isMountedRef.current = false;
    };
  }, []);

  // Render quiz content based on current state
  const renderQuizContent = () => {
    switch (quizState) {
      case 'loading':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Loading quiz...</div>
            <div style={{ marginTop: '20px' }}>Please wait while we prepare your questions.</div>
          </div>
        );

      case 'notFound':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Quiz Not Found</h2>
            <p>The quiz you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        );

      case 'error':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Error</h2>
            <p>Something went wrong while loading the quiz. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        );
    case 'quizTime':
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          margin: '20px 0'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#e3f2fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 30px',
            border: '4px solid #2196F3'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1976d2'
            }}>
              {Math.floor(quizTimerValue / 60)}:{(quizTimerValue % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <h2 style={{
            color: '#333',
            marginBottom: '16px'
          }}>
            Quiz Time Remaining
          </h2>

          <p style={{
            color: '#666',
            fontSize: '18px',
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            Time remaining in the quiz session
          </p>

          {/* Progress summary */}
          <div style={{
            display: 'inline-flex',
            gap: '30px',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                {quizSession.completedQuestions.length}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Completed</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
                {quizSession.totalQuestions}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Total</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
                {quizSession.pendingQuestions.length}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Missed</div>
            </div>
          </div>
        </div>
      );

      case 'quizPlay':
        const currentQuestion = getCurrentQuestion(quizSession.currentQuestionId);
        if (!currentQuestion) return null;

        return (
          <div>
            <QuizProgress
              current={quizSession.completedQuestions.length + 1}
              total={quizSession.totalQuestions}
              submissions={quizSession.submissions}
              onQuestionSelect={(questionId) => {
                // In a real implementation, this would navigate to specific question
                console.log('Navigate to question:', questionId);
                // You could implement question navigation logic here
              }}
            />

            <QuestionDisplay
              question={currentQuestion}
              onAnswer={handleAnswer}
              onSubmit={handleSubmitQuestion}
            />
          </div>
        );

      case 'quizEnd':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Quiz Completed!</h2>
            <p>You've answered {quizSession.completedQuestions.length} out of {quizSession.totalQuestions} questions</p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={fetchQuizResults}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                View Results
              </button>
              <button
                onClick={() => setQuizState('questionTrack')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Question Track
              </button>
            </div>
          </div>
        );

      case 'questionTrack':
        return (
          <div style={{ padding: '20px' }}>
            <h2>Question Track</h2>
            <p>Review your submission status for each question:</p>
            <QuizProgress
              current={quizSession.completedQuestions.length}
              total={quizSession.totalQuestions}
              submissions={quizSession.submissions}
              onQuestionSelect={() => {}} // Could implement question review here
            />
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={fetchQuizResults}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                View Final Results
              </button>
            </div>
          </div>
        );

      case 'quizReward':
        return (
          <div style={{ padding: '20px' }}>
            <h2>Quiz Results</h2>
            {quizResult?.userResult ? (
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3>Your Result</h3>
                <p><strong>Rank:</strong> {quizResult.userResult.poolsMembersRank}</p>
                <p><strong>Score:</strong> {quizResult.userResult.poolsMembersPrice}</p>
                <p><strong>Correct Answers:</strong> {quizSession.completedQuestions.length}</p>
              </div>
            ) : (
              <p>No results available yet.</p>
            )}

            <button
              onClick={() => fetchPoolMembers()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              View Leaderboard
            </button>

            {poolMembers.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3>Top Performers</h3>
                <ul>
                  {poolMembers.slice(0, 5).map((member, index) => (
                    <li key={index} style={{ padding: '5px 0' }}>
                      {index + 1}. Score: {member.poolsMembersPrice} | Rank: {member.poolsMembersRank}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unknown state</div>;
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Quiz: {poolsId}</h1>
        {userData && (
          <p style={{ margin: '5px 0', color: '#666' }}>
            Welcome, {userData.usersId}
          </p>
        )}
        <div style={{
          padding: '5px 10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          display: 'inline-block',
          fontSize: '14px'
        }}>
          Status: <strong>{quizState}</strong>
        </div>
      </header>

      <main>
        {renderQuizContent()}
      </main>
    </div>
  );
}