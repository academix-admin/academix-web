'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './game-challenge.module.css';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendChallengeModel } from '@/models/user-display-quiz-topic-model';
import { ChallengeModel } from '@/models/user-display-quiz-topic-model';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

interface GameChallengeProps {
  topicsId: string;
  gameModeId: string;
  onChallengeSelect: (challenge: ChallengeModel) => void;
}

export default function GameChallenge({ onChallengeSelect, topicsId, gameModeId }: GameChallengeProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedChallengeModel, setSelectedChallengeModel] = useState<ChallengeModel | null>(null);
  const [challengeModel, setChallengeModel] = useState<ChallengeModel[]>([]);


  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && challengeModel.length > 0 && !challengeLoading) {
          callPaginate();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [challengeModel, challengeLoading]);

  // Fetch challenges
  const fetchChallengeModel = useCallback(async (userData: UserData): Promise<ChallengeModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_quiz_challenges", {
        p_owner_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        topic_id: topicsId,
        p_game_mode_id: gameModeId
      });

      if (error) {
        console.error("[ChallengeModel] error:", error);
        setError(t('error_fetching_challenges'));
        return [];
      }

      setError('');
      return (data || []).map((row: BackendChallengeModel) => new ChallengeModel(row));
    } catch (err) {
      console.error("[ChallengeModel] error:", err);
      setError(t('error_fetching_challenges'));
      setChallengeLoading(false);
      return [];
    }
  }, [lang, t, topicsId, gameModeId]);


  // Process paginated challenges
  const processChallengeModelPaginate = (userChallengeModel: ChallengeModel[]) => {
    const oldChallengeModelIds = challengeModel.map((e) => e.challengeId);
    const newChallengeModel = [...challengeModel];

    for (const challenge of userChallengeModel) {
      if (!oldChallengeModelIds.includes(challenge.challengeId)) {
        newChallengeModel.push(challenge);
      }
    }
    setChallengeModel(newChallengeModel);
  };

  // Initial load
  useEffect(() => {
    if (!userData || challengeModel.length > 0 || challengeLoading) return;

    const loadChallenges = async () => {
      setChallengeLoading(true);
      const challengeModels = await fetchChallengeModel(userData);
      setChallengeModel(challengeModels);
      setFirstLoaded(true);
      setChallengeLoading(false);
    };

    loadChallenges();
  }, [userData, challengeLoading, challengeModel.length, fetchChallengeModel]);

  // Pagination call
  const callPaginate = async () => {
    if (!userData || challengeModel.length <= 0 || challengeLoading) return;
    setChallengeLoading(true);
    const challengeModels = await fetchChallengeModel(userData);
    setChallengeLoading(false);
    if (challengeModels.length > 0) {
      processChallengeModelPaginate(challengeModels);
    }
  };

  // Refresh data
  const refreshData = async () => {
    if (!userData) return;
    setChallengeLoading(true);
    setChallengeModel([]);
    const challengeModels = await fetchChallengeModel(userData);
    setChallengeLoading(false);
    if (challengeModels.length > 0) {
      setChallengeModel(challengeModels);
    }
  };

  // Handle challenge selection
  const handleChallengeSelect = useCallback((challenge: ChallengeModel) => {
    setSelectedChallengeModel(challenge);
    onChallengeSelect(challenge);
  }, [onChallengeSelect]);

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('select_a_challenge')}
      </h2>
      <h3 className={`${styles.experienceDesc} ${styles[`experienceDesc_${theme}`]}`}>
        {t('swipe_to_select')}
      </h3>

      {challengeModel.length > 0 && (
        <div className={styles.carouselContainer}>
          {/* Navigation Buttons */}
          <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </div>
          <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z" />
            </svg>
          </div>

          {/* Swiper Carousel */}
          <Swiper
            modules={[Navigation]}
            loop={challengeModel.length > 3}
            slidesPerView={1}
            spaceBetween={20}
            navigation={{
              nextEl: `.${styles.navNext}`,
              prevEl: `.${styles.navPrev}`,
            }}
            breakpoints={{
              500: {
                slidesPerView: 1,
                spaceBetween: 20
              },
              800: {
                slidesPerView: 2,
                spaceBetween: 24
              },
            }}
            className={styles.swiper}
          >
            {challengeModel.map((challenge) => (
              <SwiperSlide key={challenge.challengeId}>
                <ChallengeCard
                  challenge={challenge}
                  onClick={() => handleChallengeSelect(challenge)}
                  isSelected={selectedChallengeModel?.challengeId === challenge.challengeId}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* Loading and Error States */}
      {challengeLoading && challengeModel.length === 0 && <LoadingView />}
      {!challengeLoading && challengeModel.length === 0 && !error && (
        <NoResultsView text={t('no_challenges_available')} buttonText={t('try_again')} onButtonClick={refreshData} />
      )}
      {!challengeLoading && challengeModel.length === 0 && error && (
        <ErrorView text={error} buttonText={t('try_again')} onButtonClick={refreshData} />
      )}
    </div>
  );
}

// Challenge Card Component
interface ChallengeCardProps {
  challenge: ChallengeModel;
  isSelected?: boolean;
  onClick: () => void;
}

function ChallengeCard({ challenge, isSelected, onClick }: ChallengeCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  // const formatTime = (seconds?: number | null): string => {
  //   if (!seconds) return '0 min';
  //   const minutes = Math.ceil(seconds / 60);
  //   return `${minutes} min`;
  // };
  const formatTime = (seconds?: number | null): string => {
    // Handle invalid inputs
    if (seconds === undefined || seconds === null || seconds < 0) return '0 min';
    if (seconds === 0) return '0 min';

    // Less than 1 minute
    if (seconds < 60) {
      return `${Math.ceil(seconds)} sec`;
    }

    // 1-60 minutes
    if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    }

    // Hours and minutes
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.ceil((seconds % 3600) / 60);

    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    }

    return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${remainingMinutes} ${remainingMinutes === 1 ? 'min' : 'mins'}`;
  };

  const hasMultipleTiers = challenge.challengeMaxParticipant > challenge.challengeMinParticipant;

  return (
    <div
      className={`${styles.challengeCard} ${styles[`challengeCard_${theme}`]} ${isSelected ? styles.selected : ''
        }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Select ${challenge.challengeIdentity} challenge`}
    >
      {/* Header with selector and title */}
      <div className={styles.cardHeader}>
        <div className={styles.selectorContainer}>
          <div className={`${styles.selector} ${isSelected ? styles.selectorSelected : ''}`} />
          <h3 className={styles.challengeIdentity}>
            {challenge.challengeIdentity.toUpperCase()}
          </h3>
        </div>
        <div className={styles.priceContainer}>
          <span className={styles.currencySymbol}>A</span>
          <span className={styles.price}>{formatNumber(challenge.challengePrice)}</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Info tags */}
      <div className={styles.infoTags}>
        <span className={styles.infoTag}>
          {challenge.challengeQuestionCount} {t('questions')}
        </span>
        <span className={styles.infoTag}>
          {hasMultipleTiers
            ? `${challenge.challengeMinParticipant} - ${challenge.challengeMaxParticipant}`
            : challenge.challengeMinParticipant
          } {t('participants')}
        </span>
      </div>

      <div className={styles.divider} />

      {/* Prize section */}
      <div className={styles.prizeSection}>
        <div className={styles.prizeHeader}>
          <h4 className={styles.prizeTitle}>{t('prize')}</h4>
          <div className={styles.infoIcon}>i</div>
        </div>

        <div className={styles.prizeList}>
          <PrizeRow
            label={t('top_share')}
            value={challenge.challengeTopShare}
          />

          {hasMultipleTiers && (
            <>
              <PrizeRow
                label={t('mid_share')}
                value={challenge.challengeMidShare}
              />
              <PrizeRow
                label={t('bot_share')}
                value={challenge.challengeBotShare}
              />
              <PrizeRow
                label={t('rank_share')}
                description={t('received_percentage')}
              />
            </>
          )}

          {!hasMultipleTiers && (
            <PrizeRow
              label={t('bot_share')}
              value={challenge.challengeMidShare}
            />
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Waiting time */}
      <div className={styles.waitingTime}>
        <div className={styles.timeContent}>
          <div className={styles.timeIcon}>⏱</div>
          <div className={styles.timeText}>
            <div className={styles.timeLabel}>{t('waiting_time')}</div>
            <div className={styles.timeValue}>
              {formatTime(challenge.challengeWaitingTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Prize Row Component
function PrizeRow({
  label,
  value,
  description
}: {
  label: string;
  value?: number;
  description?: string;
}) {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className={styles.prizeRow}>
      <span className={styles.prizeLabel}>{label}</span>
      <span className={styles.prizeValue}>
        {value !== undefined ? (
          < >
            <span className={styles.currencySymbol}>A</span>
            {formatNumber(value)}
          </>
        ) : (
          description
        )}
      </span>
    </div>
  );
}


