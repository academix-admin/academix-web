'use client';
import { useState, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import styles from './LandingAcademixCalculator.module.css';

// Types
interface RoleRevenue {
  creator: number;
  reviewer: number;
  organization: number;
  [key: string]: number;
}

interface QuestionOption {
  count: number;
  entryFees: number;
  developmentCharge: number;
  roleRevenue: RoleRevenue;
  winnerPayout: number;
  loserPayout: number;
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
      { count: 3, entryFees: 300, developmentCharge: 20, roleRevenue: { creator: 30, reviewer: 30, organization: 20 }, winnerPayout: 450,  loserPayout: 100 },
      { count: 5, entryFees: 500, developmentCharge: 20, roleRevenue: { creator: 50, reviewer: 50, organization: 20 }, winnerPayout: 750, loserPayout: 200 },
      { count: 8, entryFees: 800, developmentCharge: 20, roleRevenue: { creator: 80, reviewer: 80, organization: 20 },  winnerPayout: 1200,loserPayout: 300 },
      { count: 10, entryFees: 1000, developmentCharge: 20, roleRevenue: { creator: 100, reviewer: 100, organization: 20 }, winnerPayout: 1500, loserPayout: 500 },
      { count: 15, entryFees: 1200, developmentCharge: 20, roleRevenue: { creator: 150, reviewer: 150, organization: 20 }, winnerPayout: 1800, loserPayout: 800 },
    ],
  },
  'multiplayer': {
    title: 'Multiplayer',
    challengeOptions: [
      { name: 'Mini Challenge', min: 6, max: 1000, top: 1400, mid: 1200, bot: 1000, questions: 10, entryFee: 700, developmentCharge: 20, roleRevenue: { creator: 100, reviewer: 100, organization: 20 } },
      { name: 'Standard Challenge', min: 20, max: 500, top: 3920, mid: 3360, bot: 2800, questions: 15, entryFee: 980, developmentCharge: 20, roleRevenue: { creator: 150, reviewer: 150, organization: 20 } },
      { name: 'Extended Challenge', min: 10, max: 300, top: 1960, mid: 1680, bot: 1400, questions: 20, entryFee: 980, developmentCharge: 20, roleRevenue: { creator: 200, reviewer: 200, organization: 20 } },
      { name: 'Advanced Challenge', min: 20, max: 200, top: 4800, mid: 4114, bot: 3429, questions: 20, entryFee: 1200, developmentCharge: 20, roleRevenue: { creator: 200, reviewer: 200, organization: 20 } },
      { name: 'Pro Challenge', min: 30, max: 100, top: 7200, mid: 6171, bot: 5143, questions: 20, entryFee: 1200, developmentCharge: 20, roleRevenue: { creator: 200, reviewer: 200, organization: 20 } },
      { name: 'Premium Challenge', min: 30, max: 50, top: 8400, mid: 7200, bot: 6000, questions: 20, entryFee: 1400, developmentCharge: 20, roleRevenue: { creator: 200, reviewer: 200, organization: 20 } },
    ]
  },
};

const allRoles = ['Creator', 'Reviewer', 'Organization', 'Teacher', 'Celebrity', 'Parent', 'Institution'];

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
  let winnersSize = Math.ceil((3 * size) / Math.max(min, 10));
  winnersSize = Math.max(winnersSize, 3);
  winnersSize = Math.min(winnersSize, size);

  const eachCategory = Math.ceil(winnersSize / 3);
  const rewards: SimpleReward[] = [];
  let totalDistributed = 0;

  for (let rank = 1; rank <= winnersSize; rank++) {
    let amount = 0;

    if (rank <= eachCategory) {
      amount = topPrize;
    } else if (rank <= 2 * eachCategory) {
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

  return {rewards: rewards, devCharge: devCharge};
};

// Components
const RoleSelector = ({
  roles,
  selectedRole,
  onSelect,
  theme
}: {
  roles: string[];
  selectedRole: string;
  onSelect: (role: string) => void;
  theme: string;
}) => {
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
            {role}
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
  const [selectedQuestion, setSelectedQuestion] = useState(data.questionOptions[0]);
  const [selectedRole, setSelectedRole] = useState('Creator');

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>
      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>Revenue Role</h4>
      <RoleSelector
        roles={roles}
        selectedRole={selectedRole}
        onSelect={setSelectedRole}
        theme={theme}
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
          <span>{selectedQuestion.winnerPayout}</span>
        </div>
        <div className={styles.payout_row}>
          <span>Loser:</span>
          <span>{selectedQuestion.loserPayout}</span>
        </div>
        <div className={styles.payout_row}>
          <span>{selectedRole}:</span>
          <span>{selectedQuestion.roleRevenue[selectedRole.toLowerCase()] || 0}</span>
        </div>
        <div className={styles.payout_row}>
          <span>Development Charge:</span>
          <span>{selectedQuestion.developmentCharge}</span>
        </div>
      </div>
    </div>
  );
};

const MultiplayerView = ({ data, roles }: { data: CalculatorMode['multiplayer']; roles: string[] }) => {
  const { theme } = useTheme();
  const [selectedChallenge, setSelectedChallenge] = useState(data.challengeOptions[0]);
  const [minPlayers, setMinPlayers] = useState(selectedChallenge.min);
  const [selectedRole, setSelectedRole] = useState('Creator');
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

  return (
    <div className={`${styles.card} ${styles[`card_${theme}`]}`}>
      <h4 className={`${styles.revenue_role} ${styles[`revenue_role_${theme}`]}`}>Revenue Role</h4>
      <RoleSelector
        roles={roles}
        selectedRole={selectedRole}
        onSelect={setSelectedRole}
        theme={theme}
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
              (currentPage - 1) * itemsPerPage + index < Math.max(3,((3 * minPlayers) / Math.max(selectedChallenge.min, 10))) ? styles.top_winner : ''
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
        <div className={styles.payout_row}>
          <span>{selectedRole}({selectedChallenge.questions}):</span>
          <span>{selectedChallenge.roleRevenue[selectedRole.toLowerCase()] || 0}</span>
        </div>
        <div className={styles.payout_row}>
          <span>Development Charge:</span>
          <span>{moreRewards.devCharge}</span>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function LandingAcademixCalculator() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'1v1' | 'multiplayer'>('1v1');

  return (
    <div className={`${styles.lac_container} ${styles[`lac_container_${theme}`]}`}>
      <h1 className={`${styles.title} ${styles[`title_${theme}`]}`}>Academix Calculator</h1>
      <h4 className={`${styles.description} ${styles[`description_${theme}`]}`}>
        Academix uses a smart, scalable reward system that adjusts prize distribution based on the number of players in a quiz.
      </h4>

      <div className={`${styles.lac_inner_container} ${styles[`lac_inner_container_${theme}`]}`}>
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