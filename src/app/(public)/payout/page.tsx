'use client';

import { use, useState, useEffect, useRef, useMemo } from 'react';
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
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';


interface Config {
  showHeader: boolean;
  backgroundColor: Record<string, string> | null;
}

const iosConfig: Config = {
  showHeader: false,
  backgroundColor: { 'light': '#fff', 'dark': '#212121' }
};

const androidConfig: Config = {
  showHeader: false,
  backgroundColor: { 'light': '#fff', 'dark': '#232323' }
};

const landingConfig: Config = {
  showHeader: false,
  backgroundColor: null
};

const defaultConfig: Config = {
  showHeader: true,
  backgroundColor: null
};

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = {
    'ios': iosConfig,
    'android': androidConfig,
    'landing': landingConfig
  };
  return configMap[req || ''] || defaultConfig;
};

type StringOrNull = string | null;

interface Params {
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

// Types
interface RoleRevenue {
  'Roles.creator'?: number;
  'Roles.reviewer'?: number;
  'Roles.celebrity'?: number;
  'Roles.organization'?: number;
  [key: string]: number | undefined;
}

interface QuestionOption {
  count: number;
  entryFees: number;
  developmentCharge: number;
  roleRevenue: RoleRevenue;
  winnerPayout: number;
  loserPayout: number;
  creatorShare: number;
  reviewerShare: number;
}

interface ChallengeOption {
  name: string;
  min: number;
  max: number;
  top: number;
  mid: number;
  bot: number;
  questions: number;
  entryFee: number;
  developmentCharge: number;
  roleRevenue: RoleRevenue;
  creatorShare: number;
  reviewerShare: number;
}

interface CalculatorMode {
  '1v1': {
    title: string;
    questionOptions: QuestionOption[];
  };
  multiplayer: {
    title: string;
    challengeOptions: ChallengeOption[];
  };
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

// Constants
const calculatorData: CalculatorMode = {
  '1v1': {
    title: '1v1',
    questionOptions: [
      { count: 3, entryFees: 300, developmentCharge: 20, creatorShare: 20, reviewerShare: 20, roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0, 'Roles.celebrity': 5 }, winnerPayout: 450,  loserPayout: 100 },
      { count: 5, entryFees: 500, developmentCharge: 40, creatorShare: 40, reviewerShare: 40,  roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0, 'Roles.celebrity': 5 }, winnerPayout: 750, loserPayout: 150 },
      { count: 8, entryFees: 800, developmentCharge: 20, creatorShare: 80, reviewerShare: 80,  roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0,' Roles.celebrity': 5 },  winnerPayout: 1200,loserPayout: 200 },
    ],
  },
  'multiplayer': {
    title: 'Multiplayer',
    challengeOptions: [
      { name: 'Mini Challenge', min: 6, max: 1000, top: 1400, mid: 1200, bot: 1000, questions: 10, entryFee: 700, developmentCharge: 20, creatorShare: 5, reviewerShare: 5, roleRevenue: { 'Roles.creator': 2, 'Roles.reviewer': 2, 'Roles.celebrity': 5 },},
      { name: 'Extended Challenge', min: 10, max: 300, top: 1960, mid: 1680, bot: 1400, questions: 20, entryFee: 980, developmentCharge: 20, creatorShare: 10, reviewerShare: 10, roleRevenue: { 'Roles.creator': 3, 'Roles.reviewer': 3, 'Roles.celebrity': 7 }, },
      { name: 'Standard Challenge', min: 20, max: 500, top: 3920, mid: 3360, bot: 2800, questions: 15, entryFee: 980, developmentCharge: 20, creatorShare: 20, reviewerShare: 20, roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0, 'Roles.organization': 10 }, },
      { name: 'Advanced Challenge', min: 20, max: 200, top: 4800, mid: 4114, bot: 3429, questions: 20, entryFee: 1200, developmentCharge: 20, creatorShare: 20, reviewerShare: 20, roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0, 'Roles.organization': 10 }, },
      { name: 'Pro Challenge', min: 30, max: 100, top: 7200, mid: 6171, bot: 5143, questions: 20, entryFee: 1200, developmentCharge: 20, creatorShare: 20, reviewerShare: 20, roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0, 'Roles.organization': 10 }, },
      { name: 'Premium Challenge', min: 30, max: 50, top: 8400, mid: 7200, bot: 6000, questions: 20, entryFee: 1400, developmentCharge: 20, creatorShare: 20, reviewerShare: 20, roleRevenue: { 'Roles.creator': 0, 'Roles.reviewer': 0, 'Roles.organization': 10 }, },
    ]
  },
};

const allRoles = ['Roles.creator', 'Roles.reviewer', 'Roles.organization', 'Roles.teacher', 'Roles.celebrity', 'Roles.parent', 'Roles.institution'];



// Utility Functions
const calculateMoreRewards = (
  size: number,
  min: number,
  entryFee: number,
  topPrize: number,
  midPrize: number,
  botPrize: number,
  devChargePct: number
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
    rewards.push({ rank: `Student ${rank}`, amount });
    totalDistributed += amount;
  }

  const remainingForRank = remainingAfterDev - totalDistributed;
  const rankParticipants = size - winnersSize;

  if (rankParticipants > 0) {
    const totalWeight = (rankParticipants * (rankParticipants + 1)) / 2;

    for (let rank = winnersSize + 1; rank <= size; rank++) {
      const weight = size - rank + 1;
      const amount = remainingForRank * (weight / totalWeight);
      rewards.push({ rank: `Student ${rank}`, amount: Number(amount.toFixed(2)) });
    }
  }

  return { rewards: rewards, devCharge: devCharge, winnersSize: winnersSize };
};

// Components
const RoleSelector = ({
  roles,
  selectedRole,
  onSelect}: {
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

const OneVsOneView = ({ data, roles }: { data: CalculatorMode['1v1']; roles: string[] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedQuestion, setSelectedQuestion] = useState(data.questionOptions[0]);
  const [selectedRole, setSelectedRole] = useState('Roles.creator');

  const calculateCharge = (entryFee: number, winnerPayout: number, loserPayout: number, questionsCount: number, roleWeight: number, devChargePct: number, share: number) => {
      const totalPool = entryFee * 2;
      const payout = (winnerPayout + loserPayout);
      const remainder = totalPool - payout;
      const devCharge = remainder * (devChargePct/100);
      const roleExtra = devCharge * (roleWeight/ 100);
      return ((share + roleExtra)/questionsCount).toFixed(2);
  }

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>
      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>Revenue Role</h4>
      <RoleSelector
        roles={roles}
        selectedRole={selectedRole}
        onSelect={setSelectedRole}
      />

      <div className={styles.carouselContainer}>
        <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
        </div>
        <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z"/>
          </svg>
        </div>
        <Swiper
          modules={[Navigation]}
          loop={data.questionOptions.length > 3}
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
          {data.questionOptions.map((option, idx) => (
            <SwiperSlide key={idx}>
              <button
                className={`${styles.q_button} ${selectedQuestion.count === option.count ? styles.q_selected : ''} ${styles[`q_button_${theme}`]}`}
                onClick={() => setSelectedQuestion(option)}
              >
                {option.count} Questions
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className={styles.matchup}>
        <button className={`${styles.player_button} ${styles[`player_button_${theme}`]}`}>Player 1</button>
        <span className={`${styles.vs} ${styles[`vs_${theme}`]}`}>vs</span>
        <button className={`${styles.player_button} ${styles[`player_button_${theme}`]}`}>Player 2</button>
      </div>
      <div className={`${styles.score} ${styles[`score_${theme}`]}`}>
        <span>{selectedQuestion.entryFees}</span>
        <span>+</span>
        <span>{selectedQuestion.entryFees}</span>
      </div>

      <div className={`${styles.payout_breakdown} ${styles[`payout_breakdown_${theme}`]}`}>
        <div className={styles.payout_row}>
          <span>Winner:</span>
          <span className={styles.payout_value}>{selectedQuestion.winnerPayout}</span>
        </div>
        <div className={styles.payout_row}>
          <span>Loser:</span>
          <span className={styles.payout_value}>{selectedQuestion.loserPayout}</span>
        </div>
        { selectedRole != 'Roles.Reviewer' && (<div className={styles.payout_row}>
          <span>{t(selectedRole)}:</span>
          <span className={styles.payout_value}>{calculateCharge(selectedQuestion.entryFees, selectedQuestion.winnerPayout, selectedQuestion.loserPayout,
              selectedQuestion.count, (selectedQuestion.roleRevenue[selectedRole] || 0), selectedQuestion.developmentCharge, selectedQuestion.creatorShare)} /question</span>
        </div>)}
        { selectedRole == 'Roles.Reviewer' && (<div className={styles.payout_row}>
          <span>Creator:</span>
          <span className={styles.payout_value}>{calculateCharge(selectedQuestion.entryFees, selectedQuestion.winnerPayout, selectedQuestion.loserPayout,
              selectedQuestion.count, (selectedQuestion.roleRevenue['Roles.creator'] || 0), selectedQuestion.developmentCharge, selectedQuestion.creatorShare)} /question</span>
        </div>)}
        <div className={styles.payout_row}>
          <span>Reviewer:</span>
          <span className={styles.payout_value}>{calculateCharge(selectedQuestion.entryFees, selectedQuestion.winnerPayout, selectedQuestion.loserPayout,
              selectedQuestion.count, (selectedQuestion.roleRevenue['Roles.reviewer'] || 0), selectedQuestion.developmentCharge, selectedQuestion.reviewerShare)} /question</span>
        </div>
      </div>
    </div>
  );
};

const MultiplayerView = ({ data, roles }: { data: CalculatorMode['multiplayer']; roles: string[] }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedChallenge, setSelectedChallenge] = useState(data.challengeOptions[0]);
  const [minPlayers, setMinPlayers] = useState(selectedChallenge.min);
  const [selectedRole, setSelectedRole] = useState('Roles.creator');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const moreRewards = useMemo(() => calculateMoreRewards(
    minPlayers,
    selectedChallenge.min,
    selectedChallenge.entryFee,
    selectedChallenge.top,
    selectedChallenge.mid,
    selectedChallenge.bot,
    selectedChallenge.developmentCharge
  ), [minPlayers, selectedChallenge]);

  const paginatedRewards = moreRewards.rewards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(moreRewards.rewards.length / itemsPerPage);

  const handleChallengeChange = (challenge: ChallengeOption) => {
    setSelectedChallenge(challenge);
    setMinPlayers(Number(challenge.min));
    setCurrentPage(1);
  };

  const devChargeList: Record<number, number> = {
    6: 2.38,
    7: 4.76,
    8: 9.52,
    9: 14.28
  };



  const calculateCharge = (entryFee: number, minPlayers: number, questionsCount: number, roleWeight: number, devChargePct: number, share: number) => {
        const totalPool = minPlayers * entryFee;
        let devCharge: number;
        let rolePool: number;
        let roleExtra: number;

        if (minPlayers > 9) {
          devCharge = totalPool * (devChargePct / 100);
          rolePool = devCharge * 0.5;
          roleExtra = rolePool * (roleWeight/ 100);
        } else {
          const chargePct = devChargeList[minPlayers] || devChargePct;
          devCharge = totalPool * (chargePct / 100);
          rolePool = devCharge - ((minPlayers/6) - 1);
          roleExtra = (devCharge - rolePool) * (roleWeight/ 100);
        }
        return ((share + roleExtra)).toFixed(2);
  }

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>
      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>Revenue Role</h4>
      <RoleSelector
        roles={roles}
        selectedRole={selectedRole}
        onSelect={setSelectedRole}
      />

      <div className={styles.carouselContainer}>
        <div className={`${styles.navButton} ${styles.navPrev} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
        </div>
        <div className={`${styles.navButton} ${styles.navNext} ${styles[`navButton_${theme}`]}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z"/>
          </svg>
        </div>
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
          {data.challengeOptions.map((challenge) => (
            <SwiperSlide key={challenge.name}>
              <button
                className={`${styles.q_button} ${selectedChallenge.name === challenge.name ? styles.q_selected : ''} ${styles[`q_button_${theme}`]}`}
                onClick={() => handleChallengeChange(challenge)}
              >
                {challenge.name}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className={`${styles.entry_fee} ${styles[`entry_fee_${theme}`]}`}>
        <strong>Entry Fee:</strong> {selectedChallenge.entryFee}
      </div>

      <div className={styles.slider_container}>
        <label className={`${styles.slider_label} ${styles[`slider_label_${theme}`]}`}>Minimum Player: {minPlayers}</label>
        <input
          type="range"
          min={selectedChallenge.min}
          max={selectedChallenge.max}
          value={minPlayers}
          onChange={(e) => {
            setMinPlayers(Number(e.target.value));
            setCurrentPage(1);
          }}
          className={`${styles.slider} ${styles[`slider_${theme}`]}`}
        />
      </div>

      <div className={`${styles.payout_table} ${styles[`payout_table_${theme}`]}`}>
        <div className={`${styles.table_header} ${styles[`table_header_${theme}`]}`}>
          <span>#</span>
          <span>Rank</span>
          <span>Amount</span>
        </div>
        {paginatedRewards.map((payout, index) => (
          <div
            key={index}
            className={`${styles.table_row} ${styles[`table_row_${theme}`]} ${
              (currentPage - 1) * itemsPerPage + index  < moreRewards.winnersSize ? styles.top_winner : ''
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
            Previous
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
            Next
          </button>
        </div>
      )}

      <div className={`${styles.creator_info} ${styles[`creator_info_${theme}`]}`}>
        {selectedRole != 'Roles.Reviewer' && <div className={styles.payout_row}>
          <span>{t(selectedRole)}:</span>
          <span className={styles.payout_value}>{calculateCharge(selectedChallenge.entryFee,minPlayers, selectedChallenge.questions, selectedChallenge.roleRevenue[selectedRole] || 0, selectedChallenge.developmentCharge, selectedChallenge.creatorShare)} /question</span>
        </div>}
        {selectedRole == 'Roles.Reviewer' && <div className={styles.payout_row}>
          <span>Creator:</span>
          <span className={styles.payout_value}>{calculateCharge(selectedChallenge.entryFee,minPlayers, selectedChallenge.questions, selectedChallenge.roleRevenue['Roles.creator'] || 0, selectedChallenge.developmentCharge, selectedChallenge.creatorShare)} /question</span>
        </div>}
        <div className={styles.payout_row}>
          <span>Reviewer:</span>
          <span className={styles.payout_value}>{calculateCharge(selectedChallenge.entryFee,minPlayers, selectedChallenge.questions, selectedChallenge.roleRevenue['Roles.reviewer'] || 0, selectedChallenge.developmentCharge, selectedChallenge.reviewerShare)} /question</span>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function Payout({ searchParams }: PayoutPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang  } = useLanguage();

  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;
  
  const [activeTab, setActiveTab] = useState<'1v1' | 'multiplayer'>('1v1');
  
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  // Determine background style - SIMPLIFIED APPROACH
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
      return `${baseClass} ${styles[`container_${req}`]}`; // Don't apply CSS class when using config background
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]} ${styles[`container_${req}`]}`;
  };



  return (
    <div
       className={getContainerClass()}
       style={getBackgroundStyle()}
    >
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {canGoBack && (
              <button
                className={styles.backButton}
                onClick={() => router.back()}
                aria-label="Go back"
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
          </div>
        </header>
      ) }

      <h1 className={`${styles.bigTitle} ${styles[`bigTitle_${theme}`]}`}>Academix Calculator</h1>
      <h4 className={`${styles.description} ${styles[`description_${theme}`]}`}>
        Academix uses a smart, scalable reward system that adjusts prize distribution based on the number of players in a quiz.
      </h4>

      <div className={`${styles.innerBody} ${styles[`innerBody_${theme}`]}`}>
        <h4 className={`${styles.game_mode} ${styles[`game_mode_${theme}`]}`}>Game Mode</h4>
        <div className={styles.tab_switcher}>
          <button
            className={`${styles.tab} ${activeTab === '1v1' ? styles.tab_active : ''} ${styles[`tab_${theme}`]}`}
            onClick={() => setActiveTab('1v1')}
          >
            1v1
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'multiplayer' ? styles.tab_active : ''} ${styles[`tab_${theme}`]}`}
            onClick={() => setActiveTab('multiplayer')}
          >
            Multiplayer
          </button>
        </div>

        <div className={styles.lac_content}>
          {activeTab === '1v1' ? (
            <OneVsOneView data={calculatorData['1v1']} roles={allRoles} />
          ) : (
            <MultiplayerView data={calculatorData['multiplayer']} roles={allRoles} />
          )}
        </div>
      </div>
    </div>
  );
}