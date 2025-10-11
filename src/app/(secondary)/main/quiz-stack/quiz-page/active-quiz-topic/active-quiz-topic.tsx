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
import { useNav } from "@/lib/NavigationStack";
import { useActiveQuiz } from "@/lib/stacks/active-quiz-stack";
import { poolsSubscriptionManager } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { PoolChangeEvent } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import { TimelapseManager, useTimelapseManager, TimelapseType  } from '@/lib/managers/TimelapseManager';
import DialogCancel from '@/components/DialogCancel';
import { QRCodeSVG } from 'qrcode.react';


export default function ActiveQuizTopic({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const nav = useNav();
  const { userData, userData$ } = useUserData();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const [firstLoaded, setFirstLoaded] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);


  const [activeQuiz, demandActiveQuizTopicModel, setActiveQuizTopicModel] = useActiveQuiz(lang);

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

    // Convert the UTC timestamp (from Supabase) to a local Date object
    const date = updatedPool.poolsStartingAt
      ? new Date(updatedPool.poolsStartingAt)
      : null;

    // Check if the pool has already started
    const hasStarted =
      date !== null && date < new Date();

    // Check if the pool is active or closed
    const statusCheck =
      updatedPool.poolsStatus === 'Pools.active' ||
      updatedPool.poolsStatus === 'Pools.closed';

    // Check if the pool job is cancelled or ended
    const jobCheck =
      updatedPool.poolsJob === 'PoolJob.cancelled' ||
      updatedPool.poolsJob === 'PoolJob.pool_ended';

    return hasStarted || statusCheck || jobCheck;
  }

  useEffect(() => {
    poolsSubscriptionManager.attachListener(handlePoolChange);

    return () => {
      poolsSubscriptionManager.removeListener(handlePoolChange);
    };
  }, [handlePoolChange]);

  useEffect(() => {
    if (!activeQuiz) return;


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
    demandActiveQuizTopicModel(async ({ get, set }) => {
      if (!userData || activeQuiz) return;
      setFirstLoaded(true);
      const active = await fetchActiveQuizTopicModel(userData);
      set(active);
      setFirstLoaded(false);
      onStateChange?.('data');
      // Start the first call
      refreshData();
    });
  }, [demandActiveQuizTopicModel]);


  const refreshData = async () => {
    if (!userData) return;
    try {
        const active = await fetchActiveQuizTopicModel(userData);
        setActiveQuizTopicModel(active);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      // Schedule next call only if component is still mounted
      if (isMountedRef.current) {
        timeoutRef.current = setTimeout(() => {
          refreshData();
        }, 10000);
      }
    }

  };

  useEffect(() => {
    isMountedRef.current = true;
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);


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
    nav.push('quiz_commitment',{poolsId: activeQuiz?.quizPool?.poolsId, action: 'action'});
  };

  return (
    <div className={styles.container}>
            {activeQuiz &&
                  <OpenQuizCard
                    key={activeQuiz.topicsId}
                    topic={activeQuiz}
                    getInitials={getInitials}
                    onClick={()=> handleTopicClick(activeQuiz)}
                  /> }
    </div>
  );
}


interface OpenQuizCardProps {
  topic: UserDisplayQuizTopicModel;
  getInitials: (text: string) => string;
  onClick: () => void;
}

function OpenQuizCard({ topic, getInitials, onClick  }: OpenQuizCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [imageError, setImageError] = useState(false);
  const timelapseManager = useTimelapseManager();
  const [codeBottomViewerId, codeBottomController, codeBottomIsOpen] = useBottomController();

  // Track previous values to detect changes
  const previousJobRef = useRef<string | null>(null);
  const previousEndAtRef = useRef<string | null>(null);

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
  }, [topic.quizPool?.poolsJobEndAt, topic.quizPool?.poolsJob, timelapseManager]);

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

  const status = topic.quizPool?.poolsJob || '';
  const displayTime = formatQuizPoolStatusTime(status, remainingTime);
  const quizCode = topic.quizPool?.poolsCode || '';

  return (
    <div className={`${styles.quizContainer} ${styles[`quizContainer_${theme}`]}`}>
      <div className={`${styles.topicCard}`}>
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
              <div className={styles.challengeIdentity}>
                {topic.quizPool?.challengeModel?.challengeIdentity?.toUpperCase()}
              </div>
              <h3 className={styles.topicTitle}>
                {topic.topicsIdentity}
              </h3>
            </div>
          </div>
        </div>

        {/* Bottom Section with Code and Join Button */}
        <div className={styles.bottomSection}>
          {/* Quiz Code */}
          <div
            className={styles.codeContainer}
            onClick={()=> codeBottomController.open()}
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

          {/* Join Button */}
          <button
            className={styles.joinButton}
            onClick={onClick}
          >
            {t('join_text')}
          </button>
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
    </div>
  );
}
