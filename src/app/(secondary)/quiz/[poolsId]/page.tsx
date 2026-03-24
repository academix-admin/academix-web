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
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { QuizPool, BackendQuizPool } from '@/models/user-display-quiz-topic-model';
import { BackendPoolQuestion, PoolQuestion } from '@/models/pool-question-model';
import { StateStack } from '@/lib/state-stack';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import QuestionDisplay from './question-display/question-display'
import QuizTimer from './quiz-timer/quiz-timer'
import QuizCompletion from './quiz-completion/quiz-completion'
import QuizTracker from './quiz-tracker/quiz-tracker'
import SideDrawer from '@/lib/SideDrawer';
import SideTracker from './side-tracker/side-tracker'
import QuizResults from './quiz-results/quiz-results'
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { useDialog, createConfirmDialog } from '@/lib/DialogViewer';

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

type SubmissionStatus = 'initial' | 'loading' | 'data' | 'error';

interface SubmissionState {
  status: SubmissionStatus;
  questionId: string;
  time?: number | null;
  questionStatus?: string;
  options_selected: string[];
}

export type QuestionTrackerState = SubmissionState & {
  question: string;
  canResubmit: boolean;
};

interface QuizSession {
  currentQuestionId: string | null;
  totalQuestions: number;
  submissions: Map<string, SubmissionState>;
  completedQuestions: PoolQuestion[];
  pendingQuestions: PoolQuestion[];
}

type PendingSubmission = {
  question: PoolQuestion;
  timeTaken: number;
} | null;


// Main Quiz Component
export default function Quiz({ params }: { params: Promise<{ poolsId: string }> }) {
  const { poolsId } = use(params);
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const isMountedRef = useRef(true);
  const { replaceAndWait, pushAndWait } = useAwaitableRouter();

  // Dialog for confirmations
  const { isOpen: isDialogOpen, open: openDialog, close: closeDialog, DialogViewer } = useDialog();
  const [dialogType, setDialogType] = useState<'exit' | 'back'>('exit');
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Main quiz state
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [closed, setClosed] = useState<boolean>(false);
  const [quizTimerValue, setQuizTimerValue] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  const [endTimeFrom, setEndTimeFrom] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerIsOpen] = useState<boolean>(false);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission>(null);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);
  const [timerExpired, setTimerExpired] = useState<boolean>(false);
  const [actualEndTime, setActualEndTime] = useState<string | null>(null);

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
        status: q.questionTime != null ? 'data' as SubmissionStatus : 'initial',
        questionId: q.poolsQuestionId,
        time: q.questionTime,
        questionStatus: undefined,
        options_selected: []
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

  const handleAnswer = useCallback((questionId: string, optionId: string, answer?: string) => {
    setQuizSession(prev => {
      const newPendingQuestions = prev.pendingQuestions.map(q => {
        if (q.poolsQuestionId !== questionId) return q;

        const questionType = q.typeData.questionTypeLocalIdentity;

        // Create updated question
        const updatedQuestion = q.copyWith({
          optionData: q.optionData.map(option => {
            if (option.optionsId === optionId) {
              if (questionType === 'QuestionType.slider') {
                // For slider questions, store the slider value
                return option.copyWith({
                  optionSelected: true,
                  optionsIdentity: answer
                });
              }

              // Toggle for other question types
              return option.copyWith({ optionSelected: !option.optionSelected });
            }

            // Deselect other options for single-choice types
            if (
              (questionType === 'QuestionType.true_false' ||
                questionType === 'QuestionType.one_choice') &&
              option.optionSelected
            ) {
              return option.copyWith({ optionSelected: false });
            }

            return option;
          })
        });

        return updatedQuestion;
      });

      return {
        ...prev,
        pendingQuestions: newPendingQuestions,
      };
    });
  }, []);


  // Submit question to backend
  const submitQuestionToBackend = useCallback(async (question: PoolQuestion, timeTaken: number, override: boolean = false ) => {
    if (!userData) throw new Error('User not authenticated');

    const submission = quizSession.submissions.get(question.poolsQuestionId);
    if ((submission?.status === 'loading' || submission?.status === 'data') && !override) {
          return;
    }

    // Get user paramatical data for submission
    const paramatical = await getParamatical(
      userData.usersId,
      lang,
      userData.usersSex,
      userData.usersDob
    );

    if (!paramatical){
      setQuizSession(prev => {
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(question.poolsQuestionId, {
          status: 'error',
          questionId: question.poolsQuestionId,
          time: timeTaken,
          questionStatus: undefined,
          options_selected: prev.submissions.get(question.poolsQuestionId)?.options_selected ?? []
        });
        return { ...prev, submissions: newSubmissions };
      });
        return;
    }

    // Update submission status to loading
    setQuizSession(prev => {
      const newSubmissions = new Map(prev.submissions);
      newSubmissions.set(question.poolsQuestionId, {
        status: 'loading',
        questionId: question.poolsQuestionId,
        time: timeTaken,
        questionStatus: undefined,
        options_selected: prev.submissions.get(question.poolsQuestionId)?.options_selected ?? []
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

      if (data.status === 'Submission.success' || data.status === 'Submission.duplicate') {
        // Keep original questionStatus format from backend
        const questionStatus = data.question_status || data.questionStatus;
        const options_selected: string[] = data.options_selected ?? [];
        
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
          status: 'data',
          questionId: question.poolsQuestionId,
          time: timeTaken,
          questionStatus: questionStatus,
          options_selected
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
            time: timeTaken,
            questionStatus: undefined,
            options_selected: prev.submissions.get(question.poolsQuestionId)?.options_selected ?? []
          });
          return { ...prev, submissions: newSubmissions };
        });
        setClosed(true);
        determineState();
      }else{
      setQuizSession(prev => {
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(question.poolsQuestionId, {
          status: 'error',
          questionId: question.poolsQuestionId,
          time: timeTaken,
          questionStatus: undefined,
          options_selected: prev.submissions.get(question.poolsQuestionId)?.options_selected ?? []
        });
        return { ...prev, submissions: newSubmissions };
      });

      }
    } catch (error) {
      // Update submission status to error on exception
      setQuizSession(prev => {
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(question.poolsQuestionId, {
          status: 'error',
          questionId: question.poolsQuestionId,
          time: timeTaken,
          questionStatus: undefined,
          options_selected: prev.submissions.get(question.poolsQuestionId)?.options_selected ?? []
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

        // Get next question
        const shuffledPending = [...newPending].sort(() => Math.random() - 0.5);
        const nextQuestionId = shuffledPending.length > 0 ? shuffledPending[0].poolsQuestionId : null;
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(currentQuestion.poolsQuestionId, {
           status: 'loading',
           questionId: currentQuestion.poolsQuestionId,
           time: timeTaken,
           questionStatus: undefined,
           options_selected: prev.submissions.get(currentQuestion.poolsQuestionId)?.options_selected ?? []
        });

         // ✅ Mark for backend submission later
         setPendingSubmission({ question: currentQuestion, timeTaken });


        return {
          ...prev,
          pendingQuestions: shuffledPending,
          completedQuestions: newCompleted,
          currentQuestionId: nextQuestionId,
          submissions: newSubmissions
        };
      });
    },
    [setPendingSubmission]
  );

  // ✅ Trigger backend call AFTER state update
  useEffect(() => {
    if (pendingSubmission) {
      submitQuestionToBackend(
        pendingSubmission.question,
        pendingSubmission.timeTaken,
        true
      );
      setPendingSubmission(null); // clear after running
    }
  }, [pendingSubmission, submitQuestionToBackend]);

  // Handle question re-submission
  const handleRetry = useCallback(
    (questionId: string) => {
      const question = quizSession.completedQuestions.find(q => q.poolsQuestionId === questionId);
      if(question){
          submitQuestionToBackend(question, question.timeTaken ?? question.timeData.questionTimeValue);
      }
    },
    [quizSession.completedQuestions, submitQuestionToBackend]
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
    if (!questionId){
        setQuizState('quizEnd');
        return null;
    }

    // Find question in pending questions
    const currentQuestion = quizSession.pendingQuestions.find(q => q.poolsQuestionId === questionId);
    if(!currentQuestion){
      setQuizState('quizEnd');
      return null;
    }
    return currentQuestion;
  }, [quizSession.pendingQuestions]);

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

              if (newValue <= 0 || closed) {
                cleanUpQuizTimer();
                // When timer reaches zero, mark as expired and capture end time
                if (newValue <= 0 && !closed) {
                  setTimerExpired(true);
                  setActualEndTime(new Date().toISOString());
                }
                return 0;
              }

              return newValue;
            });
          }, 1000);

          return true;
        }
        return true;
      } catch (error) {
        cleanUpQuizTimer();
        return false;
      }
    }
    return false;
  }, [isTimerActive, cleanUpQuizTimer, checkEnd]);

  // Handle end quiz functionality
  const handleEndQuiz = useCallback(() => {
    // Check if there's still time remaining
    if (setupTimeLapse(quizModel)) {
      setEndTimeFrom('tracker');
      setQuizState('quizTime');
    } else {
      setQuizState('quizEnd');
    }
  }, [quizModel, setupTimeLapse]);

  // Determine state transitions
  const determineState = useCallback(() => {
    if(!quizModel)return;

    const completedQuestions = quizSession.completedQuestions;
    const pendingQuestions = quizSession.pendingQuestions;
    const allQuestionsAttempted = completedQuestions.length === quizSession.totalQuestions;

    // Check if quiz has ended (only from external factors, not user actions)
    if (checkEnd()) {
      if (quizState !== 'quizEnd') {
        setQuizState('quizEnd');
      }
      return;
    }

    // If all questions are attempted, stay in questionTrack and wait for user action
    if (allQuestionsAttempted) {
      // Check if there are questions that need automatic submission
      const hasUnsubmittedValidQuestions = completedQuestions.some(validForNotSubmitted);
      
      if (hasUnsubmittedValidQuestions) {
        automateSubmit();
      }
      
      // Stay in questionTrack regardless of submission status - wait for user to click "End Quiz"
      if (quizState !== 'questionTrack') {
        setQuizState('questionTrack');
      }
      return;
    }

    // Default to quiz play state if there are pending questions
    if (pendingQuestions.length > 0 && quizState !== 'quizPlay') {
      setQuizState('quizPlay');
      return;
    }

  }, [quizSession, quizModel, checkEnd, validForNotSubmitted, automateSubmit, quizState]);



  // Monitor quiz session and quiz model to determine state transitions
  useEffect(() => {
    if(!quizModel)return;
    determineState();
  }, [quizSession, quizModel]);


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

          if(getIsContinueEnabled(quizPool)){
            set(quizPool);
            initializeQuizSession(poolQuestions);
            startQuizStream();
          }else{
            set(null);
            setQuizState('notFound');
          }

        } else {
          set(null);
          setQuizState('notFound');
        }

      } catch (err) {
        setQuizState('error');
      }
    });
  }, [demandQuizModel, poolsId, userData, lang, initializeQuizSession, startQuizStream]);

  const getIsContinueEnabled = (quizPool: QuizPool | null): boolean => {
    if (!quizPool) return false;

    const { poolsStatus, poolsJob, poolsJobEndAt } = quizPool;
    if (poolsStatus === 'Pools.closed' || !poolsJobEndAt || poolsJob === 'PoolJob.pool_ended') return false;

    const now = new Date();
    const endAt = new Date(poolsJobEndAt);

    if (poolsJob === 'PoolJob.pool_period') return now < endAt;
    if (poolsJob === 'PoolJob.start_pool') return now >= endAt;

    return true;
  };

  const getQuestionTrackers = useCallback((): QuestionTrackerState[] => {
    const allQuestions = [
      ...quizSession.completedQuestions,
      ...quizSession.pendingQuestions,
    ];

    return allQuestions.map((question) => {
      const submission = quizSession.submissions.get(question.poolsQuestionId);

      // Determine status based on both submission record AND question state
      let status: SubmissionStatus = 'initial';
      let time = 0;
      let questionStatus: string | undefined = undefined;

      if (submission) {
        status = submission.status;
        time = submission.time || 0;
        questionStatus = submission.questionStatus;
      } else if (question.questionTime != null) {
        // Question has been timed/submitted but no submission record
        status = 'data';
        time = question.questionTime;
        // questionStatus remains undefined since we don't have the result
      } else if (question.optionData.some(option => option.optionSelected)) {
        // Question has selected answers but no submission attempt
        status = 'initial';
        time = 0;
        questionStatus = undefined;
      }

      return {
        status,
        questionId: question.poolsQuestionId,
        time,
        question: question.questionData.questionsText,
        canResubmit: validForNotSubmitted(question),
        questionStatus,
        options_selected: submission?.options_selected ?? [],
      };
    }).sort((a, b) => {
      // Sort: completed first, then in-progress, then initial
      const statusOrder = { 'data': 0, 'loading': 1, 'error': 2, 'initial': 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [
    quizSession.pendingQuestions,
    quizSession.completedQuestions,
    quizSession.submissions,
    validForNotSubmitted
  ]);


  const checkToRefreshOrResult = useCallback(async () => {
    if (!quizModel || !userData) return;

    if (quizModel.poolsCompletedAt) {
      setQuizState('quizReward');
    } else {
      await callToRefreshQuizPool(userData, quizModel.poolsId);
    }
  }, [quizModel, userData]);

  const callToRefreshQuizPool = async (userData: UserData, poolsId: string) => {
    if (refreshLoading) return;

    try {
      setRefreshLoading(true);

      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setRefreshLoading(false);
        return;
      }

      const { data, error } = await supabaseBrowser.rpc("result_quiz_pool_update", {
        p_user_id: userData.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_pool_id: poolsId
      });

      if (error) {
        setRefreshLoading(false);
        return;
      }

      if (!data) {
        setRefreshLoading(false);
        return;
      }

      if (data.status === 'Pool.allowed') {
        const quizPool = new QuizPool(data.pools_quiz);
        setQuizModel(quizPool);
      }

      setRefreshLoading(false);
    } catch (err) {
      setRefreshLoading(false);
    }
  };


  // Reset timer expired state when quiz model changes or component mounts
  useEffect(() => {
    if (quizModel?.poolsJob !== 'PoolJob.pool_period') {
      setTimerExpired(false);
      setActualEndTime(null);
    }
  }, [quizModel]);

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

  // Prevent browser back button and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if quiz is in progress (not loading, error, or completed states)
      if (['quizPlay', 'questionTrack', 'quizTime'].includes(quizState) && !allowNavigation) {
        e.preventDefault();
        // Don't use deprecated returnValue
        return t('confirm_leave_quiz');
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      // Only prevent back navigation if quiz is in progress and navigation is not allowed
      if (['quizPlay', 'questionTrack', 'quizTime'].includes(quizState) && !allowNavigation) {
        // Push current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        
        // Show confirmation dialog
        setDialogType('back');
        openDialog();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to enable popstate detection
    if (!allowNavigation) {
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [quizState, openDialog, t, allowNavigation]);

  const returnToMain = useCallback(async () => {
    setAllowNavigation(true);
    setIsNavigating(true);
    try {
      const result = await replaceAndWait('/main');
      if (!result.success) {
        console.error('Navigation failed:', result.error);
        // Fallback to window.location if router fails
        window.location.href = '/main';
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/main';
    } finally {
      setIsNavigating(false);
    }
  }, [replaceAndWait]);

  const handleConfirmLeave = useCallback(async () => {
    setIsNavigating(true);
    try {
      setAllowNavigation(true);
      const result = await replaceAndWait('/main');
      if (!result.success) {
        console.error('Navigation failed:', result.error);
        // Fallback to window.location if router fails
        window.location.href = '/main';
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/main';
    } finally {
      closeDialog();
      setIsNavigating(false);
    }
  }, [closeDialog, replaceAndWait]);

  const handleConfirmBack = useCallback(async () => {
    setIsNavigating(true);
    try {
      setAllowNavigation(true);
      const result = await replaceAndWait('/main');
      if (!result.success) {
        console.error('Navigation failed:', result.error);
        // Fallback to window.location if router fails
        window.location.href = '/main';
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/main';
    } finally {
      closeDialog();
      setIsNavigating(false);
    }
  }, [closeDialog, replaceAndWait]);

  const handleCancelLeave = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  // Render quiz content based on current state
  const renderQuizContent = () => {

    switch (quizState) {
      case 'loading':
        return (<LoadingView text="Please wait while we load your quiz..." />);

      case 'notFound':
        return (<NoResultsView text="The quiz you're looking for doesn't exist or you don't have access to it." buttonText="Exit quiz" onButtonClick={returnToMain} />);

      case 'error':
        return (<ErrorView text="Something went wrong while loading the quiz." buttonText="Try Again" onButtonClick={()=> window.location.reload()} />);

      case 'quizTime':
        return <QuizTimer 
          quizTimerValue={quizTimerValue} 
          onSkip={() => {setQuizState('quizEnd');}} 
          clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} 
          clickExit={()=> {setDialogType('exit'); openDialog();}}
          timerExpired={timerExpired}
          actualEndTime={actualEndTime}
          poolsJobEndAt={quizModel?.poolsJobEndAt}
        />;

      case 'questionTrack':
        return <QuizTracker trackerState={getQuestionTrackers()} onRetry={handleRetry} onEndClick={handleEndQuiz} />;

      case 'quizReward':
        return <QuizResults poolsId={quizModel?.poolsId || null} clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} clickExit={()=> {setDialogType('exit'); openDialog();}}/>;

      case 'quizPlay':
        const currentQuestion = getCurrentQuestion(quizSession.currentQuestionId);
        return <QuestionDisplay question={currentQuestion} onAnswer={handleAnswer} onSubmit={handleSubmitQuestion} getQuestionNumber={()=> quizSession.totalQuestions - quizSession.pendingQuestions.length + 1} totalNumber={quizSession.totalQuestions} clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} clickExit={()=> {setDialogType('exit'); openDialog();}} />;

      case 'quizEnd':
        return <QuizCompletion quizPool={quizModel} clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} clickExit={()=> {setDialogType('exit'); openDialog();}} refreshLoading={refreshLoading} clickContinueRefresh={checkToRefreshOrResult}/>;

      default:
        return null;
    }
  };

  return (
    <>
      {renderQuizContent()}
      {quizState !== 'questionTrack' && <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerIsOpen(false)}
        position="left"
        width={{
          mobile: "85%",
          tablet: "450px",
          desktop: "750px"
        }}
        backdropOpacity={0.7}
        className={`${styles.sideDrawer} ${styles[`sideDrawer_${theme}`]}`}
      >
        <SideTracker trackerState={getQuestionTrackers()} onRetry={handleRetry} onExitClick={()=> setDrawerIsOpen(false)} />
      </SideDrawer>}
      
      {/* Confirmation Dialog */}
      <DialogViewer 
        title={t('leave_quiz')}
        message={t('confirm_leave_quiz')}
        buttons={[
          { 
            text: isNavigating ? '' : t('yes_text'), 
            variant: 'danger' as const,
            loading: isNavigating,
            onClick: dialogType === 'exit' ? handleConfirmLeave : handleConfirmBack
          }
        ]}
        showCancel={true}
        cancelText={t('no_text')}
        closeOnBackdrop={!isNavigating}
      />
    </>
  );
}