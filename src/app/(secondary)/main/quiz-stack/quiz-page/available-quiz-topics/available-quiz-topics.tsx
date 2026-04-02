'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './available-quiz-topics.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendUserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { PaginateModel } from '@/models/paginate-model';
import Image from 'next/image';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { usePinnedState } from '@/hooks/pinned-state-hook';
import { useNav, useProvideObject } from "@/lib/NavigationStack";
import { useAvailableQuiz } from "@/lib/stacks/available-quiz-stack";
import { useActiveQuiz } from "@/lib/stacks/active-quiz-stack";

type AvailableQuizTopicsProps = ComponentStateProps & {
  pType: string;
};

export default function AvailableQuizTopics({ onStateChange, pType }: AvailableQuizTopicsProps) {
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


  const [quizModels, demandUserDisplayQuizTopicModel, setUserDisplayQuizTopicModel, { isHydrated }] = useAvailableQuiz(lang, pType);

  const [activeQuiz, ,] = useActiveQuiz(lang);

  // Filter out active quiz synchronously during render to prevent flash
  const filteredQuizModels = quizModels.filter(
    (m) => !activeQuiz || m.topicsId !== activeQuiz.topicsId
  );

  useEffect(() => {
    if (!isHydrated || filteredQuizModels.length <= 0) return;
    // nav.provideObject(
    //   'getQuizByTopicsId',
    //   () => (topicsId: string) => quizModels.find(q => q.topicsId === topicsId),
    //   { global: true, scope: 'quiz-topics' }
    // );
  }, [isHydrated, filteredQuizModels, nav]);

  useEffect(() => {
    if (!activeQuiz) return;
    // When activeQuiz appears, update the stored state to remove it
    const updatedModels = quizModels.filter(
      (m) => m.topicsId !== activeQuiz.topicsId
    );
    // Only update if there's actually a change
    if (updatedModels.length !== quizModels.length) {
      setUserDisplayQuizTopicModel(updatedModels);
    }
  }, [activeQuiz]);

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

      const { data, error } = await supabaseBrowser.rpc("fetch_available_quizzes", {
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);


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
        const hasChanged = JSON.stringify(quizzesModel.map(q => q.topicsId)) !==
          JSON.stringify(currentFirst10.map(q => q.topicsId));

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
        return t('favourite_contributors');
      case 'personalized':
        return t('just_for_you');
      case 'public':
        return t('might_interest_you');
      default:
        return t('error_occurred');
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

  function createSubgroups<T>(list: T[], subgroupLength: number): T[][] {
    const result: T[][] = [];
    const totalGroups = Math.ceil(list.length / subgroupLength);

    for (let i = 0; i < totalGroups; i++) {
      const start = i * subgroupLength;
      const end = Math.min((i + 1) * subgroupLength, list.length);
      result.push(list.slice(start, end));
    }

    return result;
  }

  const handleTopicClick = (topic: UserDisplayQuizTopicModel) => {
    if (activeQuiz) return;
    nav.provideObject(
      'getQuizByTopicsId',
      () => (topicsId: string) => filteredQuizModels.find(q => q.topicsId === topicsId),
      { global: true, scope: 'quiz-topics' }
    );
    nav.push('quiz_challenge', { topicsId: topic.topicsId, pType: pType });
  };


  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {getTitle(pType)}
      </h2>

      <div className={styles.scrollWrapper}>
        {showLeftArrow && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowLeft} ${styles[`scrollArrow_${theme}`]}`}
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            ←
          </button>
        )}

        <div ref={scrollContainerRef} className={styles.scrollContainer}>
          <div className={styles.gridContainer}>
            <div className={styles.row}>
              {createSubgroups(filteredQuizModels, 2).map((topics, rowIndex) => (
                <div className={styles.column} key={rowIndex}>
                  {topics.map((topic) => (
                    <TopicCard
                      key={topic.topicsId}
                      topic={topic}
                      theme={theme}
                      getInitials={getInitials}
                      formatDate={formatDate}
                      onClick={() => handleTopicClick(topic)}
                    />
                  ))}
                </div>
              ))}
              {filteredQuizModels.length > 2 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
              {quizLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
            </div>
          </div>
        </div>

        {showRightArrow && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowRight} ${styles[`scrollArrow_${theme}`]}`}
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: UserDisplayQuizTopicModel;
  theme: string;
  getInitials: (text: string) => string;
  formatDate: (dateString: string) => string;
  onClick: () => void;
}

function TopicCard({ topic, theme, getInitials, formatDate, onClick }: TopicCardProps) {
  const [imageError, setImageError] = useState(false);
  const [userImageError, setUserImageError] = useState(false);

  return (
    <div
      className={`${styles.topicCard} ${styles[`topicCard_${theme}`]}`}
      onClick={onClick}
      role="button"
    >
      <div className={styles.cardContent}>
        {/* Topic Image/Initials */}
        <div className={styles.topicImageContainer}>
          {topic.topicsImageUrl && !imageError ? (
            <Image
              src={topic.topicsImageUrl}
              alt={topic.topicsIdentity}
              width={60}
              height={60}
              className={styles.topicImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.topicInitials}>
              {getInitials(topic.topicsIdentity)}
            </div>
          )}
        </div>

        {/* Topic Info */}
        <div className={styles.topicInfo}>
          <div className={styles.topicHeader}>
            <h3 className={`${styles.topicTitle} ${styles[`topicTitle_${theme}`]}`}>
              {capitalize(topic.topicsIdentity)}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {topic.quizPool?.poolsLocale && (
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  backgroundColor: theme === 'light' ? '#e3f2fd' : '#1e3a5f',
                  color: theme === 'light' ? '#1976d2' : '#64b5f6'
                }}>
                  {topic.quizPool.poolsLocale.toUpperCase()}
                </span>
              )}
              <span className={`${styles.topicDate} ${styles[`topicDate_${theme}`]}`}>
                {formatDate(topic.topicsCreatedAt)}
              </span>
            </div>
          </div>

          {/* Creator Info */}
          <div className={styles.creatorInfo}>
            <div className={styles.creatorImageContainer}>
              {topic.userImageUrl && !userImageError ? (
                <Image
                  src={topic.userImageUrl}
                  alt={topic.fullNameText}
                  width={34}
                  height={34}
                  className={styles.creatorImage}
                  onError={() => setUserImageError(true)}
                />
              ) : (
                <div className={styles.creatorInitials}>
                  {getInitials(topic.fullNameText || topic.usernameText)}
                </div>
              )}
            </div>

            <div className={styles.creatorDetails}>
              <span className={`${styles.creatorName} ${styles[`creatorName_${theme}`]}`}>
                {topic.usernameText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
