'use client';

import { use, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import styles from './page.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { BackendChallengeConfig, ChallengeConfig, ChallengeOption } from '@/models/challenge-config';
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useAuthContext } from '@/providers/AuthProvider'


interface Config {
  showHeader: boolean;
  showTitle: boolean;
  showDescription: boolean;
  backgroundColor: Record<string, string> | null;
}

const iosConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: { 'light': '#fff', 'dark': '#212121' }
};

const androidConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: { 'light': '#fff', 'dark': '#232323' }
};

const landingConfig: Config = {
  showHeader: false,
  showTitle: true,
  showDescription: true,
  backgroundColor: null
};

const profileConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: null
};

const quizConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: null
};

const defaultConfig: Config = {
  showHeader: true,
  showTitle: false,
  showDescription: false,
  backgroundColor: null
};

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = {
    'ios': iosConfig,
    'android': androidConfig,
    'quiz': quizConfig,
    'profile': profileConfig,
    'landing': landingConfig
  };
  return configMap[req || ''] || defaultConfig;
};

type StringOrNull = string | null;

interface Params {
  challengeId: StringOrNull;
  col: StringOrNull;
  lan: StringOrNull;
  req: StringOrNull;
  [key: string]: string | null;
}

const useAppParams = <
  T extends Record<string, StringOrNull> = Params
>(
  fallbackParams?: Partial<T>
): T => {
  const searchParams = useSearchParams();

  // ✅ Start with a clean object that only has string | null values
  const params: Record<string, StringOrNull> = {};

  if (fallbackParams) {
    for (const key in fallbackParams) {
      const value = fallbackParams[key];
      params[key] = value ?? null; // ✅ ensure no undefined
    }
  }

  // ✅ Merge URL search params
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // ✅ Ensure all fallback keys exist
  if (fallbackParams) {
    for (const key of Object.keys(fallbackParams)) {
      if (!(key in params)) params[key] = null;
    }
  }

  return params as T;
};

interface PayoutPageProps {
  searchParams: Promise<Partial<Params>>;
}

interface MoreReward {
  rewards: SimpleReward[];
  devCharge: number;
  winnersSize: number;
}

interface SimpleReward {
  rank: string;
  amount: number;
}

const allRoles = ['Roles.creator', 'Roles.reviewer', 'Roles.organization', 'Roles.teacher', 'Roles.celebrity', 'Roles.parent', 'Roles.institution'];

// Utility Functions
const calculateMoreRewards = (
  size: number,
  min: number,
  entryFee: number,
  topPrize: number,
  midPrize: number,
  botPrize: number,
  devChargePct: number,
  studentText: string
): MoreReward => {

  const devChargeList: Record<number, number> = {
    6: 2.38,
    7: 4.76,
    8: 9.52,
    9: 14.28
  };

  const totalPool = size * entryFee;
  let devCharge: number;

  if (size > 9) {
    devCharge = totalPool * (devChargePct / 100);
  } else {
    const chargePct = devChargeList[size] || devChargePct;
    devCharge = totalPool * (chargePct / 100);
  }

  const remainingAfterDev = totalPool - devCharge;

  // Your original winner calculation logic
  let winnersSize = Math.ceil((3 * size) / Math.max(min, 10));
  winnersSize = Math.max(winnersSize, 3);  // Ensure at least 3 winners
  winnersSize = Math.min(winnersSize, size);  // Cannot exceed total participants

  // Distribute winners into categories
  const eachCategory = Math.ceil(winnersSize / 3);
  let top = eachCategory;
  let mid = eachCategory;
  let bot = eachCategory;

  // Adjust for remainder
  const remainder = winnersSize % 3;
  if (remainder === 1) {
    top -= 1;
    mid -= 1;
    bot += 1;
  } else if (remainder === 2) {
    top -= 1;
    mid += 1;
  }

  // Assign prizes
  const rewards: SimpleReward[] = [];
  let totalDistributed = 0;

  for (let rank = 1; rank <= winnersSize; rank++) {
    let amount = 0;
    if (rank <= top) {
      amount = topPrize;
    } else if (rank <= top + mid) {
      amount = midPrize;
    } else {
      amount = botPrize;
    }
    rewards.push({ rank: `${studentText} ${rank}`, amount });
    totalDistributed += amount;
  }

  const remainingForRank = remainingAfterDev - totalDistributed;
  const rankParticipants = size - winnersSize;

  if (rankParticipants > 0) {
    const totalWeight = (rankParticipants * (rankParticipants + 1)) / 2;

    for (let rank = winnersSize + 1; rank <= size; rank++) {
      const weight = size - rank + 1;
      const amount = remainingForRank * (weight / totalWeight);
      rewards.push({ rank: `${studentText} ${rank}`, amount: Number(amount.toFixed(2)) });
    }
  }

  return { rewards: rewards, devCharge: devCharge, winnersSize: winnersSize };
};

// Components
const RoleSelector = ({
  roles,
  selectedRole,
  onSelect
}: {
  roles: string[];
  selectedRole: string;
  onSelect: (role: string) => void;
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const roleSelectorRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (roleSelectorRef.current) {
      const scrollAmount = direction === 'left' ? -100 : 100;
      roleSelectorRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.role_scroll_container}>
     <button
        className={`${styles.scroll_button} ${styles[`scroll_button_${theme}`]}`}
        onClick={() => scroll('left')}
        aria-label="Scroll roles left"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
        </svg>
      </button>
      <div className={styles.role_selector} ref={roleSelectorRef}>
        {roles.map((role) => (
          <button
            key={role}
            className={`${styles.role} ${selectedRole === role ? styles.role_active : ''} ${styles[`role_${theme}`]}`}
            onClick={() => onSelect(role)}
            aria-selected={selectedRole === role}
          >
            {t(role)}
          </button>
        ))}
      </div>
      <button
        className={`${styles.scroll_button} ${styles[`scroll_button_${theme}`]}`}
        onClick={() => scroll('right')}
        aria-label="Scroll roles right"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z"/>
        </svg>
      </button>
    </div>
  );
};

const OneVsOneView = ({ data, roles }: { data: ChallengeConfig; roles: string[] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedQuestion, setSelectedQuestion] = useState(data.challengeOptions[0]);
  const [selectedRole, setSelectedRole] = useState('Roles.creator');

  const calculateCharge = (
    entryFee: number,
    top: number,
    mid: number,
    questionsCount: number,
    roleWeight: number,
    devChargePct: number,
    share: number
  ) => {
    const totalPool = entryFee * 2;
    const payout = (top + mid);
    const remainder = totalPool - payout;
    const devCharge = remainder * (devChargePct / 100);
    const roleExtra = devCharge * (roleWeight / 100);
    return ((share + roleExtra) / questionsCount).toFixed(2);
  };

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>

        <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>{t('challenge_text')}</h4>
      <div className={styles.carouselContainer}>
       { data.challengeOptions.length > 3 && <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
        </div>}
        { data.challengeOptions.length > 3 && <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z"/>
          </svg>
        </div>}

        <Swiper
          modules={[Navigation]}
          loop={data.challengeOptions.length > 3}
          slidesPerView={1}
          spaceBetween={20}
          navigation={{
            nextEl: `.${styles.navNext}`,
            prevEl: `.${styles.navPrev}`,
          }}
          breakpoints={{
            640: { slidesPerView: 1, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 3, spaceBetween: 32 },
          }}
          className={styles.swiper}
        >
          {data.challengeOptions.map((option, idx) => (
            <SwiperSlide key={idx}>
              <button
                className={`${styles.q_button} ${selectedQuestion.challengeIdentity === option.challengeIdentity ? styles.q_selected : ''} ${styles[`q_button_${theme}`]}`}
                onClick={() => setSelectedQuestion(option)}
              >
                {option.challengeIdentity}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Add Question Count Display */}
      <div className={`${styles.question_count} ${styles[`question_count_${theme}`]}`}>
        <strong>{t('questions_text')}:</strong> {selectedQuestion.challengeQuestionCount}
      </div>

      <div className={styles.matchup}>
        <button className={`${styles.player_button} ${styles[`player_button_${theme}`]}`}>{t('player')} 1</button>
        <span className={`${styles.vs} ${styles[`vs_${theme}`]}`}>vs</span>
        <button className={`${styles.player_button} ${styles[`player_button_${theme}`]}`}>{t('player')} 2</button>
      </div>
      <div className={`${styles.score} ${styles[`score_${theme}`]}`}>
        <span>{selectedQuestion.challengePrice}</span>
        <span>+</span>
        <span>{selectedQuestion.challengePrice}</span>
      </div>

      <div className={`${styles.payout_breakdown} ${styles[`payout_breakdown_${theme}`]}`}>
        <div className={styles.payout_row}>
          <span>{t('winner')}:</span>
          <span className={styles.payout_value}>{selectedQuestion.challengeTopShare}</span>
        </div>
        <div className={styles.payout_row}>
          <span>{t('loser')}:</span>
          <span className={styles.payout_value}>{selectedQuestion.challengeMidShare}</span>
        </div>
        {selectedRole !== 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t(selectedRole)}:</span>
            <span className={styles.payout_value}>
              {calculateCharge(
                selectedQuestion.challengePrice,
                selectedQuestion.challengeTopShare,
                selectedQuestion.challengeMidShare,
                selectedQuestion.challengeQuestionCount,
                (selectedQuestion.challengeRoleShare.roles[selectedRole] || 0),
                selectedQuestion.challengeDevelopmentCharge,
                selectedQuestion.challengeCreatorShare
              )} {t('per_question')}
            </span>
          </div>
        )}
        {selectedRole === 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t('Roles.creator')}:</span>
            <span className={styles.payout_value}>
              {calculateCharge(
                selectedQuestion.challengePrice,
                selectedQuestion.challengeTopShare,
                selectedQuestion.challengeMidShare,
                selectedQuestion.challengeQuestionCount,
                (selectedQuestion.challengeRoleShare.roles['Roles.creator'] || 0),
                selectedQuestion.challengeDevelopmentCharge,
                selectedQuestion.challengeCreatorShare
              )} {t('per_question')}
            </span>
          </div>
        )}
        <div className={styles.payout_row}>
          <span>{t('Roles.reviewer')}:</span>
          <span className={styles.payout_value}>
            {calculateCharge(
              selectedQuestion.challengePrice,
              selectedQuestion.challengeTopShare,
              selectedQuestion.challengeMidShare,
              selectedQuestion.challengeQuestionCount,
              (selectedQuestion.challengeRoleShare.roles['Roles.reviewer'] || 0),
              selectedQuestion.challengeDevelopmentCharge,
              selectedQuestion.challengeReviewerShare
            )} {t('per_question')}
          </span>
        </div>
      </div>
            <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>{t('revenue_role')}</h4>
      <RoleSelector
        roles={roles}
        selectedRole={selectedRole}
        onSelect={setSelectedRole}
      />
    </div>
  );
};

const MultiplayerView = ({ data, roles }: { data: ChallengeConfig; roles: string[] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedChallenge, setSelectedChallenge] = useState(data.challengeOptions[0]);
  const [minPlayers, setMinPlayers] = useState(selectedChallenge.challengeMinParticipants);
  const [selectedRole, setSelectedRole] = useState('Roles.creator');
  const [currentPage, setCurrentPage] = useState(1);
  const [positionInput, setPositionInput] = useState('');
  const [positionAmount, setPositionAmount] = useState<number | null>(null);
  const itemsPerPage = 10;

  const moreRewards = useMemo(() => calculateMoreRewards(
    minPlayers,
    selectedChallenge.challengeMinParticipants,
    selectedChallenge.challengePrice,
    selectedChallenge.challengeTopShare,
    selectedChallenge.challengeMidShare,
    selectedChallenge.challengeBotShare,
    selectedChallenge.challengeDevelopmentCharge,
    t('student')
  ), [minPlayers, selectedChallenge]);

  const paginatedRewards = moreRewards.rewards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(moreRewards.rewards.length / itemsPerPage);

  // Effect to update position amount when minPlayers or moreRewards changes
  useEffect(() => {
    if (positionInput) {
      const position = Number(positionInput);
      if (!isNaN(position) && position >= 1 && position <= moreRewards.rewards.length) {
        const reward = moreRewards.rewards[position - 1];
        setPositionAmount(reward.amount);
      } else {
        setPositionAmount(null);
      }
    }
  }, [moreRewards, positionInput]);

  const handleChallengeChange = (challenge: ChallengeOption) => {
    setSelectedChallenge(challenge);
    setMinPlayers(challenge.challengeMinParticipants);
    setCurrentPage(1);
    setPositionInput('');
    setPositionAmount(null);
  };

  const handlePositionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPositionInput(value);

    const position = Number(value);

    // Clear amount if input is empty or invalid
    if (value === '' || isNaN(position)) {
      setPositionAmount(null);
      return;
    }

    // If position is beyond current minPlayers, update minPlayers to show that position
    if (position >= 1 && position <= selectedChallenge.challengeMaxParticipants) {
      if (position >= minPlayers) {
        setMinPlayers(position);
      }
    } else {
      setPositionAmount(null);
    }
  };

  const devChargeList: Record<number, number> = {
    6: 2.38,
    7: 4.76,
    8: 9.52,
    9: 14.28
  };

  const calculateCharge = (
    entryFee: number,
    minPlayers: number,
    questionsCount: number,
    roleWeight: number,
    devChargePct: number,
    share: number
  ) => {
    const totalPool = minPlayers * entryFee;
    let devCharge: number;
    let rolePool: number;
    let roleExtra: number;

    if (minPlayers > 9) {
      devCharge = totalPool * (devChargePct / 100);
      rolePool = devCharge * 0.5;
      roleExtra = rolePool * (roleWeight / 100);
    } else {
      const chargePct = devChargeList[minPlayers] || devChargePct;
      devCharge = totalPool * (chargePct / 100);
      rolePool = devCharge - ((minPlayers / 6) - 1);
      roleExtra = (devCharge - rolePool) * (roleWeight / 100);
    }
    return ((share + roleExtra)).toFixed(2);
  };

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>

        <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>{t('challenge_text')}</h4>

      <div className={`${styles.carouselContainer} ${styles[`carouselContainer_quiz`]}`}>
        { data.challengeOptions.length > 3 && <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
        </div>}
        { data.challengeOptions.length > 3 && <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z"/>
          </svg>
        </div>}
        <Swiper
          modules={[Navigation]}
          loop={data.challengeOptions.length > 3}
          slidesPerView={1}
          spaceBetween={20}
          navigation={{
            nextEl: `.${styles.navNext}`,
            prevEl: `.${styles.navPrev}`,
          }}
          breakpoints={{
            640: { slidesPerView: 1, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 3, spaceBetween: 32 },
          }}
          className= {`${styles.swiper} ${styles[`swiper_quiz`]}`}
        >
          {data.challengeOptions.map((challenge) => (
            <SwiperSlide key={challenge.challengeIdentity}>
              <button
                className={`${styles.q_button} ${selectedChallenge.challengeIdentity === challenge.challengeIdentity ? styles.q_selected : ''} ${styles[`q_button_${theme}`]}`}
                onClick={() => handleChallengeChange(challenge)}
              >
                {challenge.challengeIdentity}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Add Question Count Display */}
      <div className={`${styles.question_count} ${styles[`question_count_${theme}`]}`}>
        <strong>{t('questions_text')}:</strong> {selectedChallenge.challengeQuestionCount}
      </div>

      <div className={`${styles.entry_fee} ${styles[`entry_fee_${theme}`]}`}>
        <strong>{t('entry_fee')}:</strong> {selectedChallenge.challengePrice}
      </div>

      <div className={styles.slider_container}>
        <label className={`${styles.slider_label} ${styles[`slider_label_${theme}`]}`}>
          {t('minimum_players')}: {minPlayers}
        </label>

        <input
          type="range"
          min={selectedChallenge.challengeMinParticipants}
          max={selectedChallenge.challengeMaxParticipants}
          value={minPlayers}
          onChange={(e) => {
            const newMinPlayers = Number(e.target.value);
            setMinPlayers(newMinPlayers);
            setCurrentPage(1);

            // Clear position input if it's now invalid
            if (positionInput) {
              const position = Number(positionInput);
              if (position > newMinPlayers) {
                setPositionInput('');
                setPositionAmount(null);
              }
            }
          }}
          className={`${styles.slider} ${styles[`slider_${theme}`]}`}
        />
      </div>

      {/* Position Input Field */}
      <div className={styles.position_input_container}>
        <label className={`${styles.position_label} ${styles[`position_label_${theme}`]}`}>
          {t('enter_position')} (1 - {moreRewards.rewards.length}):
        </label>
        <div className={styles.position_input_wrapper}>
          <input
            type="number"
            min="1"
            max={moreRewards.rewards.length}
            value={positionInput}
            onChange={handlePositionInputChange}
            placeholder={t('position_placeholder')}
            className={`${styles.position_input} ${styles[`position_input_${theme}`]}`}
          />
        </div>
        {positionAmount !== null && (
          <div className={`${styles.position_result} ${styles[`position_result_${theme}`]}`}>
            {t('amount_for_position')} {positionInput}: <strong>{positionAmount}</strong>
          </div>
        )}
        {positionInput && positionAmount === null && (
          <div className={`${styles.position_error} ${styles[`position_error_${theme}`]}`}>
            {t('position_invalid')} {moreRewards.rewards.length}
          </div>
        )}
      </div>

      <div className={`${styles.payout_table} ${styles[`payout_table_${theme}`]}`}>
        <div className={`${styles.table_header} ${styles[`table_header_${theme}`]}`}>
          <span>#</span>
          <span>{t('rank')}</span>
          <span>{t('amount')}</span>
        </div>
        {paginatedRewards.map((payout, index) => (
          <div
            key={index}
            className={`${styles.table_row} ${styles[`table_row_${theme}`]} ${
              (currentPage - 1) * itemsPerPage + index < moreRewards.winnersSize ? styles.top_winner : ''
            }`}
          >
            <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
            <span>{payout.rank}</span>
            <span>{payout.amount}</span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.page_button} ${styles[`page_button_${theme}`]}`}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {t('previous')}
          </button>
          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 3) {
              pageNum = i + 1;
            } else if (currentPage <= 2) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 1) {
              pageNum = totalPages - 2 + i;
            } else {
              pageNum = currentPage - 1 + i;
            }
            return (
              <button
                key={pageNum}
                className={`${styles.page_button} ${
                  currentPage === pageNum ? styles.page_button_active : ''
                } ${styles[`page_button_${theme}`]}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          {totalPages > 3 && currentPage < totalPages - 1 && (
            <span className={`${styles.page_dots} ${styles[`page_dots_${theme}`]}`}>...</span>
          )}
          <button
            className={`${styles.page_button} ${styles[`page_button_${theme}`]}`}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            {t('next')}
          </button>
        </div>
      )}

      <div className={`${styles.creator_info} ${styles[`creator_info_${theme}`]}`}>
        {selectedRole !== 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t(selectedRole)}:</span>
            <span className={styles.payout_value}>
              {calculateCharge(
                selectedChallenge.challengePrice,
                minPlayers,
                selectedChallenge.challengeQuestionCount,
                selectedChallenge.challengeRoleShare.roles[selectedRole] || 0,
                selectedChallenge.challengeDevelopmentCharge,
                selectedChallenge.challengeCreatorShare
              )} {t('per_question')}
            </span>
          </div>
        )}
        {selectedRole === 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t('Roles.creator')}:</span>
            <span className={styles.payout_value}>
              {calculateCharge(
                selectedChallenge.challengePrice,
                minPlayers,
                selectedChallenge.challengeQuestionCount,
                selectedChallenge.challengeRoleShare.roles['Roles.creator'] || 0,
                selectedChallenge.challengeDevelopmentCharge,
                selectedChallenge.challengeCreatorShare
              )} {t('per_question')}
            </span>
          </div>
        )}
        <div className={styles.payout_row}>
          <span>{t('Roles.reviewer')}:</span>
          <span className={styles.payout_value}>
            {calculateCharge(
              selectedChallenge.challengePrice,
              minPlayers,
              selectedChallenge.challengeQuestionCount,
              selectedChallenge.challengeRoleShare.roles['Roles.reviewer'] || 0,
              selectedChallenge.challengeDevelopmentCharge,
              selectedChallenge.challengeReviewerShare
            )} {t('per_question')}
          </span>
        </div>
      </div>
            <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>{t('revenue_role')}</h4>
      <RoleSelector
        roles={roles}
        selectedRole={selectedRole}
        onSelect={setSelectedRole}
      />
    </div>
  );
};

// Main Component
export default function Payout({ searchParams }: PayoutPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { challengeId, col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { initialized } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;

  const [challengeData, setChallengeData] = useState<ChallengeConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [payoutState, setPayoutState] = useState('initial');

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const fetchPayoutData = useCallback(async () => {
    if (payoutState != 'initial') return;
    setPayoutState('loading');
    try {
      const { data, error } = await supabaseBrowser.rpc("fetch_payout_data", {
        p_challenge_id: challengeId,
        p_locale: lang
      });

      if (error) {
        console.error("[ChallengeConfig] error:", error);
        setPayoutState('error');
        return;
      }

      if (data) {
        const challenges = data.map((row: BackendChallengeConfig) => new ChallengeConfig(row));
        setChallengeData(challenges);
        // Set active tab to 1v1 if available, otherwise first challenge
        const oneVOneChallenge = challenges.find((e: ChallengeConfig) => e.gameModeChecker === 'GameMode.1v1');
        setActiveTab(oneVOneChallenge?.gameModeChecker || challenges[0]?.gameModeChecker || null);
        setPayoutState('data');
      } else {
        setPayoutState('empty');
      }
    } catch (error) {
      console.error('Error fetching payout data:', error);
      setPayoutState('error');
    }
  }, [challengeId, lang, payoutState]);

  useEffect(() => {
      fetchPayoutData();
  }, [fetchPayoutData]);

  // Determine background style
  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor && config.backgroundColor[resolvedTheme]) {
      return {
        background: config.backgroundColor[resolvedTheme],
        color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
      } as React.CSSProperties;
    }
    return {};
  };

  // Determine container class
  const getContainerClass = () => {
    const baseClass = styles.container;
    if (config.backgroundColor) {
      return `${baseClass} ${styles[`container_${req}`]}`;
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]} ${styles[`container_${req}`]}`;
  };

  const renderTabContent = () => {
    if (!activeTab) return null;

    const data = challengeData.find((e: ChallengeConfig) => e.gameModeChecker === activeTab);
    if (!data) return null;

    switch (activeTab) {
      case 'GameMode.1v1':
        return <OneVsOneView data={data} roles={allRoles} />;
      case 'GameMode.Multiplayer':
        return <MultiplayerView data={data} roles={allRoles} />;
      default:
        return null;
    }
  };


  const goBack = () => {
    if (initialized) {
      router.replace('/main');
      return;
    }

    // fallback if no history
    if (window.history.length <= 1) {
      router.replace('/main');
    } else {
      router.back();
    }
  };


  if(req === 'landing' && !activeTab)return;
  return (
    <div
      className={getContainerClass()}
      style={getBackgroundStyle()}
    >
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {(canGoBack || initialized) && (
              <button
                className={styles.backButton}
                onClick={goBack}
                aria-label={t('go_back')}
              >
                <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}

            <h1 className={styles.title}>{t('payout_text')}</h1>

            {!initialized && <Link className={styles.logoContainer} href="/">
              <Image
                className={styles.logo}
                src="/assets/image/academix-logo.png"
                alt="Academix Logo"
                width={40}
                height={40}
                priority
              />
            </Link>}
          </div>
        </header>
      )}

      {config.showTitle && (<h1 className={`${styles.bigTitle} ${styles[`bigTitle_${resolvedTheme}`]}`}>{t('academix_calculator')}</h1>)}
      {config.showDescription && (<h4 className={`${styles.description} ${styles[`description_${resolvedTheme}`]}`}>
        {t('academix_description')}
      </h4>)}

      {activeTab && payoutState === 'data' && (
        <div className={`${styles.innerBody} ${styles[`innerBody_${resolvedTheme}`]}  ${styles[`innerBody_quiz`]}`}>
          <h4 className={`${styles.game_mode} ${styles[`game_mode_${resolvedTheme}`]}`}>{t('game_mode')}</h4>
          <div className={styles.tab_switcher}>
            {challengeData.map((challenge, index) => (
              <button
                key={challenge.gameModeChecker}
                className={`${styles.tab} ${activeTab === challenge.gameModeChecker ? styles.tab_active : ''} ${styles[`tab_${theme}`]}`}
                onClick={() => setActiveTab(challenge.gameModeChecker)}
              >
                {challenge.gameModeIdentity}
              </button>
            ))}
          </div>

          <div className={styles.lac_content}>
            {renderTabContent()}
          </div>
        </div>
      )}

      {payoutState === 'loading' && <LoadingView text={t('loading_text')} />}
      {payoutState === 'error' && (
        <ErrorView
          text={t('error_text')}
          buttonText={t('try_again')}
          onButtonClick={fetchPayoutData}
        />
      )}
      {payoutState === 'empty' && (
        <NoResultsView
          text={t('no_results')}
          buttonText={t('try_again')}
          onButtonClick={fetchPayoutData}
        />
      )}
    </div>
  );
}