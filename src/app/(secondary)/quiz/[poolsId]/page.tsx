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
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import QuestionDisplay from './question-display/question-display'
import QuizTimer from './quiz-timer/quiz-timer'
import QuizCompletion from './quiz-completion/quiz-completion'
import QuizTracker from './quiz-tracker/quiz-tracker'
import SideDrawer from '@/lib/SideDrawer';
import SideTracker from './side-tracker/side-tracker'

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

interface QuizResult {
  userResult: PoolMemberModel | null;
  rankResults: PoolMemberModel[];
}

type PendingSubmission = {
  question: PoolQuestion;
  timeTaken: number;
} | null;


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

  const [endTimeFrom, setEndTimeFrom] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerIsOpen] = useState<boolean>(false);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission>(null);

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
        time: q.questionTime
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
            console.log(' MAIN: Question already being processed, skipping', question.poolsQuestionId);
            return;
    }

    // Get user paramatical data for submission
    const paramatical = await getParamatical(
      userData.usersId,
      lang,
      userData.usersSex,
      userData.usersDob
    );

    if (!paramatical) return;

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
          status: 'data',
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

        // Get next question
        const shuffledPending = [...newPending].sort(() => Math.random() - 0.5);
        const nextQuestionId = shuffledPending.length > 0 ? shuffledPending[0].poolsQuestionId : null;
        const newSubmissions = new Map(prev.submissions);
        newSubmissions.set(currentQuestion.poolsQuestionId, {
           status: 'loading',
           questionId: currentQuestion.poolsQuestionId,
           time: timeTaken
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
    [submitQuestionToBackend]
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

    if (pendingQuestions.length === 0 && hasUnsubmittedValidQuestions && completedQuestions.length === quizSession.totalQuestions && (endTimeFrom === null || endTimeFrom !== 'timer')) {
      setQuizState('questionTrack');
      automateSubmit();
      return;
    }

    // Check if all questions are completed and submitted
    const allSubmitted = completedQuestions.filter(validForNotSubmitted).length === 0 &&
                       completedQuestions.length === quizSession.totalQuestions;

    if (setupTimeLapse(quizModel) && pendingQuestions.length === 0 && allSubmitted && (endTimeFrom === null || endTimeFrom !== 'timer')) {
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

  }, [quizSession, quizModel, checkEnd, validForNotSubmitted, automateSubmit, quizState, endTimeFrom]);

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
        console.error("[QuizModel] error:", err);
        setQuizState('error');
      }
    });
  }, [demandQuizModel, poolsId, userData, lang, initializeQuizSession, startQuizStream]);

  const getIsContinueEnabled = (quizPool: QuizPool | null): boolean => {
    if (!quizPool) return false;

    const { poolsStatus, poolsJob, poolsJobEndAt } = quizPool;
    if (poolsStatus === 'Pools.close' || !poolsJobEndAt || poolsJob === 'PoolJob.pool_ended') return false;

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

      if (submission) {
        status = submission.status;
        time = submission.time || 0;
      } else if (question.questionTime != null) {
        // Question has been timed/submitted but no submission record
        status = 'data';
        time = question.questionTime;
      } else if (question.optionData.some(option => option.optionSelected)) {
        // Question has selected answers but no submission attempt
        status = 'initial';
        time = 0;
      }

      return {
        status,
        questionId: question.poolsQuestionId,
        time,
        question: question.questionData.questionsText,
        canResubmit: validForNotSubmitted(question)
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
  ]);

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
        return (<LoadingView text="Please wait while we load your quiz..." />);

      case 'notFound':
        return (<NoResultsView text="The quiz you're looking for doesn't exist or you don't have access to it." buttonText="Try Again" onButtonClick={()=> window.location.reload()} />);

      case 'error':
        return (<ErrorView text="Something went wrong while loading the quiz." buttonText="Try Again" onButtonClick={()=> window.location.reload()} />);

      case 'quizTime':
        return <QuizTimer quizTimerValue={quizTimerValue} onSkip={() => {setEndTimeFrom('timer'); setQuizState('quizEnd');}} clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} clickExit={()=> console.log('clicked exit')}/>;

      case 'quizPlay':
        const currentQuestion = getCurrentQuestion(quizSession.currentQuestionId);
        if (!currentQuestion) return null;

        return <QuestionDisplay question={currentQuestion} onAnswer={handleAnswer} onSubmit={handleSubmitQuestion} getQuestionNumber={()=> quizSession.totalQuestions - quizSession.pendingQuestions.length + 1} totalNumber={quizSession.totalQuestions} clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} clickExit={()=> console.log('clicked exit')} />;

      case 'quizEnd':
        return <QuizCompletion quizPool={quizModel} clickMenu={()=> setDrawerIsOpen(!isDrawerOpen)} clickExit={()=> console.log('clicked exit')}/>;

      case 'questionTrack':
        return <QuizTracker trackerState={getQuestionTrackers()} onRetry={handleRetry} onEndClick={()=> {setEndTimeFrom('tracker'); determineState();}} />;

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
    </>
  );
}