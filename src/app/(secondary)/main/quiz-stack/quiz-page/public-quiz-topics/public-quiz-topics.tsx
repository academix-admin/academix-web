'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './public-quiz-topics.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendUserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { QuizPool } from '@/models/user-display-quiz-topic-model';
import { PaginateModel } from '@/models/paginate-model';
import Image from 'next/image';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { usePinnedState } from '@/hooks/pinned-state-hook';
import { useNav, useProvideObject } from "@/lib/NavigationStack";
import { usePublicQuiz } from "@/lib/stacks/public-quiz-stack";
import { poolsSubscriptionManager } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { PoolChangeEvent } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import { TimelapseManager, useTimelapseManager, TimelapseType } from '@/lib/managers/TimelapseManager';
import DialogCancel from '@/components/DialogCancel';
import { QRCodeSVG } from 'qrcode.react';
import { useActiveQuiz } from "@/lib/stacks/active-quiz-stack";


type PublicQuizTopicsProps = ComponentStateProps & {
  pType: string;
};

export default function PublicQuizTopics({ onStateChange, pType }: PublicQuizTopicsProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const nav = useNav();
  const { userData, userData$ } = useUserData();
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const maybeActivePoolId = useRef<string | null>(null);



  const [quizModels, demandUserDisplayQuizTopicModel, setUserDisplayQuizTopicModel, { isHydrated }] = usePublicQuiz(lang, pType);
  const [activeQuiz, ,] = useActiveQuiz(lang);

  // Filter out active quiz synchronously during render to prevent flash
  const filteredQuizModels = quizModels.filter(
    (m) => !activeQuiz || m.quizPool?.poolsId !== activeQuiz.quizPool?.poolsId
  );

  useEffect(() => {
    if (!isHydrated || filteredQuizModels.length <= 0) return;
    // nav.provideObject(
    //   'getQuizByPoolsId',
    //   () => (poolsId: string) => quizModels.find(q => q.quizPool?.poolsId === poolsId),
    //   { global: true, scope: 'quiz-topics' }
    // );
  }, [isHydrated, filteredQuizModels, nav]);

  // Subscribe to changes
  const handlePoolChange = useCallback((event: PoolChangeEvent) => {
    const { eventType, newRecord: quizPool, oldRecordId: poolsId } = event;
    
    // Early return if no models to update
    if (!quizModels || quizModels.length === 0) return;

    if (eventType === 'DELETE' && poolsId) {
      // Remove deleted pool
      const updatedModels = quizModels.filter(
        (m) => m.quizPool?.poolsId !== poolsId
      );
      
      // Only update if something was actually removed
      if (updatedModels.length !== quizModels.length) {
        setUserDisplayQuizTopicModel(updatedModels);
      }
      return;
    }

    if (eventType === 'UPDATE' && quizPool) {
      // Check if this pool exists in our current list
      const poolExists = quizModels.some((m) => m.quizPool?.poolsId === quizPool.poolsId);
      
      if (!poolExists) {
        // Pool doesn't belong to this list, ignore the update
        return;
      }

      // Check if this pool should be removed
      if (shouldRemoveOtherQuizPool(quizPool)) {
        const updatedModels = quizModels.filter(
          (m) => m.quizPool?.poolsId !== quizPool.poolsId
        );
        setUserDisplayQuizTopicModel(updatedModels);
        
        // Only unsubscribe if it's not the active pool the user is viewing
        if (maybeActivePoolId.current !== quizPool.poolsId) {
          poolsSubscriptionManager.removeQuizTopicPool(quizPool.poolsId);
        }
        return;
      }

      // Update the pool normally
      const updatedModels = quizModels.map((m) => {
        if (m.quizPool?.poolsId === quizPool.poolsId) {
          const topicModel = UserDisplayQuizTopicModel.from(m);
          const renewedPool = topicModel?.quizPool?.getStreamedUpdate(quizPool);
          return topicModel.copyWith({ quizPool: renewedPool });
        }
        return m;
      });

      setUserDisplayQuizTopicModel(updatedModels);
    }
  }, [quizModels, setUserDisplayQuizTopicModel]);

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
    // When activeQuiz appears, update the stored state to remove it
    const updatedModels = quizModels.filter(
      (m) => m.quizPool?.poolsId !== activeQuiz.quizPool?.poolsId
    );
    // Only update if there's actually a change
    if (updatedModels.length !== quizModels.length) {
      setUserDisplayQuizTopicModel(updatedModels);
    }
  }, [activeQuiz]);

  useEffect(() => {
    if (!quizModels?.length) return;

    let shouldUpdate = false;

    for (const quizModel of quizModels) {
      const topicsId = quizModel.topicsId;
      const poolsId = quizModel.quizPool?.poolsId;

      if (poolsId) {
        const added = poolsSubscriptionManager.addQuizTopicPool(
          {
            poolsId: poolsId,
            poolsSubscriptionType: pType
          },
          {
            override: false,
            update: false
          }
        );
        shouldUpdate = shouldUpdate || added;
      }
    }

    if (shouldUpdate) {
      poolsSubscriptionManager.updateSubscription();
    }
  }, [quizModels]);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callPaginate();
        }
      },
      { threshold: 1.0, root: scrollContainerRef.current }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [filteredQuizModels, paginateModel]);

  const fetchUserDisplayQuizTopicModel = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<UserDisplayQuizTopicModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_public_quizzes", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_type: pType,
        p_after_quiz_topics: paginateModel.toJson(),
      });


      if (error) {
        console.error("[UserDisplayQuizTopicModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendUserDisplayQuizTopicModel) => new UserDisplayQuizTopicModel(row));
    } catch (err) {
      console.error("[UserDisplayQuizTopicModel] error:", err);
      onStateChange?.('error');
      setQuizLoading(false);
      return [];
    }
  }, [lang]);

  const extractLatest = (userUserDisplayQuizTopicModel: UserDisplayQuizTopicModel[]) => {
    if (userUserDisplayQuizTopicModel.length > 0) {
      const lastItem = userUserDisplayQuizTopicModel[userUserDisplayQuizTopicModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processUserDisplayQuizTopicModelPaginate = (userUserDisplayQuizTopicModel: UserDisplayQuizTopicModel[]) => {
    const oldUserDisplayQuizTopicModelIds = quizModels.map((e) => e.topicsId);
    const newUserDisplayQuizTopicModel = [...quizModels];

    for (const quiz of userUserDisplayQuizTopicModel) {
      if (!oldUserDisplayQuizTopicModelIds.includes(quiz.topicsId)) {
        newUserDisplayQuizTopicModel.push(quiz);
      }
    }

    setUserDisplayQuizTopicModel(newUserDisplayQuizTopicModel);
  };


  useEffect(() => {
    if (!userData) return;
    demandUserDisplayQuizTopicModel(async ({ get, set }) => {
      const quizzesModel = await fetchUserDisplayQuizTopicModel(userData, 10, new PaginateModel());
      extractLatest(quizzesModel);
      set(quizzesModel);
      setFirstLoaded(true);
      onStateChange?.('data');
      refreshData();
    });
  }, [demandUserDisplayQuizTopicModel, userData]);

  useEffect(() => {
    if (filteredQuizModels.length > 0) {
      onStateChange?.('data');
    }
  }, [filteredQuizModels]);


  const callPaginate = async () => {
    if (!userData || filteredQuizModels.length <= 0 || quizLoading) return;
    setQuizLoading(true);
    const quizzesModel = await fetchUserDisplayQuizTopicModel(userData, 20, paginateModel);
    setQuizLoading(false);
    if (quizzesModel.length > 0) {
      extractLatest(quizzesModel);
      processUserDisplayQuizTopicModelPaginate(quizzesModel);
    }
  };

  const refreshData = async () => {
    if (!userData) return;

    try {
      if (activeQuiz) {
        return;
      }

      const quizzesModel = await fetchUserDisplayQuizTopicModel(userData, 10, new PaginateModel());
      if (quizzesModel.length > 0) {
        extractLatest(quizzesModel);

        const currentFirst10 = quizModels.slice(0, 10);
        const hasChanged = JSON.stringify(quizzesModel.map(q => q.quizPool?.poolsId)) !==
          JSON.stringify(currentFirst10.map(q => q.quizPool?.poolsId));

        if (hasChanged) {
          const updatedModels = [...quizzesModel, ...quizModels.slice(10)];
          setUserDisplayQuizTopicModel(updatedModels);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (isMountedRef.current) {
        timeoutRef.current = setTimeout(() => {
          refreshData();
        }, 10000);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      maybeActivePoolId.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollButtons();
    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [filteredQuizModels]);

  const getTitle = (type: string | null): string => {
    switch (type) {
      case 'creator':
        return t('followed_creator');
      case 'personalized':
        return t('discovered_interest');
      case 'public':
        return t('active_suggestions');
      default:
        return t('active_suggestions');
    }
  };

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

  if (filteredQuizModels.length <= 0) return null;

  const handleTopicClick = (topic: UserDisplayQuizTopicModel) => {
    if (activeQuiz) return;
    maybeActivePoolId.current = topic?.quizPool?.poolsId ?? null;
    nav.provideObject(
      'getQuizByPoolsId',
      () => (poolsId: string) => filteredQuizModels.find(q => q.quizPool?.poolsId === poolsId),
      { global: true, scope: 'quiz-topics' }
    );
    nav.push('quiz_commitment', { poolsId: topic?.quizPool?.poolsId, action: pType });
  };

  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {getTitle(pType)}
      </h2>
      <div className={`${styles.scrollWrapper} ${filteredQuizModels.length <= 1 ? styles.scrollWrapperExpanded : ''}`}>
        {showLeftArrow && filteredQuizModels.length > 1 && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowLeft} ${styles[`scrollArrow_${theme}`]}`}
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            ←
          </button>
        )}

        <div ref={scrollContainerRef} className={`${styles.scrollContainer} ${filteredQuizModels.length <= 1 ? styles.scrollContainerExpanded : ''}`}>
          <div className={`${styles.gridContainer} ${filteredQuizModels.length <= 1 ? styles.gridContainerExpanded : ''}`}>
            <div className={styles.row}>
              {filteredQuizModels.map((topic, rowIndex) => (
                <OpenQuizCard
                  key={topic.topicsId}
                  topic={topic}
                  length={filteredQuizModels.length}
                  getInitials={getInitials}
                  onClick={() => handleTopicClick(topic)}
                />
              ))}
            </div>
          </div>
        </div>

        {showRightArrow && filteredQuizModels.length > 1 && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowRight} ${styles[`scrollArrow_${theme}`]}`}
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            →
          </button>
        )}
      </div>

      {filteredQuizModels.length > 0 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
      {quizLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
    </div>
  );
}


interface OpenQuizCardProps {
  topic: UserDisplayQuizTopicModel;
  length: number;
  getInitials: (text: string) => string;
  onClick: () => void;
}

function OpenQuizCard({ topic, length, getInitials, onClick }: OpenQuizCardProps) {
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

    if (secs <= 0) return t('open_quiz');

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

    // Check if endTime is valid and in the future
    if (isNaN(endTime.getTime()) || startTime >= endTime) {
      console.warn('Invalid or past endTime, skipping timer setup');
      return;
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
    <div className={`${styles.quizContainer} ${styles[`quizContainer_${theme}`]} ${length > 1 ? '' : styles.expanded}`}>
      <div className={`${styles.topicCard} ${length > 1 ? '' : styles.expanded}`}>
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
                {topic.quizPool?.poolsLocale && (
                  <>
                    <span style={{ margin: '0 8px' }}>•</span>
                    {topic.quizPool.poolsLocale.toUpperCase()}
                  </>
                )}
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
            onClick={() => codeBottomController.open()}
          >
            <div className={styles.codeIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
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
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
              </svg>
            </div>
            <span className={styles.codeCopyText}>
              {quizCode}
            </span>
            <div className={styles.copyContainer}>
              <div className={styles.copyIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </BottomViewer>
    </div>
  );
}
