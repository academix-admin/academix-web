'use client';

import React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './rewards-streaks.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendDailyStreaksModel } from '@/models/daily-streaks';
import { DailyStreaksModel } from '@/models/daily-streaks';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { useAcademixRatio } from '@/lib/stacks/academix-ratio-stack';
import { useNav } from "@/lib/NavigationStack";


// Types
type DayIndex = 'none' | 'checked' | 'missed' | 'inProcess';

interface DayStatus {
  day: string;
  index: DayIndex;
}

interface DaysRowProps {
  days: DailyStreaksModel[];
  currentIndex: number;
  isContainerOpen: boolean;
  onDayClick: (index: number, open: boolean) => void;
}

interface RewardViewProps {
  streak: DailyStreaksModel;
  onClaim: (dateNumber: number) => Promise<void>;
  isClaiming: boolean;
  claimingDate?: number;
}

// Utility function to get day number
const getDateNumber = (): number => {
  const number = new Date().getDay() + 1;
  return number > 7 ? 1 : number;
};

// DaysRow Component
const DaysRow: React.FC<DaysRowProps> = ({ days, currentIndex, isContainerOpen, onDayClick }) => {
  const { t } = useLanguage();

     const shortDayMap: Record<number, string> = {
        1: t('sun_short'), // Sunday
        2: t('mon_short'), // Monday
        3: t('tue_short'), // Tuesday
        4: t('wed_short'), // Wednesday
        5: t('thu_short'), // Thursday
        6: t('fri_short'), // Friday
        7: t('sat_short'), // Saturday
      };

  const getColor = (streak: DailyStreaksModel): string => {
    if (streak.dailyStreaksStatus === 'future') {
      return 'transparent';
    }
    return 'transparent';
  };

  const getWidget = (streak: DailyStreaksModel, size: number): React.JSX.Element => {
    const isToday = streak.dailyStreaksStatus === 'today' && !streak.dailyStreaksCreatedAt;
    const isSaved = !!streak.dailyStreaksCreatedAt;
    const isMissed = streak.dailyStreaksStatus === 'missed';
    const isFuture = streak.dailyStreaksStatus === 'future';


    if (isToday) {
      return (
        <div
          style={{
            height: size,
            width: size,
            borderRadius: '50%',
            backgroundColor: 'white'
          }}
        />
      );
    }

    if (isMissed) {
      return (
        <span style={{ color: 'white', fontSize: size * 1.5 }}>✕</span>
      );
    }

    if (isFuture) {
      return (
        <span style={{ color: 'white', fontSize: size * 1.2 }}>🔒</span>
      );
    }

    if (isSaved) {
      return (
        <span style={{ color: 'white', fontSize: size * 1.5 }}>✓</span>
      );
    }

    return <></>;
  };

  return (
    <div className={styles.daysRow}>
      {days.map((dailyModel, index) => {
        const dayName =
        shortDayMap[dailyModel.dailyStreaksDateNumber] ||
         "Err";
        const isActive = currentIndex === index && isContainerOpen;

        return (
          <div
            key={index}
            className={`${styles.dayItem} ${isActive ? styles.activeDay : ''}`}
            onClick={() => onDayClick(index, !isContainerOpen)}
            style={{ width: `${100 / days.length}%` }}
          >
            <div className={styles.dayContent}>
              <div className={styles.dayName}>{dayName}</div>
              <div
                className={styles.dayCircle}
                style={{ backgroundColor: getColor(dailyModel) }}
              >
                {getWidget(dailyModel, 12)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// RewardView Component
const RewardView: React.FC<RewardViewProps> = ({ streak, onClaim, isClaiming, claimingDate }) => {
  const { t, tNode } = useLanguage();
  const isToday = streak.dailyStreaksStatus === 'today' && !streak.dailyStreaksCreatedAt;
  const isSaved = !!streak.dailyStreaksCreatedAt;
  const isMissed = streak.dailyStreaksStatus === 'missed';
  const isFuture = streak.dailyStreaksStatus === 'future';

  if (isToday) {
    const isCurrentlyClaiming = isClaiming && claimingDate === streak.dailyStreaksDateNumber;

    return (
      <button
        className={styles.claimButton}
        onClick={() => onClaim(streak.dailyStreaksDateNumber)}
        disabled={isCurrentlyClaiming}
      >
        {isCurrentlyClaiming ? (
          <div className={styles.loadingSpinner}></div>
        ) : (
          t('tap_to_reveal')
        )}
      </button>
    );
  }

  if (isMissed) {
    return (
      <div className={styles.missedReward}>
        {t('missed_text')}
      </div>
    );
  }

  if (isFuture) {
    return (
      <div className={styles.futureReward}>
        <span>🔒</span>
      </div>
    );
  }

  if (isSaved) {
    return (
      <div className={styles.claimedReward}>
        <div className={styles.rewardContent}>
          {streak.dailyStreaksAwarded > 0 && (
            <span className={styles.coinIcon}>🪙</span>
          )}
          <span className={styles.rewardAmount}>
            {streak.rewardRedeemCodeModel?.value
              ? new Intl.NumberFormat().format(streak.dailyStreaksAwarded)
              : t('streak_count', {
                  current: streak.dailyStreaksCount,
                  total: streak.dailyStreaksMax
                })
            }
          </span>
        </div>

        {streak.rewardRedeemCodeModel?.value && (
          <div className={styles.rewardCode}>
            {streak.rewardRedeemCodeModel.value}
          </div>
        )}

        {streak.rewardRedeemCodeModel?.expires && (
          <div className={styles.rewardExpiry}>
            {t('expires')} {new Date(streak.rewardRedeemCodeModel.expires).toLocaleDateString()}
          </div>
        )}

        {streak.rewardRedeemCodeModel?.value && (
          <button
            className={styles.copyButton}
            onClick={() => {
              navigator.clipboard.writeText(streak.rewardRedeemCodeModel!.value!);
              // Show toast notification
              alert(t('copied_to_clipboard'));
            }}
          >
            📋
          </button>
        )}
      </div>
    );
  }

  return <></>;
};

// Main Component
export default function RewardsStreaks({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const nav = useNav();

  const [academixRatioData, demandAcademixRatio, setAcademixRatio] = useAcademixRatio(lang);

  const [dailyStreaks, demandDailyStreaks, setDailyStreaks] = useDemandState<DailyStreaksModel[]>(
    [],
    {
      key: "dailyStreaks",
      persist: true,
//       ttl: 3600,
      scope: "secondary_flow",
      deps: [lang],
    }
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isContainerOpen, setIsContainerOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimingDate, setClaimingDate] = useState<number>();

  // Find initial index based on current day
  const findInitialIndex = useCallback(() => {
    if (!dailyStreaks.length) return 0;
    const todayNumber = getDateNumber();
    return dailyStreaks.findIndex(e => e.dailyStreaksDateNumber === todayNumber);
  }, [dailyStreaks]);

  useEffect(() => {
    setCurrentIndex(findInitialIndex());
  }, [dailyStreaks, findInitialIndex]);

  useEffect(() => {
      if (!userData) return;
    demandDailyStreaks(async ({ get, set }) => {
      onStateChange?.('loading');
      try {
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );

        if (!paramatical) return;

        const { data, error } = await supabaseBrowser.rpc("get_user_streaks", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;

        const dailyStreaksData = (data || []).map((row: BackendDailyStreaksModel) => new DailyStreaksModel(row));

        if (dailyStreaksData.length > 0) {
          set(dailyStreaksData);
          onStateChange?.('data');
        }
      } catch (err) {
        console.error("[RewardsStreaks] demand error:", err);
        onStateChange?.('error');
      }
    });
  }, [lang, userData, demandDailyStreaks]);

  useEffect(() => {
    if (dailyStreaks && dailyStreaks.length > 0) {
      onStateChange?.('data');
    } else {
      onStateChange?.('none');
    }
  }, [dailyStreaks]);

  const handleDayClick = (index: number, open: boolean) => {
    if (open && !isContainerOpen) {
      setCurrentIndex(index);
      setIsContainerOpen(true);
    } else {
      setCurrentIndex(index);
    }
  };

  const handlePrev = () => {
    const newIndex = currentIndex - 1;
    if (newIndex < 0) {
      setCurrentIndex(dailyStreaks.length - 1);
    } else {
      setCurrentIndex(newIndex);
    }
  };

  const handleNext = () => {
    const newIndex = currentIndex + 1;
    if (newIndex >= dailyStreaks.length) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(newIndex);
    }
  };

  const handleToggleContainer = () => {
    const newState = !isContainerOpen;
    setIsContainerOpen(newState);

    if (!newState) {
      setCurrentIndex(findInitialIndex());
    }
  };

  const handleClaimDailyStreak = async (dateNumber: number) => {
      if(!userData){
          console.error('Failed to claim daily streak:');
          return;
          }
    setIsClaiming(true);
    setClaimingDate(dateNumber);

    try {

        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );

        if (!paramatical) return;

        const { data, error } = await supabaseBrowser.rpc("claim_user_streaks", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;

        const streak = new DailyStreaksModel(data.daily_streaks_details);
        if (data.daily_streaks_details) {
                   let changed = false;
                   setDailyStreaks(dailyStreaks.map(m => {
                     if (m.dailyStreaksDateNumber === dateNumber) {
                       changed = true;
                       return streak;
                     }
                     return m;
                   }));

                   if (changed && data.status === "StreaksReward.success") {
                      //perform something
                      const { data, error } = await supabaseBrowser.rpc("get_user_academix_ratio", {
                                p_user_id: paramatical.usersId,
                                p_locale: paramatical.locale,
                                p_country: paramatical.country,
                                p_gender: paramatical.gender,
                                p_age: paramatical.age,
                              });

                              if (error || data?.error) return;

                              const academixRatio = (data.academix_ratio as number | null)?.toFixed(2) || 0;

                              if (data.status === "AcademixRatio.success") {
                                setAcademixRatio(Number(academixRatio));
                              }


                   }
        }


    } catch (error) {
      console.error('Failed to claim daily streak:', error);
    } finally {
      setIsClaiming(false);
      setClaimingDate(undefined);
    }
  };

  if (!dailyStreaks || dailyStreaks.length === 0) return null;

  const openRewardInfo = () =>{
      nav.push('rewards_info', {sectionId: 'streaks'});
  }

  return (
    <div className={styles.dailyStreaksContainer}>
      <h2 onClick={openRewardInfo} className={`${styles.dailyStreaksTitle} ${styles[`dailyStreaksTitle_${theme}`]}`}>
        {t('streaks_text')}
              <div  className={styles.infoIcon}>
                <svg fill="none"  viewBox="0 0 18 18"  xmlns="http://www.w3.org/2000/svg" aria-label="Infos">
                    <path
                        d="M9 0C7.21997 0 5.47991 0.527841 3.99987 1.51677C2.51983 2.50571 1.36628 3.91131 0.685088 5.55585C0.00389957 7.20038 -0.17433 9.00998 0.172936 10.7558C0.520203 12.5016 1.37737 14.1053 2.63604 15.364C3.89472 16.6226 5.49836 17.4798 7.24419 17.8271C8.99002 18.1743 10.7996 17.9961 12.4442 17.3149C14.0887 16.6337 15.4943 15.4802 16.4832 14.0001C17.4722 12.5201 18 10.78 18 9C18 6.61305 17.0518 4.32387 15.364 2.63604C13.6761 0.948212 11.3869 0 9 0ZM7.5 3.8625C7.5 3.56583 7.58798 3.27582 7.7528 3.02914C7.91762 2.78247 8.15189 2.59021 8.42598 2.47668C8.70007 2.36315 9.00167 2.33344 9.29264 2.39132C9.58361 2.4492 9.85088 2.59206 10.0607 2.80184C10.2704 3.01162 10.4133 3.27889 10.4712 3.56986C10.5291 3.86084 10.4994 4.16244 10.3858 4.43652C10.2723 4.71061 10.08 4.94488 9.83336 5.1097C9.58668 5.27453 9.29667 5.3625 9 5.3625C8.7968 5.37267 8.59365 5.3414 8.40292 5.27059C8.21218 5.19977 8.03785 5.0909 7.89052 4.95058C7.74319 4.81027 7.62594 4.64145 7.54591 4.45439C7.46589 4.26734 7.42475 4.06596 7.425 3.8625H7.5ZM12.75 13.5C12.75 13.6989 12.671 13.8897 12.5303 14.0303C12.3897 14.171 12.1989 14.25 12 14.25H6.75C6.55109 14.25 6.36033 14.171 6.21967 14.0303C6.07902 13.8897 6 13.6989 6 13.5C6 13.3011 6.07902 13.1103 6.21967 12.9697C6.36033 12.829 6.55109 12.75 6.75 12.75H8.25V8.25H7.5C7.30109 8.25 7.11032 8.17098 6.96967 8.03033C6.82902 7.88968 6.75 7.69891 6.75 7.5C6.75 7.30109 6.82902 7.11032 6.96967 6.96967C7.11032 6.82902 7.30109 6.75 7.5 6.75H10.5V12.75H12C12.1989 12.75 12.3897 12.829 12.5303 12.9697C12.671 13.1103 12.75 13.3011 12.75 13.5Z"
                        fill="currentColor" />
                </svg>
              </div>
      </h2>

      <div className={styles.dailyStreaksSection}>
        <div className={styles.daysContainer}>
          <DaysRow
            days={dailyStreaks}
            currentIndex={currentIndex}
            isContainerOpen={isContainerOpen}
            onDayClick={handleDayClick}
          />
        </div>

        <div className={`${styles.rewardsContainer} ${isContainerOpen ? styles.open : ''}`}>
          <div className={styles.rewardsNavigation}>
            <button className={styles.navButton} onClick={handlePrev}>‹</button>

            <div className={styles.rewardView}>
              <RewardView
                streak={dailyStreaks[currentIndex]}
                onClaim={handleClaimDailyStreak}
                isClaiming={isClaiming}
                claimingDate={claimingDate}
              />
            </div>

            <button className={styles.navButton} onClick={handleNext}>›</button>
          </div>
        </div>

        <button className={styles.toggleButton} onClick={handleToggleContainer}>
          {isContainerOpen ? '▲' : '▼'}
        </button>
      </div>
    </div>
  );
}