'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './active-quiz-topic.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendUserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { QuizPool } from '@/models/user-display-quiz-topic-model';
import Image from 'next/image';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { usePinnedState } from '@/hooks/pinned-state-hook';
import { useNav, usePageLifecycle } from "@/lib/NavigationStack";
import { useActiveQuiz } from "@/lib/stacks/active-quiz-stack";
import { poolsSubscriptionManager } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { PoolChangeEvent } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import { TimelapseManager, useTimelapseManager, TimelapseType  } from '@/lib/managers/TimelapseManager';
import DialogCancel from '@/components/DialogCancel';
import { QRCodeSVG } from 'qrcode.react';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { TransactionModel } from '@/models/transaction-model';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import QuizStarter from '../quiz-starter/quiz-starter'
import { useQuizDisplay } from "@/lib/stacks/quiz-display-stack";

interface LeaveQuizResponse {
  status: string;
  pools_id?: string;
}

export default function ActiveQuizTopic({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const nav = useNav();
  const { userData, userData$, __meta } = useUserData();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const { pushAndWait } = useAwaitableRouter();
  const isRefreshingRef = useRef(false);

  const [firstLoaded, setFirstLoaded] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);


  const [activeQuiz, demandActiveQuizTopicModel, setActiveQuizTopicModel] = useActiveQuiz(lang);
  const [transactionModels, demandTransactionModels, setTransactionModels] = useTransactionModel(lang);
    const { closeDisplay, controlDisplayMessage } = useQuizDisplay();


  // Subscribe to changes
  const handlePoolChange = (event: PoolChangeEvent) => {
    const { eventType, newRecord: quizPool, oldRecordId: poolsId } = event;
    if (!activeQuiz) return;
    if (eventType === 'DELETE' && poolsId) {
      // 🔹 Remove deleted pool
      setActiveQuizTopicModel(null);

    } else if (quizPool) {
      // 🔹 If this updated pool should be removed (e.g., already started, closed, or cancelled)
      if (shouldRemoveOtherQuizPool(quizPool)) {
        setActiveQuizTopicModel(null);
        poolsSubscriptionManager.removeQuizTopicPool(quizPool.poolsId);
        return;
      }

      // 🔹 Otherwise, update the pool normally
      const topicModel = UserDisplayQuizTopicModel.from(activeQuiz);
      const renewedPool = topicModel?.quizPool?.getStreamedUpdate(quizPool);
      setActiveQuizTopicModel(topicModel.copyWith({ quizPool: renewedPool }));
    }
  };

  function shouldRemoveOtherQuizPool(updatedPool?: QuizPool | null): boolean {
    if (!updatedPool) return false;

//     // Convert the UTC timestamp (from Supabase) to a local Date object
//     const date = updatedPool.poolsStartingAt
//       ? new Date(updatedPool.poolsStartingAt)
//       : null;


    // Check if the pool is closed
    const statusCheck =
      updatedPool.poolsStatus === 'Pools.closed';

    // Check if the pool job is cancelled or ended
    const jobCheck =
      updatedPool.poolsJob === 'PoolJob.cancelled' ||
      updatedPool.poolsJob === 'PoolJob.pool_ended';

    return  statusCheck || jobCheck;
  }

  useEffect(() => {
    poolsSubscriptionManager.attachListener(handlePoolChange);

    return () => {
      poolsSubscriptionManager.removeListener(handlePoolChange);
    };
  }, [handlePoolChange]);

  useEffect(() => {
    if (!activeQuiz){
         closeDisplay();
        return;
        }


      const topicsId = activeQuiz.topicsId;
      const poolsId = activeQuiz.quizPool?.poolsId;

      if (poolsId) {
        poolsSubscriptionManager.addQuizTopicPool(
          {
            poolsId: poolsId,
            poolsSubscriptionType: 'active'
          }
        );

      }
  }, [activeQuiz]);


  const fetchActiveQuizTopicModel = useCallback(async (userData: UserData): Promise<UserDisplayQuizTopicModel | null> => {
    if (!userData) return null;

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return null;

      const { data, error } = await supabaseBrowser.rpc("get_active_quiz", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age
      });


      if (error) {
        console.error("[UserDisplayQuizTopicModel] error:", error);
        return null;
      }
      if(data){
          return new UserDisplayQuizTopicModel(data);
      }else{
          return null;
      }
    } catch (err) {
      console.error("[UserDisplayQuizTopicModel] error:", err);
      onStateChange?.('error');
      setQuizLoading(false);
      return null;
    }
  }, [lang]);


  useEffect(() => {
      if (!userData) return;
    demandActiveQuizTopicModel(async ({ get, set }) => {
      setFirstLoaded(true);
      const active = await fetchActiveQuizTopicModel(userData);
      set(active);
      setFirstLoaded(false);
      onStateChange?.('data');
      // Start the first call
      refreshData();
    });
  }, [demandActiveQuizTopicModel, userData]);


  const refreshData = async () => {
    if (!userData) return;
    if (isRefreshingRef.current) return; // 🚫 already running
      isRefreshingRef.current = true;
    try {
        const active = await fetchActiveQuizTopicModel(userData);
        if(active?.quizPool)poolsSubscriptionManager.handleQuizTopicData('UPDATE', active.quizPool ?? null, undefined , active.quizPool?.poolsId );
        if(!active && activeQuiz)poolsSubscriptionManager.handleQuizTopicData('DELETE', null, activeQuiz.quizPool?.poolsId , activeQuiz.quizPool?.poolsId );
        if(activeQuiz?.quizPool?.poolsId && !active)poolsSubscriptionManager.removeQuizTopicPool(activeQuiz.quizPool.poolsId);
        setActiveQuizTopicModel(active);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
        isRefreshingRef.current = false; // ✅ unlock
      // Schedule next call only if component is still mounted
      if (isMountedRef.current) {
        timeoutRef.current = setTimeout(() => {
          refreshData();
        }, 10000);
      }
    }

  };

  useEffect(() => {
    if(!__meta.isHydrated)return;
    isMountedRef.current = true;
    refreshData();
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [__meta.isHydrated]);


   const getInitials = (text: string): string => {
     if (!text) return '?';
     return text.split(' ')
       .map(word => word.charAt(0).toUpperCase())
       .slice(0, 2)
       .join('');
   };

   const formatDate = (dateString: string): string => {
       const date = new Date(dateString);
       const options: Intl.DateTimeFormatOptions = {
         month: 'short',
         day: 'numeric',
       };

       const timeOptions: Intl.DateTimeFormatOptions = {
         hour: 'numeric',
         minute: '2-digit',
         hour12: true
       };

       const formattedDate = date.toLocaleDateString('en-US', options);
       const formattedTime = date.toLocaleTimeString('en-US', timeOptions)
         .toLowerCase()
         .replace(' ', '');

       return `${formattedDate} at ${formattedTime}`;
     };

  if(!activeQuiz) return null;


  const handleTopicClick = (topic: UserDisplayQuizTopicModel) => {
    nav.push('quiz_commitment',{poolsId: activeQuiz?.quizPool?.poolsId, action: 'active'});
  };



  // Function to leave quiz API call
  const leaveQuiz = async (jwt: string, data: any): Promise<LeaveQuizResponse> => {
    const proxyUrl = '/api/leave';

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("Leave Quiz API error:", error);
      throw error;
    }
  };

  const handleLeave = async () => {
    if (!userData) return;

    try {
      const location = await checkLocation();
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        return;
      }

      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.log('no JWT token');
        return;
      }

      const requestData = {
        userId: userData.usersId,
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age
      };

      const leave = await leaveQuiz(jwt, requestData);
      const status = leave.status;

      console.log(leave);

      if (status === 'PoolActive.success') {
         if(activeQuiz?.quizPool?.poolsId)poolsSubscriptionManager.removeQuizTopicPool(activeQuiz.quizPool.poolsId);
         setActiveQuizTopicModel(null);
         const updatedModels = transactionModels.filter(
             (m) => m.poolsId !== leave.pools_id
         );
         setTransactionModels(updatedModels);
      }else if(status === 'PoolActive.no_active' && activeQuiz){
         if(activeQuiz?.quizPool?.poolsId)poolsSubscriptionManager.removeQuizTopicPool(activeQuiz.quizPool.poolsId);
         setActiveQuizTopicModel(null);
         const updatedModels = transactionModels.filter(
             (m) => m.poolsId !== leave.pools_id
         );
         setTransactionModels(updatedModels);
      }
    } catch (error: any) {
      console.error("Top up error:", error);
    }
  };

  const getIsContinueEnabled = (quiz: UserDisplayQuizTopicModel | null): boolean => {
    if (!quiz?.quizPool) return false;

    const { poolsStatus, poolsJob, poolsJobEndAt } = quiz.quizPool;
    if (poolsStatus !== 'Pools.active' || !poolsJobEndAt) return false;

    const now = new Date();
    const endAt = new Date(poolsJobEndAt);

    if (poolsJob === 'PoolJob.pool_period') return now < endAt;
    if (poolsJob === 'PoolJob.start_pool') return now >= endAt;

    return false;
  };


  const onContinueClick = async () => {
    if(!userData || !activeQuiz.quizPool?.poolsId)return;
    await pushAndWait(`/quiz/${activeQuiz.quizPool?.poolsId}`);
  };

  return (
    <div className={styles.container}>
            {activeQuiz &&
                  <CurrentQuizCard
                    topic={activeQuiz}
                    getInitials={getInitials}
                    onClick={()=> handleTopicClick(activeQuiz)}
                    onLeave={handleLeave}
                    showContinue={getIsContinueEnabled(activeQuiz)}
                    onContinue={onContinueClick}
                  /> }
    </div>
  );
}


interface CurrentQuizCardProps {
  topic: UserDisplayQuizTopicModel;
  getInitials: (text: string) => string;
  onClick: () => void;
  onLeave: () => void;
  showContinue: boolean;
  onContinue: () => Promise<void>;
}

function CurrentQuizCard({ topic, getInitials, onClick, onLeave, showContinue, onContinue  }: CurrentQuizCardProps) {
  const { theme } = useTheme();
  const { t, tNode } = useLanguage();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [imageError, setImageError] = useState(false);
  const timelapseManager = useTimelapseManager();
  const nav = useNav();

  const [codeBottomViewerId, codeBottomController, codeBottomIsOpen] = useBottomController();
  const [quizStarterBottomViewerId, quizStarterBottomController, quizStarterBottomIsOpen] = useBottomController();
  const [leaving, setLeaving] = useState(false);

  // Track previous values to detect changes
  const previousJobRef = useRef<string | null>(null);
  const previousEndAtRef = useRef<string | null>(null);

  const { controlDisplayMessage, lastEvent, closeDisplay } = useQuizDisplay();


  const formatQuizPoolStatusTime = useCallback((status: string | null, seconds: number): string => {
    if (!status) return t('open_quiz');

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

   if(secs <= 0)return t('open_quiz');

    const timeString = hours > 0
      ? `${hours}h ${minutes}m`
      : minutes > 0
      ? `${minutes}m ${secs}s`
      : `${secs}s`;

    switch (status) {
      case 'PoolJob.waiting':
        return `${t('waiting_time')} | ${timeString}`;
      case 'PoolJob.extended_waiting':
        return `${t('extended_time')} | ${timeString}`;
      case 'PoolJob.pool_period':
        return `${t('pool_time')} | ${timeString}`;
      case 'PoolJob.start_pool':
        return `${t('starting_time')} | ${timeString}`;
      case 'PoolJob.cancelled':
        return 'Quiz cancelled';
      default:
        return t('open_quiz');
    }
  }, []);

  const handleTimeUpdate = (remaining: number) => {
     setRemainingTime(Math.floor(remaining / 1000)); // Convert to seconds
  };

  useEffect(() => {
    if (!timelapseManager.current || !topic.quizPool?.poolsJobEndAt) return;

    const endTime = new Date(topic.quizPool.poolsJobEndAt);
    const startTime = new Date();
    if (topic.quizPool?.poolsJob && topic.quizPool?.poolsJobEndAt) {
      controlDisplayMessage(topic.quizPool.poolsJob, topic.quizPool.poolsJobEndAt);
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
      };
    } catch (error) {
      console.error('Quiz timer error:', error);

    }
  }, [topic.quizPool?.poolsJobEndAt, topic.quizPool?.poolsJob]);

    // ✅ Clean lifecycle management with embedded hook
    usePageLifecycle(nav, {
      onResume: ({ stack, current }) => {
         if (topic.quizPool?.poolsJob && topic.quizPool?.poolsJobEndAt) {
               controlDisplayMessage(topic.quizPool.poolsJob, topic.quizPool.poolsJobEndAt);
         }
      }
    }, [topic]);

  const handleCopyCode = async () => {
    if (!topic.quizPool?.poolsCode) return;

    try {
      await navigator.clipboard.writeText(topic.quizPool.poolsCode);
      // Show toast notification (you'll need to implement this)
      console.log('Copied to clipboard');
      codeBottomController.close();
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

   const handleLeaveClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setLeaving(true);
      try {
        await onLeave();
      } finally {
        setLeaving(false);
      }
    };

   useEffect(() => {
       if (lastEvent?.isOpen) {
         // Show your quiz starter component
         quizStarterBottomController.close();
         quizStarterBottomController.open();
       } else {
         // Hide your quiz starter component
         quizStarterBottomController.close();
       }
   }, [lastEvent]);

   const handleQuizDisplayClose =  () => {
      quizStarterBottomController.close();
      closeDisplay();
   };
   const handleContinue =  async () => {
      await onContinue();
      handleQuizDisplayClose();
   };

  const status = topic.quizPool?.poolsJob || '';
  const displayTime = formatQuizPoolStatusTime(status, remainingTime);
  const quizCode = topic.quizPool?.poolsCode || '';
  const answeredCount = topic.quizPool?.questionTrackerCount || 0;
  const totalQuestions = topic.quizPool?.challengeModel?.challengeQuestionCount || 0;

  return (
    <div className={`${styles.quizContainer} ${styles[`quizContainer_${theme}`]}`} >
      <div className={`${styles.topicCard}`} onClick={onClick}>
        {/* Main Image with Overlay */}
        <div className={styles.imageContainer}>
          {topic.topicsImageUrl && !imageError ? (
            <Image
              src={topic.topicsImageUrl}
              alt={topic.topicsIdentity}
              fill
              className={styles.image}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.imageFallback}>
              {getInitials(topic.topicsIdentity)}
            </div>
          )}

          {/* Gradient Overlays */}
          <div className={styles.bottomGradient} />

          {/* Content Overlay */}
          <div className={styles.contentOverlay}>
            {/* Status Badge */}
            <div className={styles.statusBadge}>
              {displayTime}
            </div>

            {/* Text Content */}
            <div className={styles.textContent}>
             <div className={styles.pendingQuiz}>
                {t('pending_quiz')}
              </div>
              <h3 className={styles.topicTitle}>
                {topic.topicsIdentity}
              </h3>
              <div className={styles.progressInfo}>
                <span className={styles.progressText}>
                  {tNode('answered_out_of', { answered: <strong>{answeredCount}</strong>, total: <strong>{totalQuestions}</strong> })}
                </span>
                <span className={styles.progressDot}>●</span>
                <span className={styles.challengeIdentity}>
                  {topic.quizPool?.challengeModel?.challengeIdentity?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section with Code and Join Button */}
        <div className={styles.bottomSection}>
          {/* Quiz Code */}
          <div
            className={styles.codeContainer}
            onClick={(e: React.MouseEvent) => {
               e.stopPropagation();
               codeBottomController.open();
            }}
          >
            <div className={styles.codeIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
              </svg>
            </div>
            <span className={styles.codeText}>
              {quizCode}
            </span>
          </div>

          {/* Leave Button */}
          {(topic.quizPool?.poolsStatus === 'Pools.open') && <button
            role="button"
            className={styles.leaveButton}
            onClick={handleLeaveClick}
            disabled={leaving || topic.quizPool?.poolsStatus != 'Pools.open'}
          >
            {leaving ? (
                          <div className={styles.leaveSpinner}></div>
                        ) : (
                          t('leave_text')
                        )}
          </button>}
          {/* Continue Button */}
          {(topic.quizPool?.poolsStatus != 'Pools.open')  && <button
            role="button"
            className={styles.continueButton}
            disabled={!showContinue}
            onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onContinue();
                }}
          >
            {t('continue')}
          </button>}
        </div>
      </div>

      {/* QR Code Bottom Sheet */}
      <BottomViewer
        id={codeBottomViewerId}
        isOpen={codeBottomIsOpen}
        onClose={codeBottomController.close}
        cancelButton={{
          position: "right",
          onClick: codeBottomController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>
            {t('scan_quiz_code') || 'Scan Quiz Code'}
          </h3>

          {/* QR Code Display */}
          <div className={styles.qrContainer}>
            <QRCodeSVG
              value={quizCode}
              size={200}
              level="H"
              includeMargin
              fgColor={theme === 'light' ? '#000000' : '#ffffff'}
              bgColor={theme === 'light' ? '#ffffff' : '#121212'}
            />
          </div>

          {/* Code with Copy Functionality */}
          <div
            className={styles.codeCopyContainer}
            onClick={handleCopyCode}
            role="button"
            tabIndex={0}
          >
            <div className={styles.codeCopyIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
              </svg>
            </div>
            <span className={styles.codeCopyText}>
              {quizCode}
            </span>
            <div className={styles.copyContainer}>
              <div className={styles.copyIcon}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
               </svg>
              </div>
            </div>
          </div>
        </div>
      </BottomViewer>

      <BottomViewer
        id={quizStarterBottomViewerId}
        isOpen={quizStarterBottomIsOpen}
        onClose={handleQuizDisplayClose}
        cancelButton={{
          position: "right",
          onClick: handleQuizDisplayClose,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        {lastEvent?.status && lastEvent?.jobEndAt && topic.quizPool?.challengeModel?.challengeIdentity && (
          <QuizStarter
            title={topic.topicsIdentity}
            challenge={topic.quizPool.challengeModel.challengeIdentity}
            mode={topic.quizPool.challengeModel.gameModeModel?.gameModeIdentity ?? ''}
            status={lastEvent.status}
            jobEndAt={lastEvent.jobEndAt}
            onContinueClick={handleContinue}
          />
        )}
      </BottomViewer>

    </div>
  );
}
