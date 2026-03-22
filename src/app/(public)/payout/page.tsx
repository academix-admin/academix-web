'use client';

import { use, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import CurrencySymbol from '@/components/CurrencySymbol/CurrencySymbol';
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
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useAuthContext } from '@/providers/AuthProvider';

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
  backgroundColor: { light: '#fff', dark: '#212121' },
};

const androidConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: { light: '#fff', dark: '#232323' },
};

const landingConfig: Config = {
  showHeader: false,
  showTitle: true,
  showDescription: true,
  backgroundColor: null,
};

const profileConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: null,
};

const quizConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: null,
};

const defaultConfig: Config = {
  showHeader: true,
  showTitle: false,
  showDescription: false,
  backgroundColor: null,
};

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = {
    ios: iosConfig,
    android: androidConfig,
    quiz: quizConfig,
    profile: profileConfig,
    landing: landingConfig,
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

const useAppParams = <T extends Record<string, StringOrNull> = Params>(
  fallbackParams?: Partial<T>
): T => {
  const searchParams = useSearchParams();
  const params: Record<string, StringOrNull> = {};

  if (fallbackParams) {
    for (const key in fallbackParams) {
      params[key] = fallbackParams[key] ?? null;
    }
  }

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

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

const allRoles = [
  'Roles.creator',
  'Roles.reviewer',
  'Roles.academix_creator',
  'Roles.academix_reviewer',
  'Roles.teacher',
  'Roles.celebrity',
  'Roles.organization',
  'Roles.parent',
  'Roles.academic_institution'
];

// ---------------------------------------------------------------------------
// Shared utility — computes dev_charge_amount matching pay_pool_quiz exactly.
//
// 1v1:  the remainder after top+mid IS the dev_charge.
//       Platform earns through the spread — no further % applied.
//       dev_charge_amount = (entryFee × 2) − (topShare + midShare)
//
// Multi: tiered % for 6–9 players, flat devChargeRate for 10+.
//        dev_charge_amount = total_pool × tier_pct
// ---------------------------------------------------------------------------
const computeDevChargeAmount = (
  entryFee: number,
  players: number,
  topShare: number,
  midShare: number,
  devChargeRate: number, // the % value from config e.g. 20 — multi only
  is1v1: boolean
): number => {
  if (is1v1) {
    const totalPool = entryFee * 2;
    // Remainder IS the dev_charge — no * (devChargeRate / 100)
    return totalPool - (topShare + midShare);
  }
  const totalPool = players * entryFee;
  const tiers: Record<number, number> = {
    6: 0.0238,
    7: 0.0476,
    8: 0.0952,
    9: 0.1428,
  };
  const pct = players > 9 ? devChargeRate / 100 : (tiers[players] ?? devChargeRate / 100);
  return totalPool * pct;
};

// ---------------------------------------------------------------------------
// Shared utility — per-question contributor pay, matching pay_pool_quiz.
//
// Steps:
//   1. dev_charge_amount  (see above)
//   2. base_shares_total  = questionCount × (creatorShare + reviewerShare)
//   3. role_pool          = max(dev_charge_amount − base_shares_total, 0)
//   4. role_extra         = (memberWeight / totalWeights) × role_pool
//   5. paid               = baseShare + role_extra
//
// GREATEST(0, ...) on role_pool is a safety net — with correct config
// (new base shares + correct 1v1 remainder logic) it never fires.
// ---------------------------------------------------------------------------
const calculateCharge = (
  entryFee: number,
  players: number,
  topShare: number,
  midShare: number,
  questionCount: number,
  devChargeRate: number,
  creatorShare: number,
  reviewerShare: number,
  memberWeight: number,   // this user's role weight
  totalWeights: number,   // sum of ALL weights in challenge_role_share
  isCreator: boolean,
  is1v1: boolean
): string => {
  const devChargeAmount = computeDevChargeAmount(
    entryFee, players, topShare, midShare, devChargeRate, is1v1
  );

  const baseSharesTotal = questionCount * (creatorShare + reviewerShare);
  const rolePool = Math.max(devChargeAmount - baseSharesTotal, 0);
  const roleExtra =
    totalWeights > 0 && rolePool > 0
      ? (memberWeight / totalWeights) * rolePool
      : 0;

  const baseShare = isCreator ? creatorShare : reviewerShare;
  const roleShare = roleExtra / questionCount; // Distribute role_extra across questions for per-question charge
  return (baseShare + roleShare).toFixed(2);
};

// ---------------------------------------------------------------------------
// calculateMoreRewards — mirrors reward_pool_quiz multiplayer logic.
// Computes player prize distribution for the UI payout table.
// ---------------------------------------------------------------------------
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
    9: 14.28,
  };

  const totalPool = size * entryFee;
  const chargePct = size > 9 ? devChargePct : (devChargeList[size] ?? devChargePct);
  const devCharge = totalPool * (chargePct / 100);
  const remainingAfterDev = totalPool - devCharge;

  // winners_size mirrors DB: ceil(3 × size / max(min, 10)), clamped 3..size
  let winnersSize = Math.ceil((3 * size) / Math.max(min, 10));
  winnersSize = Math.max(winnersSize, 3);
  winnersSize = Math.min(winnersSize, size);

  // Category boundaries — same adjustment logic as DB CASE winners_size % 3
  const eachCategory = Math.ceil(winnersSize / 3);
  let top = eachCategory;
  let mid = eachCategory;
  let bot = eachCategory;

  const remainder = winnersSize % 3;
  if (remainder === 1) {
    top -= 1;
    mid -= 1;
    bot += 1;
  } else if (remainder === 2) {
    top -= 1;
    mid += 1;
  }

  // Assign winner prizes
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

  // Proportional rank distribution — mirrors DB weight formula
  const remainingForRank = Math.max(remainingAfterDev - totalDistributed, 0);
  const rankParticipants = size - winnersSize;

  if (rankParticipants > 0) {
    // DB uses: weight = members_size - rank + 1
    // totalWeight = sum of weights for rank > winnersSize
    const totalWeight = (rankParticipants * (rankParticipants + 1)) / 2;

    for (let rank = winnersSize + 1; rank <= size; rank++) {
      const weight = size - rank + 1;
      const amount = remainingForRank * (weight / totalWeight);
      rewards.push({ rank: `${studentText} ${rank}`, amount: Number(amount.toFixed(2)) });
    }
  }

  return { rewards, devCharge, winnersSize };
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
const RoleSelector = ({
  roles,
  selectedRole,
  onSelect,
}: {
  roles: string[];
  selectedRole: string;
  onSelect: (role: string) => void;
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const resolvedLang = 'en'; // Use default for components
  const roleSelectorRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (roleSelectorRef.current) {
      roleSelectorRef.current.scrollBy({
        left: direction === 'left' ? -100 : 100,
        behavior: 'smooth',
      });
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
          <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
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
            {t(role, resolvedLang)}
          </button>
        ))}
      </div>
      <button
        className={`${styles.scroll_button} ${styles[`scroll_button_${theme}`]}`}
        onClick={() => scroll('right')}
        aria-label="Scroll roles right"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z" />
        </svg>
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// OneVsOneView
// ---------------------------------------------------------------------------
const OneVsOneView = ({ data, roles }: { data: ChallengeConfig; roles: string[] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const resolvedLang = 'en'; // Use default for components
  const [selectedQuestion, setSelectedQuestion] = useState(data.challengeOptions[0]);
  const [selectedRole, setSelectedRole] = useState('Roles.creator');

  // Sum of ALL weights — denominator for role_extra calculation.
  // Recomputed when selected question changes (different challenges may
  // have different role configs).
  const totalWeights = useMemo(
    () =>
      Object.values(selectedQuestion.challengeRoleShare.roles).reduce(
        (sum, w) => sum + (w || 0),
        0
      ),
    [selectedQuestion]
  );

  // Helper to compute charge for a given role assignment in this view
  const charge = (memberWeight: number, isCreator: boolean) =>
    calculateCharge(
      selectedQuestion.challengePrice,
      2,                                        // 1v1 always 2 players
      selectedQuestion.challengeTopShare,
      selectedQuestion.challengeMidShare,
      selectedQuestion.challengeQuestionCount,
      selectedQuestion.challengeDevelopmentCharge,
      selectedQuestion.challengeCreatorShare,
      selectedQuestion.challengeReviewerShare,
      memberWeight,
      totalWeights,
      isCreator,
      true                                      // is1v1
    );

  const creatorWeight = selectedQuestion.challengeRoleShare.roles[selectedRole] || 0;
  const reviewerWeight = selectedQuestion.challengeRoleShare.roles['Roles.reviewer'] || 0;
  const creatorWeightForDisplay =
    selectedQuestion.challengeRoleShare.roles['Roles.creator'] || 0;

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>
      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>
        {t('challenge_text')}
      </h4>

      <div className={`${styles.carouselContainer} ${styles[`carouselContainer_quiz`]}`}>
        {data.challengeOptions.length > 3 && (
          <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </div>
        )}
        {data.challengeOptions.length > 3 && (
          <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z" />
            </svg>
          </div>
        )}
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
          className={`${styles.swiper} ${styles[`swiper_quiz`]}`}
        >
          {data.challengeOptions.map((option, idx) => (
            <SwiperSlide key={idx}>
              <button
                className={`${styles.q_button} ${
                  selectedQuestion.challengeIdentity === option.challengeIdentity
                    ? styles.q_selected
                    : ''
                } ${styles[`q_button_${theme}`]}`}
                onClick={() => setSelectedQuestion(option)}
              >
                {option.challengeIdentity}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className={`${styles.question_count} ${styles[`question_count_${theme}`]}`}>
        <strong>{t('questions_text')}:</strong> {selectedQuestion.challengeQuestionCount}
      </div>

      <div className={styles.matchup}>
        <button className={`${styles.player_button} ${styles[`player_button_${theme}`]}`}>
          {t('player')} 1
        </button>
        <span className={`${styles.vs} ${styles[`vs_${theme}`]}`}>vs</span>
        <button className={`${styles.player_button} ${styles[`player_button_${theme}`]}`}>
          {t('player')} 2
        </button>
      </div>

      <div className={`${styles.score} ${styles[`score_${theme}`]}`}>
        <span>{selectedQuestion.challengePrice}</span>
        <span>+</span>
        <span>{selectedQuestion.challengePrice}</span>
      </div>

      <div className={`${styles.payout_breakdown} ${styles[`payout_breakdown_${theme}`]}`}>
        <div className={styles.payout_row}>
          <span>{t('winner')}:</span>
          <span className={styles.payout_value}>{selectedQuestion.challengeTopShare.toLocaleString()}</span>
        </div>
        <div className={styles.payout_row}>
          <span>{t('loser')}:</span>
          <span className={styles.payout_value}>{selectedQuestion.challengeMidShare.toLocaleString()}</span>
        </div>
        <div className={styles.payout_row}>
          <span><strong>{t('total')}:</strong></span>
          <span className={styles.payout_value}>
            <strong>
              {(selectedQuestion.challengeTopShare + selectedQuestion.challengeMidShare).toLocaleString()}
            </strong>
          </span>
        </div>

        {/* Creator row — shows selected role's weight when not reviewer */}
        {selectedRole !== 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t(selectedRole)}:</span>
            <span className={styles.payout_value}>
              {charge(creatorWeight, true)} {t('per_question')}
            </span>
          </div>
        )}

        {/* When reviewer is selected, show creator with Roles.creator weight */}
        {selectedRole === 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t('Roles.creator')}:</span>
            <span className={styles.payout_value}>
              {charge(creatorWeightForDisplay, true)} {t('per_question')}
            </span>
          </div>
        )}

        {/* Reviewer row — always uses Roles.reviewer weight */}
        <div className={styles.payout_row}>
          <span>{t('Roles.reviewer')}:</span>
          <span className={styles.payout_value}>
            {charge(reviewerWeight, false)} {t('per_question')}
          </span>
        </div>
      </div>

      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>
        {t('revenue_role')}
      </h4>
      <RoleSelector roles={roles} selectedRole={selectedRole} onSelect={setSelectedRole} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// MultiplayerView
// ---------------------------------------------------------------------------
const MultiplayerView = ({ data, roles }: { data: ChallengeConfig; roles: string[] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const resolvedLang = 'en'; // Use default for components
  const [selectedChallenge, setSelectedChallenge] = useState(data.challengeOptions[0]);
  const [minPlayers, setMinPlayers] = useState(selectedChallenge.challengeMinParticipants);
  const [selectedRole, setSelectedRole] = useState('Roles.creator');
  const [currentPage, setCurrentPage] = useState(1);
  const [positionInput, setPositionInput] = useState('');
  const [positionAmount, setPositionAmount] = useState<number | null>(null);
  const itemsPerPage = 10;

  // Sum of ALL weights — recomputed when selected challenge changes
  const totalWeights = useMemo(
    () =>
      Object.values(selectedChallenge.challengeRoleShare.roles).reduce(
        (sum, w) => sum + (w || 0),
        0
      ),
    [selectedChallenge]
  );

  const moreRewards = useMemo(
    () =>
      calculateMoreRewards(
        minPlayers,
        selectedChallenge.challengeMinParticipants,
        selectedChallenge.challengePrice,
        selectedChallenge.challengeTopShare,
        selectedChallenge.challengeMidShare,
        selectedChallenge.challengeBotShare,
        selectedChallenge.challengeDevelopmentCharge,
        t('student')
      ),
    [minPlayers, selectedChallenge, t]
  );

  const paginatedRewards = moreRewards.rewards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(moreRewards.rewards.length / itemsPerPage);

  useEffect(() => {
    if (positionInput) {
      const position = Number(positionInput);
      if (!isNaN(position) && position >= 1 && position <= moreRewards.rewards.length) {
        setPositionAmount(moreRewards.rewards[position - 1].amount);
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

    if (value === '' || isNaN(position)) {
      setPositionAmount(null);
      return;
    }

    if (position >= 1 && position <= selectedChallenge.challengeMaxParticipants) {
      if (position >= minPlayers) setMinPlayers(position);
    } else {
      setPositionAmount(null);
    }
  };

  // Helper to compute charge for a given role assignment in this view
  const charge = (memberWeight: number, isCreator: boolean) =>
    calculateCharge(
      selectedChallenge.challengePrice,
      minPlayers,
      0,   // topShare not used for multiplayer
      0,   // midShare not used for multiplayer
      selectedChallenge.challengeQuestionCount,
      selectedChallenge.challengeDevelopmentCharge,
      selectedChallenge.challengeCreatorShare,
      selectedChallenge.challengeReviewerShare,
      memberWeight,
      totalWeights,
      isCreator,
      false  // is1v1
    );

  const creatorWeight = selectedChallenge.challengeRoleShare.roles[selectedRole] || 0;
  const reviewerWeight = selectedChallenge.challengeRoleShare.roles['Roles.reviewer'] || 0;
  const creatorWeightForDisplay =
    selectedChallenge.challengeRoleShare.roles['Roles.creator'] || 0;

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>
      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>
        {t('challenge_text')}
      </h4>

      <div className={`${styles.carouselContainer} ${styles[`carouselContainer_quiz`]}`}>
        {data.challengeOptions.length > 3 && (
          <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </div>
        )}
        {data.challengeOptions.length > 3 && (
          <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z" />
            </svg>
          </div>
        )}
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
          className={`${styles.swiper} ${styles[`swiper_quiz`]}`}
        >
          {data.challengeOptions.map((challenge) => (
            <SwiperSlide key={challenge.challengeIdentity}>
              <button
                className={`${styles.q_button} ${
                  selectedChallenge.challengeIdentity === challenge.challengeIdentity
                    ? styles.q_selected
                    : ''
                } ${styles[`q_button_${theme}`]}`}
                onClick={() => handleChallengeChange(challenge)}
              >
                {challenge.challengeIdentity}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

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
            if (positionInput && Number(positionInput) > newMinPlayers) {
              setPositionInput('');
              setPositionAmount(null);
            }
          }}
          className={`${styles.slider} ${styles[`slider_${theme}`]}`}
        />
      </div>

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
            <strong>{positionAmount.toLocaleString()}</strong>
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
              (currentPage - 1) * itemsPerPage + index < moreRewards.winnersSize
                ? styles.top_winner
                : ''
            }`}
          >
            <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
            <span>{payout.rank}</span>
            <span>{payout.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className={`${styles.payout_breakdown} ${styles[`payout_breakdown_${theme}`]}`}>
        <div className={styles.payout_row}>
          <span><strong>{t('total')}:</strong></span>
          <span className={styles.payout_value}>
            <strong>
              {moreRewards.rewards
                .reduce((sum, reward) => sum + reward.amount, 0)
                .toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.page_button} ${styles[`page_button_${theme}`]}`}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {t('previous')}
          </button>
          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 3) pageNum = i + 1;
            else if (currentPage <= 2) pageNum = i + 1;
            else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + i;
            else pageNum = currentPage - 1 + i;
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            {t('next')}
          </button>
        </div>
      )}

      <div className={`${styles.creator_info} ${styles[`creator_info_${theme}`]}`}>
        {/* Creator row — shows selected role's weight when not reviewer */}
        {selectedRole !== 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t(selectedRole)}:</span>
            <span className={styles.payout_value}>
              {charge(creatorWeight, true)} {t('per_question')}
            </span>
          </div>
        )}

        {/* When reviewer is selected, show creator with Roles.creator weight */}
        {selectedRole === 'Roles.reviewer' && (
          <div className={styles.payout_row}>
            <span>{t('Roles.creator')}:</span>
            <span className={styles.payout_value}>
              {charge(creatorWeightForDisplay, true)} {t('per_question')}
            </span>
          </div>
        )}

        {/* Reviewer row — always uses Roles.reviewer weight */}
        <div className={styles.payout_row}>
          <span>{t('Roles.reviewer')}:</span>
          <span className={styles.payout_value}>
            {charge(reviewerWeight, false)} {t('per_question')}
          </span>
        </div>
      </div>

      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>
        {t('revenue_role')}
      </h4>
      <RoleSelector roles={roles} selectedRole={selectedRole} onSelect={setSelectedRole} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function Payout({ searchParams }: PayoutPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { challengeId, col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { initialized, hasValidSession } = useAuthContext();
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
    if (payoutState !== 'initial') return;
    setPayoutState('loading');
    try {
      const { data, error } = await supabaseBrowser.rpc('fetch_payout_data', {
        p_challenge_id: challengeId,
        p_locale: lang,
      });

      if (error) {
        console.error('[ChallengeConfig] error:', error);
        setPayoutState('error');
        return;
      }

      if (data) {
        const challenges = data.map((row: BackendChallengeConfig) => new ChallengeConfig(row));
        setChallengeData(challenges);
        const oneVOneChallenge = challenges.find(
          (e: ChallengeConfig) => e.gameModeChecker === 'GameMode.1v1'
        );
        setActiveTab(
          oneVOneChallenge?.gameModeChecker || challenges[0]?.gameModeChecker || null
        );
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

  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor?.[resolvedTheme]) {
      return {
        background: config.backgroundColor[resolvedTheme],
        color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
      };
    }
    return {};
  };

  const getContainerClass = () => {
    const base = styles.container;
    if (config.backgroundColor) return `${base} ${styles[`container_${req}`]}`;
    return `${base} ${styles[`container_${resolvedTheme}`]} ${styles[`container_${req}`]}`;
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
    if (hasValidSession) { router.replace('/main'); return; }
    if (window.history.length <= 1) router.replace('/main');
    else router.back();
  };

  if (req === 'landing' && !activeTab) return null;

  return (
    <div className={getContainerClass()} style={getBackgroundStyle()}>
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {(canGoBack || hasValidSession) && (
              <button
                className={styles.backButton}
                onClick={goBack}
                aria-label={t('go_back', resolvedLang)}
              >
                <svg
                  className={styles.backIcon}
                  viewBox="0 0 16 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
            <h1 className={styles.title}>{t('payout_text', resolvedLang)}</h1>
            {!hasValidSession && (
              <Link className={styles.logoContainer} href="/">
                <Image
                  className={styles.logo}
                  src="/assets/image/academix-logo.png"
                  alt="Academix Logo"
                  width={40}
                  height={40}
                  priority
                />
              </Link>
            )}
          </div>
        </header>
      )}

      {config.showTitle && (
        <h1 className={`${styles.bigTitle} ${styles[`bigTitle_${resolvedTheme}`]}`}>
          {t('academix_calculator', resolvedLang)}
        </h1>
      )}
      {config.showDescription && (
        <h4 className={`${styles.description} ${styles[`description_${resolvedTheme}`]}`}>
          {t('academix_description', resolvedLang)}
        </h4>
      )}

      {activeTab && payoutState === 'data' && (
        <div
          className={`${styles.innerBody} ${styles[`innerBody_${resolvedTheme}`]} ${styles[`innerBody_quiz`]}`}
        >
          <h4 className={`${styles.game_mode} ${styles[`game_mode_${resolvedTheme}`]}`}>
            {t('game_mode', resolvedLang)}
          </h4>
          <div className={styles.tab_switcher}>
            {challengeData.map((challenge) => (
              <button
                key={challenge.gameModeChecker}
                className={`${styles.tab} ${
                  activeTab === challenge.gameModeChecker ? styles.tab_active : ''
                } ${styles[`tab_${theme}`]}`}
                onClick={() => setActiveTab(challenge.gameModeChecker)}
              >
                {challenge.gameModeIdentity}
              </button>
            ))}
          </div>
          <div className={styles.lac_content}>{renderTabContent()}</div>
        </div>
      )}

      {payoutState === 'loading' && <LoadingView text={t('loading_text', resolvedLang)} />}
      {payoutState === 'error' && (
        <ErrorView
          text={t('error_text', resolvedLang)}
          buttonText={t('try_again', resolvedLang)}
          onButtonClick={fetchPayoutData}
        />
      )}
      {payoutState === 'empty' && (
        <NoResultsView
          text={t('no_results', resolvedLang)}
          buttonText={t('try_again', resolvedLang)}
          onButtonClick={fetchPayoutData}
        />
      )}
    </div>
  );
}