'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-result-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { PaginateModel } from '@/models/paginate-model';
import { getParamatical } from '@/utils/checkers';
import { BackendPoolMemberModel, PoolMemberModel } from '@/models/pool-member';

interface QuizResultProps {
  poolsId: string;
}

interface ResultViewProps {
  resultViewType: 'reward' | 'rank';
  setResultViewType: (viewType: 'reward' | 'rank') => void;
  resultsLoading: boolean;
  membersLoading: boolean;
  quizResult: PoolMemberModel | null;
  poolMembers: PoolMemberModel[];
  loaderRef: React.RefObject<HTMLDivElement | null>;
  callPaginate: () => void;
}

interface PodiumProps {
  members: PoolMemberModel[];
  viewType: 'reward' | 'rank';
  currentUser: PoolMemberModel | null;
}

interface PodiumStandProps {
  member: PoolMemberModel;
  viewType: 'reward' | 'rank';
  color: string;
  paddingBottom: number
  borderRadiusStyle: string;
  theme: string;
}

interface ParticipantsListProps {
  participants: PoolMemberModel[];
  viewType: 'reward' | 'rank';
  layout: 'mobile' | 'tablet' | 'web';
}

interface TabSwitcherProps {
  viewType: 'reward' | 'rank';
  setViewType: (viewType: 'reward' | 'rank') => void;
  maxWidth?: number;
}

const getInitials = (text: string): string => {
  const words = text.trim().split(' ');
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const formatPoints = (points: number) => {
  if (points < 0) return "-";
  if (points < 1000) return points.toString();
  if (points < 1000000) return `${(points / 1000).toFixed(1)}K`.replace('.0', '');
  return `${(points / 1000000).toFixed(1)}M`.replace('.0', '');
};

const formatTime = (time: number) => {
  const totalMs = time * 1000;
  const minutes = Math.floor(totalMs / (60 * 1000));
  const seconds = Math.floor((totalMs % (60 * 1000)) / 1000);
  const ms = (totalMs % 1000).toFixed(0);

  if (minutes > 0) return `${minutes}m ${seconds}s ${ms}ms`;
  if (seconds > 0) return `${seconds}s ${ms}ms`;
  return `${ms}ms`;
};

const getRankText = (rank: number) => {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1: return `${rank}st`;
    case 2: return `${rank}nd`;
    case 3: return `${rank}rd`;
    default: return `${rank}th`;
  }
};

const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace('-', '');
};

// Podium Component
const Podium = ({ members, viewType, currentUser }: PodiumProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const topThree = members.filter((member: PoolMemberModel) => member.poolsMembersRank <= 3);
  const rank1 = topThree.find((m: PoolMemberModel) => m.poolsMembersRank === 1);
  const rank2 = topThree.find((m: PoolMemberModel) => m.poolsMembersRank === 2);
  const rank3 = topThree.find((m: PoolMemberModel) => m.poolsMembersRank === 3);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);

  const updateOverlayHeight = useCallback(() => {
    if (overlayRef.current) {
      setOverlayHeight(overlayRef.current.offsetHeight + 16);
    }
  }, []);

  useEffect(() => {
    updateOverlayHeight();
  }, [currentUser, updateOverlayHeight]);

  // Add resize observer
  useEffect(() => {
    const currentOverlay = overlayRef.current;
    if (!currentOverlay) return;

    const resizeObserver = new ResizeObserver(() => {
      updateOverlayHeight();
    });

    resizeObserver.observe(currentOverlay);

    // Also listen to window resize as fallback
    const handleResize = () => {
      updateOverlayHeight();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.unobserve(currentOverlay);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateOverlayHeight]);

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return '#1a472a'; // Dark green for 1st
      case 2: return '#2d5016'; // Medium green for 2nd
      case 3: return '#5d4037'; // Bronze for 3rd
      default: return '#6a1b9a';
    }
  };

  const getRankPadding = (rank: number) => {
    switch (rank) {
      case 1: return 80; // Tallest
      case 2: return 40; // Medium
      case 3: return 16;  // Shortest
      default: return 0;
    }
  };


  const getBorderStyle = (rank: number) => {
    switch (rank) {
      case 1: return `${styles.centerPodiumBorderStyle}`;
      case 2: return `${styles.leftPodiumBorderStyle}`;
      case 3: return `${styles.rightPodiumBorderStyle}`;
      default: return '';
    }
  };

  return (
    <div className={styles.podiumContainer}>
      <div className={styles.podiumGrid}>
        {/* 2nd Place - Left */}
        {rank2 && (
          <PodiumStand
            member={rank2}
            viewType={viewType}
            color={getPodiumColor(2)}
            paddingBottom={getRankPadding(2) + overlayHeight}
            borderRadiusStyle={getBorderStyle(2)}
            theme={theme}
          />
        )}

        {/* 1st Place - Center */}
        {rank1 && (
          <PodiumStand
            member={rank1}
            viewType={viewType}
            color={getPodiumColor(1)}
            paddingBottom={getRankPadding(1) + overlayHeight}
            borderRadiusStyle={getBorderStyle(1)}
            theme={theme}
          />
        )}

        {/* 3rd Place - Right */}
        {rank3 && (
          <PodiumStand
            member={rank3}
            viewType={viewType}
            color={getPodiumColor(3)}
            paddingBottom={getRankPadding(3) + overlayHeight}
            borderRadiusStyle={getBorderStyle(3)}
            theme={theme}
          />
        )}
      </div>

      {/* Current User Card - Positioned absolutely over the grid */}
      {currentUser && currentUser.poolsMembersRank > 3 && (
        <div
          ref={overlayRef}
          className={`${styles.currentUserCard} ${styles[`currentUserCard_${theme}`]}`}
        >
          <div className={styles.userInfo}>
            {viewType === 'rank' && <div className={styles.rankBadge}>{getRankText(currentUser.poolsMembersRank)}</div>}
            <div className={styles.userAvatar}>
              {currentUser.userDetails.userImage ? (
                <Image
                  src={currentUser.userDetails.userImage}
                  alt={currentUser.userDetails.userName}
                  width={40}
                  height={40}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.initials}>{getInitials(currentUser.userDetails.userName)}</div>
              )}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.username}>
                {currentUser.poolsMembersIsUser ? t('you_text') : currentUser.userDetails.userUsername}
              </div>
              {viewType === 'reward' && (
                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <svg className={styles.icon} fill="#FFFFFF" height="12" viewBox="0 0 31 31" width="12" xmlns="http://www.w3.org/2000/svg">
                      <path d="M31 15.5C31 19.6109 29.367 23.5533 26.4602 26.4602C23.5533 29.367 19.6109 31 15.5 31C11.3891 31 7.44666 29.367 4.53985 26.4602C1.63303 23.5533 0 19.6109 0 15.5C0 11.3891 1.63303 7.44666 4.53985 4.53985C7.44666 1.63303 11.3891 0 15.5 0C19.6109 0 23.5533 1.63303 26.4602 4.53985C29.367 7.44666 31 11.3891 31 15.5ZM10.6562 7.75387V23.25H13.1421V17.7552H16.3738C19.4389 17.7552 21.3125 15.655 21.3125 12.7604C21.3125 9.889 19.4622 7.75387 16.3951 7.75387H10.6562ZM16.0231 15.6434C17.7533 15.6434 18.7724 14.5874 18.7724 12.7604C18.7724 10.9333 17.7533 9.889 16.0212 9.889H13.1324V15.6434H16.0231Z" fill="#FE9C36" />
                    </svg>
                    <span>{formatPoints(currentUser.poolsMembersPoints)}</span>
                  </div>
                  <div className={styles.statItem}>
                    <svg className={styles.icon} fill="none" height="10" viewBox="0 0 8 8" width="10" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.6 0C5.58828 0 7.2 1.64188 7.2 3.66737C7.2 5.69286 5.58828 7.33474 3.6 7.33474C1.61172 7.33474 0 5.69286 0 3.66737C0 1.64188 1.61172 0 3.6 0ZM3.6 1.46695C3.50452 1.46695 3.41295 1.50559 3.34544 1.57436C3.27793 1.64314 3.24 1.73642 3.24 1.83368V3.66737C3.24002 3.76463 3.27796 3.85789 3.34548 3.92665L4.42548 5.02686C4.49338 5.09367 4.58431 5.13063 4.6787 5.1298C4.77309 5.12896 4.86339 5.09039 4.93013 5.0224C4.99688 4.9544 5.03474 4.86242 5.03556 4.76626C5.03638 4.6701 5.0001 4.57746 4.93452 4.5083L3.96 3.51554V1.83368C3.96 1.73642 3.92207 1.64314 3.85456 1.57436C3.78705 1.50559 3.69548 1.46695 3.6 1.46695Z" fill="#005CE6" />
                    </svg>
                    <span>{formatTime(currentUser.poolsCompletedQuestionTrackerTime)}</span>
                  </div>
                  <div className={styles.statItem}>
                    <svg className={styles.icon} width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z" fill="red" />
                    </svg>
                    <span>{currentUser.poolsCompletedQuestionTrackerSize} / {currentUser.challengeQuestionCount}</span>
                  </div>
                  <div className={styles.statFlex}>
                    <div className={styles.statItem}>
                      <svg className={styles.icon} fill="none" height="86" viewBox="0 0 86 98" width="86" xmlns="http://www.w3.org/2000/svg"> <circle cx="43" cy="51" fill="#155B16" r="43" /> <circle cx="43" cy="51" fill="#249E27" r="40" /> <path d="M59.6494 46.5244V46.9512C59.6195 48.209 59.4847 49.5117 59.2451 50.8594C59.0205 52.207 58.6986 53.5547 58.2793 54.9023C57.86 56.25 57.3584 57.5827 56.7744 58.9004C56.1904 60.2181 55.5316 61.4759 54.7979 62.6738C54.0791 63.8867 53.3005 65.0173 52.4619 66.0654C51.6234 67.1286 50.7399 68.0645 49.8115 68.873L46.4648 66.9414C46.9889 66.0579 47.4606 65.0921 47.8799 64.0439C48.3141 63.0107 48.7035 61.9251 49.0479 60.7871C49.3923 59.6491 49.6842 58.4811 49.9238 57.2832C50.1784 56.0853 50.388 54.8949 50.5527 53.7119C50.7174 52.529 50.8372 51.3685 50.9121 50.2305C51.002 49.0775 51.0469 47.9844 51.0469 46.9512C51.0469 46.1426 51.0394 45.2292 51.0244 44.2109C51.0244 43.1777 50.9645 42.1296 50.8447 41.0664C50.7399 40.0033 50.5602 38.9701 50.3057 37.9668C50.0511 36.9486 49.6693 36.0426 49.1602 35.249C48.666 34.4554 48.0221 33.819 47.2285 33.3398C46.4499 32.8607 45.4766 32.6211 44.3086 32.6211C43.2754 32.6211 42.3844 32.8008 41.6357 33.1602C40.902 33.5046 40.2731 33.9762 39.749 34.5752C39.2399 35.1592 38.8281 35.8405 38.5137 36.6191C38.2142 37.3978 37.9746 38.2214 37.7949 39.0898C37.6302 39.9434 37.5179 40.8118 37.458 41.6953C37.4131 42.5638 37.3906 43.3874 37.3906 44.166V50.4326H47.0713V54.1387H37.3906V62H28.4736V45.5586C28.4736 43.2077 28.848 41.0215 29.5967 39C30.3454 36.9785 31.401 35.2266 32.7637 33.7441C34.1413 32.2467 35.7884 31.0788 37.7051 30.2402C39.6367 29.3867 41.7855 28.96 44.1514 28.96C45.7536 28.96 47.251 29.1921 48.6436 29.6562C50.0511 30.1055 51.3314 30.7344 52.4844 31.543C53.6374 32.3366 54.6631 33.2874 55.5615 34.3955C56.4749 35.4886 57.2311 36.6865 57.8301 37.9893C58.444 39.292 58.9082 40.6696 59.2227 42.1221C59.5371 43.5745 59.6794 45.042 59.6494 46.5244Z" fill="white" /> <rect fill="white" height="55" width="4" x="40" y="23.6075" /> </svg>
                      <span className={currentUser.poolsMembersPaidAmount < 0 ? `${styles.crossStat} ${styles[`crossStat_${theme}`]}` : ''}>{formatAmount(currentUser.poolsMembersPaidAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simplified PodiumStand Component
const PodiumStand = ({
  member,
  viewType,
  color,
  paddingBottom,
  borderRadiusStyle,
}: PodiumStandProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      className={styles.podiumStand}
    >

      {/* Username */}
      <div className={styles.standHeader}>
        <div className={`${styles.username} ${styles[`username_${theme}`]}`}>
          {member.poolsMembersIsUser ? 'You' : member.userDetails.userUsername}
        </div>
      </div>

      {/* Avatar */}
      <div className={styles.avatarContainer}>
        {member.userDetails.userImage ? (
          <Image
            src={member.userDetails.userImage}
            alt={member.userDetails.userName}
            width={50}
            height={50}
            className={styles.podiumAvatar}
          />
        ) : (
          <div className={styles.initials}>{getInitials(member.userDetails.userName)}</div>
        )}
      </div>


      {/* Podium Base */}
      <div
        className={`${styles.standBase} ${borderRadiusStyle}`}
        style={{ backgroundColor: color, paddingBottom: `${paddingBottom}px` }}
      >
        {viewType === 'rank' ? (
          <div className={styles.rankView}>
            <div className={styles.rankNumber}>{getRankText(member.poolsMembersRank)}</div>
            <svg className={styles.rankIcon} fill="none" height="20" viewBox="0 0 8 8" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.0640625 0.596875C0.021875 0.534375 0 0.459375 0 0.384375C0 0.171875 0.171875 0 0.384375 0H2.09219C2.26719 0 2.43125 0.0921875 2.52031 0.242188L3.59063 2.025C2.8375 2.12031 2.16406 2.47188 1.6625 2.99219L0.0640625 0.596875ZM7.93437 0.596875L6.3375 2.99219C5.83594 2.47188 5.1625 2.12031 4.40938 2.025L5.47969 0.242188C5.57031 0.0921875 5.73281 0 5.90781 0H7.61562C7.82812 0 8 0.171875 8 0.384375C8 0.459375 7.97812 0.534375 7.93594 0.596875H7.93437ZM1.25 5.25C1.25 4.52065 1.53973 3.82118 2.05546 3.30546C2.57118 2.78973 3.27065 2.5 4 2.5C4.72935 2.5 5.42882 2.78973 5.94454 3.30546C6.46027 3.82118 6.75 4.52065 6.75 5.25C6.75 5.97935 6.46027 6.67882 5.94454 7.19454C5.42882 7.71027 4.72935 8 4 8C3.27065 8 2.57118 7.71027 2.05546 7.19454C1.53973 6.67882 1.25 5.97935 1.25 5.25ZM4.13125 3.76719C4.07812 3.65781 3.92344 3.65781 3.86875 3.76719L3.51875 4.47656C3.49687 4.52031 3.45625 4.55 3.40937 4.55625L2.625 4.67031C2.50469 4.6875 2.45781 4.83437 2.54375 4.92031L3.11094 5.47344C3.14531 5.50781 3.16094 5.55469 3.15313 5.60313L3.01875 6.38281C2.99844 6.50156 3.12344 6.59375 3.23125 6.5375L3.93125 6.16875C3.97344 6.14687 4.025 6.14687 4.06719 6.16875L4.76719 6.5375C4.875 6.59375 5 6.50312 4.97969 6.38281L4.84531 5.60313C4.8375 5.55625 4.85312 5.50781 4.8875 5.47344L5.45469 4.92031C5.54219 4.83594 5.49375 4.68906 5.37344 4.67031L4.59062 4.55625C4.54375 4.55 4.50156 4.51875 4.48125 4.47656L4.13125 3.76719Z" fill="#ffffff" />
            </svg>
          </div>
        ) : (
          <div className={styles.rewardView}>
            <div className={styles.rewardStat}>
              <svg className={styles.rewardIcon} fill="#FFFFFF" height="14" viewBox="0 0 31 31" width="14" xmlns="http://www.w3.org/2000/svg">
                <path d="M31 15.5C31 19.6109 29.367 23.5533 26.4602 26.4602C23.5533 29.367 19.6109 31 15.5 31C11.3891 31 7.44666 29.367 4.53985 26.4602C1.63303 23.5533 0 19.6109 0 15.5C0 11.3891 1.63303 7.44666 4.53985 4.53985C7.44666 1.63303 11.3891 0 15.5 0C19.6109 0 23.5533 1.63303 26.4602 4.53985C29.367 7.44666 31 11.3891 31 15.5ZM10.6562 7.75387V23.25H13.1421V17.7552H16.3738C19.4389 17.7552 21.3125 15.655 21.3125 12.7604C21.3125 9.889 19.4622 7.75387 16.3951 7.75387H10.6562ZM16.0231 15.6434C17.7533 15.6434 18.7724 14.5874 18.7724 12.7604C18.7724 10.9333 17.7533 9.889 16.0212 9.889H13.1324V15.6434H16.0231Z" fill="#FE9C36" />
              </svg>
              <span className={styles.rewardText}>{formatPoints(member.poolsMembersPoints)}</span>
            </div>

            <div className={styles.rewardStat}>
              <svg className={styles.rewardIcon} fill="none" height="12" viewBox="0 0 8 8" width="12" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.6 0C5.58828 0 7.2 1.64188 7.2 3.66737C7.2 5.69286 5.58828 7.33474 3.6 7.33474C1.61172 7.33474 0 5.69286 0 3.66737C0 1.64188 1.61172 0 3.6 0ZM3.6 1.46695C3.50452 1.46695 3.41295 1.50559 3.34544 1.57436C3.27793 1.64314 3.24 1.73642 3.24 1.83368V3.66737C3.24002 3.76463 3.27796 3.85789 3.34548 3.92665L4.42548 5.02686C4.49338 5.09367 4.58431 5.13063 4.6787 5.1298C4.77309 5.12896 4.86339 5.09039 4.93013 5.0224C4.99688 4.9544 5.03474 4.86242 5.03556 4.76626C5.03638 4.6701 5.0001 4.57746 4.93452 4.5083L3.96 3.51554V1.83368C3.96 1.73642 3.92207 1.64314 3.85456 1.57436C3.78705 1.50559 3.69548 1.46695 3.6 1.46695Z" fill="#ffffff" />
              </svg>
              <span className={styles.rewardText}>{formatTime(member.poolsCompletedQuestionTrackerTime)}</span>
            </div>
            <div className={styles.rewardStat}>
              <svg className={styles.rewardIcon} width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z" fill="blue" />
              </svg>
              <span className={styles.rewardText}>{member.poolsCompletedQuestionTrackerSize} / {member.challengeQuestionCount}</span>
            </div>

            <div className={styles.rewardStat}>
              <svg className={styles.rewardIcon} fill="none" height="98" viewBox="0 0 86 98" width="86" xmlns="http://www.w3.org/2000/svg"> <circle cx="43" cy="51" fill="#155B16" r="43" /> <circle cx="43" cy="51" fill="#249E27" r="40" /> <path d="M59.6494 46.5244V46.9512C59.6195 48.209 59.4847 49.5117 59.2451 50.8594C59.0205 52.207 58.6986 53.5547 58.2793 54.9023C57.86 56.25 57.3584 57.5827 56.7744 58.9004C56.1904 60.2181 55.5316 61.4759 54.7979 62.6738C54.0791 63.8867 53.3005 65.0173 52.4619 66.0654C51.6234 67.1286 50.7399 68.0645 49.8115 68.873L46.4648 66.9414C46.9889 66.0579 47.4606 65.0921 47.8799 64.0439C48.3141 63.0107 48.7035 61.9251 49.0479 60.7871C49.3923 59.6491 49.6842 58.4811 49.9238 57.2832C50.1784 56.0853 50.388 54.8949 50.5527 53.7119C50.7174 52.529 50.8372 51.3685 50.9121 50.2305C51.002 49.0775 51.0469 47.9844 51.0469 46.9512C51.0469 46.1426 51.0394 45.2292 51.0244 44.2109C51.0244 43.1777 50.9645 42.1296 50.8447 41.0664C50.7399 40.0033 50.5602 38.9701 50.3057 37.9668C50.0511 36.9486 49.6693 36.0426 49.1602 35.249C48.666 34.4554 48.0221 33.819 47.2285 33.3398C46.4499 32.8607 45.4766 32.6211 44.3086 32.6211C43.2754 32.6211 42.3844 32.8008 41.6357 33.1602C40.902 33.5046 40.2731 33.9762 39.749 34.5752C39.2399 35.1592 38.8281 35.8405 38.5137 36.6191C38.2142 37.3978 37.9746 38.2214 37.7949 39.0898C37.6302 39.9434 37.5179 40.8118 37.458 41.6953C37.4131 42.5638 37.3906 43.3874 37.3906 44.166V50.4326H47.0713V54.1387H37.3906V62H28.4736V45.5586C28.4736 43.2077 28.848 41.0215 29.5967 39C30.3454 36.9785 31.401 35.2266 32.7637 33.7441C34.1413 32.2467 35.7884 31.0788 37.7051 30.2402C39.6367 29.3867 41.7855 28.96 44.1514 28.96C45.7536 28.96 47.251 29.1921 48.6436 29.6562C50.0511 30.1055 51.3314 30.7344 52.4844 31.543C53.6374 32.3366 54.6631 33.2874 55.5615 34.3955C56.4749 35.4886 57.2311 36.6865 57.8301 37.9893C58.444 39.292 58.9082 40.6696 59.2227 42.1221C59.5371 43.5745 59.6794 45.042 59.6494 46.5244Z" fill="white" /> <rect fill="white" height="55" width="4" x="40" y="23.6075" /> </svg>
              <span className={member.poolsMembersPaidAmount < 0 ? `${styles.crossText} ${styles[`crossText_${theme}`]}` : styles.rewardText}>{formatAmount(member.poolsMembersPaidAmount)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Participants List Component
const ParticipantsList = ({ participants, viewType, layout }: ParticipantsListProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (layout === 'web') {
    return (
      <div className={styles.participantsGridWeb}>
        {participants.map((participant: PoolMemberModel) => (
          <div key={participant.userDetails.userId} className={`${styles.participantCard} ${styles[`participantCard_${theme}`]}`}>
            <div className={styles.cardHeader}>
              {viewType === 'rank' && <div className={styles.rankPosition}>{getRankText(participant.poolsMembersRank)}</div>}
              {participant.userDetails.userImage ? (
                <Image
                  src={participant.userDetails.userImage}
                  alt={participant.userDetails.userName}
                  width={40}
                  height={40}
                  className={styles.participantAvatar}
                />
              ) : (
                <div className={styles.initials}>{getInitials(participant.userDetails.userName)}</div>
              )}
              <div className={styles.participantName}>
                {participant.poolsMembersIsUser ? t('you_text') : participant.userDetails.userUsername}
              </div>
            </div>
            {viewType === 'reward' && (
              <div className={styles.cardStats}>
                <div className={styles.statRow}>
                  <div className={styles.stat}>
                    <svg className={styles.icon} fill="#FFFFFF" height="10" viewBox="0 0 31 31" width="10" xmlns="http://www.w3.org/2000/svg">
                      <path d="M31 15.5C31 19.6109 29.367 23.5533 26.4602 26.4602C23.5533 29.367 19.6109 31 15.5 31C11.3891 31 7.44666 29.367 4.53985 26.4602C1.63303 23.5533 0 19.6109 0 15.5C0 11.3891 1.63303 7.44666 4.53985 4.53985C7.44666 1.63303 11.3891 0 15.5 0C19.6109 0 23.5533 1.63303 26.4602 4.53985C29.367 7.44666 31 11.3891 31 15.5ZM10.6562 7.75387V23.25H13.1421V17.7552H16.3738C19.4389 17.7552 21.3125 15.655 21.3125 12.7604C21.3125 9.889 19.4622 7.75387 16.3951 7.75387H10.6562ZM16.0231 15.6434C17.7533 15.6434 18.7724 14.5874 18.7724 12.7604C18.7724 10.9333 17.7533 9.889 16.0212 9.889H13.1324V15.6434H16.0231Z" fill="#FE9C36" />
                    </svg>
                    <span>{formatPoints(participant.poolsMembersPoints)}</span>
                  </div>
                  <div className={styles.stat}>
                    <svg className={styles.icon} fill="none" height="10" viewBox="0 0 8 8" width="10" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.6 0C5.58828 0 7.2 1.64188 7.2 3.66737C7.2 5.69286 5.58828 7.33474 3.6 7.33474C1.61172 7.33474 0 5.69286 0 3.66737C0 1.64188 1.61172 0 3.6 0ZM3.6 1.46695C3.50452 1.46695 3.41295 1.50559 3.34544 1.57436C3.27793 1.64314 3.24 1.73642 3.24 1.83368V3.66737C3.24002 3.76463 3.27796 3.85789 3.34548 3.92665L4.42548 5.02686C4.49338 5.09367 4.58431 5.13063 4.6787 5.1298C4.77309 5.12896 4.86339 5.09039 4.93013 5.0224C4.99688 4.9544 5.03474 4.86242 5.03556 4.76626C5.03638 4.6701 5.0001 4.57746 4.93452 4.5083L3.96 3.51554V1.83368C3.96 1.73642 3.92207 1.64314 3.85456 1.57436C3.78705 1.50559 3.69548 1.46695 3.6 1.46695Z" fill="#005CE6" />
                    </svg>
                    <span>{formatTime(participant.poolsCompletedQuestionTrackerTime)}</span>
                  </div>
                </div>
                <div className={styles.stat}>
                  <svg className={styles.icon} width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z" fill="red" />
                  </svg>
                  <span>{participant.poolsCompletedQuestionTrackerSize} / {participant.challengeQuestionCount}</span>
                </div>
                <div className={styles.statFlex}>
                  <div className={styles.stat}>
                    <svg className={styles.icon} fill="none" height="86" viewBox="0 0 86 98" width="86" xmlns="http://www.w3.org/2000/svg"> <circle cx="43" cy="51" fill="#155B16" r="43" /> <circle cx="43" cy="51" fill="#249E27" r="40" /> <path d="M59.6494 46.5244V46.9512C59.6195 48.209 59.4847 49.5117 59.2451 50.8594C59.0205 52.207 58.6986 53.5547 58.2793 54.9023C57.86 56.25 57.3584 57.5827 56.7744 58.9004C56.1904 60.2181 55.5316 61.4759 54.7979 62.6738C54.0791 63.8867 53.3005 65.0173 52.4619 66.0654C51.6234 67.1286 50.7399 68.0645 49.8115 68.873L46.4648 66.9414C46.9889 66.0579 47.4606 65.0921 47.8799 64.0439C48.3141 63.0107 48.7035 61.9251 49.0479 60.7871C49.3923 59.6491 49.6842 58.4811 49.9238 57.2832C50.1784 56.0853 50.388 54.8949 50.5527 53.7119C50.7174 52.529 50.8372 51.3685 50.9121 50.2305C51.002 49.0775 51.0469 47.9844 51.0469 46.9512C51.0469 46.1426 51.0394 45.2292 51.0244 44.2109C51.0244 43.1777 50.9645 42.1296 50.8447 41.0664C50.7399 40.0033 50.5602 38.9701 50.3057 37.9668C50.0511 36.9486 49.6693 36.0426 49.1602 35.249C48.666 34.4554 48.0221 33.819 47.2285 33.3398C46.4499 32.8607 45.4766 32.6211 44.3086 32.6211C43.2754 32.6211 42.3844 32.8008 41.6357 33.1602C40.902 33.5046 40.2731 33.9762 39.749 34.5752C39.2399 35.1592 38.8281 35.8405 38.5137 36.6191C38.2142 37.3978 37.9746 38.2214 37.7949 39.0898C37.6302 39.9434 37.5179 40.8118 37.458 41.6953C37.4131 42.5638 37.3906 43.3874 37.3906 44.166V50.4326H47.0713V54.1387H37.3906V62H28.4736V45.5586C28.4736 43.2077 28.848 41.0215 29.5967 39C30.3454 36.9785 31.401 35.2266 32.7637 33.7441C34.1413 32.2467 35.7884 31.0788 37.7051 30.2402C39.6367 29.3867 41.7855 28.96 44.1514 28.96C45.7536 28.96 47.251 29.1921 48.6436 29.6562C50.0511 30.1055 51.3314 30.7344 52.4844 31.543C53.6374 32.3366 54.6631 33.2874 55.5615 34.3955C56.4749 35.4886 57.2311 36.6865 57.8301 37.9893C58.444 39.292 58.9082 40.6696 59.2227 42.1221C59.5371 43.5745 59.6794 45.042 59.6494 46.5244Z" fill="white" /> <rect fill="white" height="55" width="4" x="40" y="23.6075" /> </svg>
                    <span className={participant.poolsMembersPaidAmount < 0 ? `${styles.crossStat} ${styles[`crossStat_${theme}`]}` : ''}>{formatAmount(participant.poolsMembersPaidAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'tablet') {
    return (
      <div className={styles.participantsGridTablet}>
        {participants.map((participant: PoolMemberModel) => (
          <div key={participant.userDetails.userId} className={`${styles.participantCard} ${styles[`participantCard_${theme}`]}`}>
            <div className={styles.cardHeader}>
              {viewType === 'rank' && <div className={styles.rankPosition}>{getRankText(participant.poolsMembersRank)}</div>}
              {participant.userDetails.userImage ? (
                <Image
                  src={participant.userDetails.userImage}
                  alt={participant.userDetails.userName}
                  width={40}
                  height={40}
                  className={styles.participantAvatar}
                />
              ) : (
                <div className={styles.initials}>{getInitials(participant.userDetails.userName)}</div>
              )}
              <div className={styles.participantName}>
                {participant.poolsMembersIsUser ? t('you_text') : participant.userDetails.userUsername}
              </div>
            </div>
            {viewType === 'reward' && (
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <svg className={styles.icon} fill="#FFFFFF" height="10" viewBox="0 0 31 31" width="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M31 15.5C31 19.6109 29.367 23.5533 26.4602 26.4602C23.5533 29.367 19.6109 31 15.5 31C11.3891 31 7.44666 29.367 4.53985 26.4602C1.63303 23.5533 0 19.6109 0 15.5C0 11.3891 1.63303 7.44666 4.53985 4.53985C7.44666 1.63303 11.3891 0 15.5 0C19.6109 0 23.5533 1.63303 26.4602 4.53985C29.367 7.44666 31 11.3891 31 15.5ZM10.6562 7.75387V23.25H13.1421V17.7552H16.3738C19.4389 17.7552 21.3125 15.655 21.3125 12.7604C21.3125 9.889 19.4622 7.75387 16.3951 7.75387H10.6562ZM16.0231 15.6434C17.7533 15.6434 18.7724 14.5874 18.7724 12.7604C18.7724 10.9333 17.7533 9.889 16.0212 9.889H13.1324V15.6434H16.0231Z" fill="#FE9C36" />
                  </svg>
                  <span>{formatPoints(participant.poolsMembersPoints)}</span>
                </div>
                <div className={styles.stat}>
                  <svg className={styles.icon} fill="none" height="10" viewBox="0 0 8 8" width="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.6 0C5.58828 0 7.2 1.64188 7.2 3.66737C7.2 5.69286 5.58828 7.33474 3.6 7.33474C1.61172 7.33474 0 5.69286 0 3.66737C0 1.64188 1.61172 0 3.6 0ZM3.6 1.46695C3.50452 1.46695 3.41295 1.50559 3.34544 1.57436C3.27793 1.64314 3.24 1.73642 3.24 1.83368V3.66737C3.24002 3.76463 3.27796 3.85789 3.34548 3.92665L4.42548 5.02686C4.49338 5.09367 4.58431 5.13063 4.6787 5.1298C4.77309 5.12896 4.86339 5.09039 4.93013 5.0224C4.99688 4.9544 5.03474 4.86242 5.03556 4.76626C5.03638 4.6701 5.0001 4.57746 4.93452 4.5083L3.96 3.51554V1.83368C3.96 1.73642 3.92207 1.64314 3.85456 1.57436C3.78705 1.50559 3.69548 1.46695 3.6 1.46695Z" fill="#005CE6" />
                  </svg>
                  <span>{formatTime(participant.poolsCompletedQuestionTrackerTime)}</span>
                </div>
                <div className={styles.stat}>
                  <svg className={styles.icon} width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z" fill="red" />
                  </svg>
                  <span>{participant.poolsCompletedQuestionTrackerSize} / {participant.challengeQuestionCount}</span>
                </div>
                <div className={styles.statFlex}>
                  <div className={styles.stat}>
                    <svg className={styles.icon} fill="none" height="86" viewBox="0 0 86 98" width="86" xmlns="http://www.w3.org/2000/svg"> <circle cx="43" cy="51" fill="#155B16" r="43" /> <circle cx="43" cy="51" fill="#249E27" r="40" /> <path d="M59.6494 46.5244V46.9512C59.6195 48.209 59.4847 49.5117 59.2451 50.8594C59.0205 52.207 58.6986 53.5547 58.2793 54.9023C57.86 56.25 57.3584 57.5827 56.7744 58.9004C56.1904 60.2181 55.5316 61.4759 54.7979 62.6738C54.0791 63.8867 53.3005 65.0173 52.4619 66.0654C51.6234 67.1286 50.7399 68.0645 49.8115 68.873L46.4648 66.9414C46.9889 66.0579 47.4606 65.0921 47.8799 64.0439C48.3141 63.0107 48.7035 61.9251 49.0479 60.7871C49.3923 59.6491 49.6842 58.4811 49.9238 57.2832C50.1784 56.0853 50.388 54.8949 50.5527 53.7119C50.7174 52.529 50.8372 51.3685 50.9121 50.2305C51.002 49.0775 51.0469 47.9844 51.0469 46.9512C51.0469 46.1426 51.0394 45.2292 51.0244 44.2109C51.0244 43.1777 50.9645 42.1296 50.8447 41.0664C50.7399 40.0033 50.5602 38.9701 50.3057 37.9668C50.0511 36.9486 49.6693 36.0426 49.1602 35.249C48.666 34.4554 48.0221 33.819 47.2285 33.3398C46.4499 32.8607 45.4766 32.6211 44.3086 32.6211C43.2754 32.6211 42.3844 32.8008 41.6357 33.1602C40.902 33.5046 40.2731 33.9762 39.749 34.5752C39.2399 35.1592 38.8281 35.8405 38.5137 36.6191C38.2142 37.3978 37.9746 38.2214 37.7949 39.0898C37.6302 39.9434 37.5179 40.8118 37.458 41.6953C37.4131 42.5638 37.3906 43.3874 37.3906 44.166V50.4326H47.0713V54.1387H37.3906V62H28.4736V45.5586C28.4736 43.2077 28.848 41.0215 29.5967 39C30.3454 36.9785 31.401 35.2266 32.7637 33.7441C34.1413 32.2467 35.7884 31.0788 37.7051 30.2402C39.6367 29.3867 41.7855 28.96 44.1514 28.96C45.7536 28.96 47.251 29.1921 48.6436 29.6562C50.0511 30.1055 51.3314 30.7344 52.4844 31.543C53.6374 32.3366 54.6631 33.2874 55.5615 34.3955C56.4749 35.4886 57.2311 36.6865 57.8301 37.9893C58.444 39.292 58.9082 40.6696 59.2227 42.1221C59.5371 43.5745 59.6794 45.042 59.6494 46.5244Z" fill="white" /> <rect fill="white" height="55" width="4" x="40" y="23.6075" /> </svg>
                    <span className={participant.poolsMembersPaidAmount < 0 ? `${styles.crossStat} ${styles[`crossStat_${theme}`]}` : ''}>{formatAmount(participant.poolsMembersPaidAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Mobile layout
  return (
    <div className={styles.participantsList}>
      {participants.map((participant: PoolMemberModel, index: number) => (
        <div key={participant.userDetails.userId} className={`${styles.participantItem} ${styles[`participantItem_${theme}`]}`}>
          {viewType === 'rank' ? (
            <div className={styles.rankViewItem}>
              {viewType === 'rank' && <div className={styles.rankPosition}>{getRankText(participant.poolsMembersRank)}</div>}
              {participant.userDetails.userImage ? (
                <Image
                  src={participant.userDetails.userImage}
                  alt={participant.userDetails.userName}
                  width={40}
                  height={40}
                  className={styles.participantAvatar}
                />
              ) : (
                <div className={styles.initials}>{getInitials(participant.userDetails.userName)}</div>
              )}
              <div className={styles.participantName}>
                {participant.poolsMembersIsUser ? t('you_text') : participant.userDetails.userUsername}
              </div>
            </div>
          ) : (
            <div className={styles.rewardViewItem}>
              {participant.userDetails.userImage ? (
                <Image
                  src={participant.userDetails.userImage}
                  alt={participant.userDetails.userName}
                  width={40}
                  height={40}
                  className={styles.participantAvatar}
                />
              ) : (
                <div className={styles.initials}>{getInitials(participant.userDetails.userName)}</div>
              )}
              <div className={styles.participantDetails}>
                <div className={styles.participantName}>
                  {participant.poolsMembersIsUser ? t('you_text') : participant.userDetails.userUsername}
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.stat}>
                    <svg className={styles.icon} fill="#FFFFFF" height="10" viewBox="0 0 31 31" width="10" xmlns="http://www.w3.org/2000/svg">
                      <path d="M31 15.5C31 19.6109 29.367 23.5533 26.4602 26.4602C23.5533 29.367 19.6109 31 15.5 31C11.3891 31 7.44666 29.367 4.53985 26.4602C1.63303 23.5533 0 19.6109 0 15.5C0 11.3891 1.63303 7.44666 4.53985 4.53985C7.44666 1.63303 11.3891 0 15.5 0C19.6109 0 23.5533 1.63303 26.4602 4.53985C29.367 7.44666 31 11.3891 31 15.5ZM10.6562 7.75387V23.25H13.1421V17.7552H16.3738C19.4389 17.7552 21.3125 15.655 21.3125 12.7604C21.3125 9.889 19.4622 7.75387 16.3951 7.75387H10.6562ZM16.0231 15.6434C17.7533 15.6434 18.7724 14.5874 18.7724 12.7604C18.7724 10.9333 17.7533 9.889 16.0212 9.889H13.1324V15.6434H16.0231Z" fill="#FE9C36" />
                    </svg>
                    <span>{formatPoints(participant.poolsMembersPoints)}</span>
                  </div>
                  <div className={styles.stat}>
                    <svg className={styles.icon} fill="none" height="10" viewBox="0 0 8 8" width="10" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.6 0C5.58828 0 7.2 1.64188 7.2 3.66737C7.2 5.69286 5.58828 7.33474 3.6 7.33474C1.61172 7.33474 0 5.69286 0 3.66737C0 1.64188 1.61172 0 3.6 0ZM3.6 1.46695C3.50452 1.46695 3.41295 1.50559 3.34544 1.57436C3.27793 1.64314 3.24 1.73642 3.24 1.83368V3.66737C3.24002 3.76463 3.27796 3.85789 3.34548 3.92665L4.42548 5.02686C4.49338 5.09367 4.58431 5.13063 4.6787 5.1298C4.77309 5.12896 4.86339 5.09039 4.93013 5.0224C4.99688 4.9544 5.03474 4.86242 5.03556 4.76626C5.03638 4.6701 5.0001 4.57746 4.93452 4.5083L3.96 3.51554V1.83368C3.96 1.73642 3.92207 1.64314 3.85456 1.57436C3.78705 1.50559 3.69548 1.46695 3.6 1.46695Z" fill="#005CE6" />
                    </svg>
                    <span>{formatTime(participant.poolsCompletedQuestionTrackerTime)}</span>
                  </div>
                  <div className={styles.stat}>
                    <svg className={styles.icon} width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z" fill="red" />
                    </svg>
                    <span>{participant.poolsCompletedQuestionTrackerSize} / {participant.challengeQuestionCount}</span>
                  </div>
                  <div className={styles.statFlex}>
                    <div className={styles.stat}>
                      <svg className={styles.icon} fill="none" height="86" viewBox="0 0 86 98" width="86" xmlns="http://www.w3.org/2000/svg"> <circle cx="43" cy="51" fill="#155B16" r="43" /> <circle cx="43" cy="51" fill="#249E27" r="40" /> <path d="M59.6494 46.5244V46.9512C59.6195 48.209 59.4847 49.5117 59.2451 50.8594C59.0205 52.207 58.6986 53.5547 58.2793 54.9023C57.86 56.25 57.3584 57.5827 56.7744 58.9004C56.1904 60.2181 55.5316 61.4759 54.7979 62.6738C54.0791 63.8867 53.3005 65.0173 52.4619 66.0654C51.6234 67.1286 50.7399 68.0645 49.8115 68.873L46.4648 66.9414C46.9889 66.0579 47.4606 65.0921 47.8799 64.0439C48.3141 63.0107 48.7035 61.9251 49.0479 60.7871C49.3923 59.6491 49.6842 58.4811 49.9238 57.2832C50.1784 56.0853 50.388 54.8949 50.5527 53.7119C50.7174 52.529 50.8372 51.3685 50.9121 50.2305C51.002 49.0775 51.0469 47.9844 51.0469 46.9512C51.0469 46.1426 51.0394 45.2292 51.0244 44.2109C51.0244 43.1777 50.9645 42.1296 50.8447 41.0664C50.7399 40.0033 50.5602 38.9701 50.3057 37.9668C50.0511 36.9486 49.6693 36.0426 49.1602 35.249C48.666 34.4554 48.0221 33.819 47.2285 33.3398C46.4499 32.8607 45.4766 32.6211 44.3086 32.6211C43.2754 32.6211 42.3844 32.8008 41.6357 33.1602C40.902 33.5046 40.2731 33.9762 39.749 34.5752C39.2399 35.1592 38.8281 35.8405 38.5137 36.6191C38.2142 37.3978 37.9746 38.2214 37.7949 39.0898C37.6302 39.9434 37.5179 40.8118 37.458 41.6953C37.4131 42.5638 37.3906 43.3874 37.3906 44.166V50.4326H47.0713V54.1387H37.3906V62H28.4736V45.5586C28.4736 43.2077 28.848 41.0215 29.5967 39C30.3454 36.9785 31.401 35.2266 32.7637 33.7441C34.1413 32.2467 35.7884 31.0788 37.7051 30.2402C39.6367 29.3867 41.7855 28.96 44.1514 28.96C45.7536 28.96 47.251 29.1921 48.6436 29.6562C50.0511 30.1055 51.3314 30.7344 52.4844 31.543C53.6374 32.3366 54.6631 33.2874 55.5615 34.3955C56.4749 35.4886 57.2311 36.6865 57.8301 37.9893C58.444 39.292 58.9082 40.6696 59.2227 42.1221C59.5371 43.5745 59.6794 45.042 59.6494 46.5244Z" fill="white" /> <rect fill="white" height="55" width="4" x="40" y="23.6075" /> </svg>
                      <span className={participant.poolsMembersPaidAmount < 0 ? `${styles.crossStat} ${styles[`crossStat_${theme}`]}` : ''}>{formatAmount(participant.poolsMembersPaidAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Tab Switcher Component
const TabSwitcher = ({ viewType, setViewType, maxWidth }: TabSwitcherProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
          <div className={styles.tabSwitcherContainer}>

    <div
      className={`${styles.tabSwitcher} ${styles[`tabSwitcher_${theme}`]}`}
      style={maxWidth ? { maxWidth: `${maxWidth}px`, margin: '16px auto' } : { margin: '16px' }}
    >
      <button
        className={`${styles.tab} ${viewType === 'rank' ? styles.tabActive : ''} ${styles[`tab_${theme}`]}`}
        onClick={() => setViewType('rank')}
      >
        {t('rank_text')}
      </button>
      <button
        className={`${styles.tab} ${viewType === 'reward' ? styles.tabActive : ''} ${styles[`tab_${theme}`]}`}
        onClick={() => setViewType('reward')}
      >
        {t('reward_text')}
      </button>
    </div>
    </div>
  );
}

// Web View
const WebView = ({
  resultViewType,
  setResultViewType,
  resultsLoading,
  membersLoading,
  quizResult,
  poolMembers,
  loaderRef,
  callPaginate
}: ResultViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const topThree = poolMembers.filter(member => member.poolsMembersRank <= 3);
  const otherParticipants = poolMembers.filter(member => member.poolsMembersRank > 3 && !member.poolsMembersIsUser);
  const currentUser = quizResult;

  return (
    <div className={styles.innerBody}>

        <TabSwitcher
          viewType={resultViewType}
          setViewType={setResultViewType}
          maxWidth={400}
        />

      {resultsLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
        </div>
      ) : (
        <>
          <div className={styles.podiumSection}>
            <Podium
              members={poolMembers}
              viewType={resultViewType}
              currentUser={currentUser}
            />
          </div>

          {otherParticipants.length > 0 && (
            <div className={styles.participantsSection}>
              <ParticipantsList
                participants={otherParticipants}
                viewType={resultViewType}
                layout="web"
              />
              {membersLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
              <div ref={loaderRef} className={styles.loader}></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Tablet View
const TabletView = ({
  resultViewType,
  setResultViewType,
  resultsLoading,
  membersLoading,
  quizResult,
  poolMembers,
  loaderRef,
  callPaginate
}: ResultViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const topThree = poolMembers.filter(member => member.poolsMembersRank <= 3);
  const otherParticipants = poolMembers.filter(member => member.poolsMembersRank > 3 && !member.poolsMembersIsUser);
  const currentUser = quizResult;

  return (
    <div className={styles.innerBody}>
      <TabSwitcher
        viewType={resultViewType}
        setViewType={setResultViewType}
        maxWidth={350}
      />

      {resultsLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
        </div>
      ) : (
        <>
          <div className={styles.podiumSection}>
            <Podium
              members={poolMembers}
              viewType={resultViewType}
              currentUser={currentUser}
            />
          </div>

          {otherParticipants.length > 0 && (
            <div className={styles.participantsSection}>
              <ParticipantsList
                participants={otherParticipants}
                viewType={resultViewType}
                layout="tablet"
              />
              {membersLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
              <div ref={loaderRef} className={styles.loader}></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Mobile View
const MobileView = ({
  resultViewType,
  setResultViewType,
  resultsLoading,
  membersLoading,
  quizResult,
  poolMembers,
  loaderRef,
  callPaginate
}: ResultViewProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const topThree = poolMembers.filter(member => member.poolsMembersRank <= 3);
  const otherParticipants = poolMembers.filter(member => member.poolsMembersRank > 3 && !member.poolsMembersIsUser);
  const currentUser = quizResult;

  return (
    <div className={styles.innerBody}>
      <TabSwitcher
        viewType={resultViewType}
        setViewType={setResultViewType}
      />

      {resultsLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
        </div>
      ) : (
        <>
          <div className={styles.podiumSection}>
            <Podium
              members={poolMembers}
              viewType={resultViewType}
              currentUser={currentUser}
            />
          </div>

          {otherParticipants.length > 0 && (
            <div className={styles.participantsSection}>
              <ParticipantsList
                participants={otherParticipants}
                viewType={resultViewType}
                layout="mobile"
              />
              {membersLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
              <div ref={loaderRef} className={styles.loader}></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};


export default function QuizResultPage(props: QuizResultProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { poolsId } = props;
  const { userData } = useUserData();
  const mobileLoaderRef = useRef<HTMLDivElement>(null);
  const tabLoaderRef = useRef<HTMLDivElement>(null);
  const webLoaderRef = useRef<HTMLDivElement>(null);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [quizResult, setQuizResult] = useState<PoolMemberModel | null>(null);
  const [poolMembers, setPoolMembers] = useState<PoolMemberModel[]>([]);
  const [resultViewType, setResultViewType] = useState<'reward' | 'rank'>('rank');

  const goBack = async () => {
    await nav.pop();
  };

  // Fetch quiz results
  const fetchQuizResults = useCallback(async () => {
    if (!userData || !poolsId) return;

    try {
      setResultsLoading(true);
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        console.error('Error fetching quiz results');
        setResultsLoading(false);
        return;
      }

      const { data, error } = await supabaseBrowser.rpc("get_quiz_result", {
        p_user_id: userData.usersId,
        p_pool_id: poolsId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age
      });

      if (error) {
        console.error("[TransactionModel] error:", error);
        setResultsLoading(false);
        return;
      }

      if (data.status === 'Pool.success' && data.quiz) {
        setQuizResult(new PoolMemberModel(data.quiz));

        if (data.members) {
          const members = (data.members || []).map((row: BackendPoolMemberModel) => new PoolMemberModel(row))
          if (members.length > 0) {
            extractLatest(members);
            processPoolMemberModelsPaginate(members);
          }
        }
      }
      setResultsLoading(false);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      setResultsLoading(false);
    }
  }, [userData, poolsId, lang]);

  const extractLatest = (newPoolMembers: PoolMemberModel[]) => {
    if (newPoolMembers.length > 0) {
      const lastItem = newPoolMembers[newPoolMembers.length - 1];
      setPaginateModel(new PaginateModel({ sortId: String(lastItem.poolsMembersRank) }));
    }
  };

  const processPoolMemberModelsPaginate = (newPoolMembers: PoolMemberModel[]) => {
    const oldPoolMemberIds = poolMembers.map((e) => e.userDetails.userId);
    const updatedPoolMembers = [...poolMembers];

    for (const member of newPoolMembers) {
      if (!oldPoolMemberIds.includes(member.userDetails.userId)) {
        updatedPoolMembers.push(member);
      }
    }

    setPoolMembers(updatedPoolMembers.sort((a, b) => a.poolsMembersRank - b.poolsMembersRank));
  };

  // Fetch pool members
  const fetchPoolMembers = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<PoolMemberModel[]> => {
    if (!userData || !poolsId) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_pool_members", {
        p_user_id: userData.usersId,
        p_pool_id: poolsId,
        p_locale: paramatical?.locale,
        p_country: paramatical?.country,
        p_gender: paramatical?.gender,
        p_age: paramatical?.age,
        p_limit_by: limitBy,
        p_for_ranking: true,
        p_after_pool_members: paginateModel.toJson()
      });

      if (error) {
        console.error("[PoolMemberModel] error:", error);
        return [];
      }

      return (data || []).map((row: BackendPoolMemberModel) => new PoolMemberModel(row));
    } catch (error) {
      console.error('Error fetching pool members:', error);
      return [];
    }
  }, [poolsId, lang]);

  useEffect(() => {
    fetchQuizResults();
  }, [fetchQuizResults]);


  useEffect(() => {
    if (!mobileLoaderRef.current || membersLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callPaginate();
        }
      },
      { threshold: 1 }
    );

    observer.observe(mobileLoaderRef.current);

    return () => {
      if (mobileLoaderRef.current) observer.unobserve(mobileLoaderRef.current);
    };
  }, [poolMembers, paginateModel, membersLoading]);

  useEffect(() => {
    if (!tabLoaderRef.current || membersLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callPaginate();
        }
      },
      { threshold: 1 }
    );

    observer.observe(tabLoaderRef.current);

    return () => {
      if (tabLoaderRef.current) observer.unobserve(tabLoaderRef.current);
    };
  }, [poolMembers, paginateModel, membersLoading]);

  useEffect(() => {
    if (!webLoaderRef.current || membersLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callPaginate();
        }
      },
      { threshold: 1 }
    );

    observer.observe(webLoaderRef.current);

    return () => {
      if (webLoaderRef.current) observer.unobserve(webLoaderRef.current);
    };
  }, [poolMembers, paginateModel, membersLoading]);


  const callPaginate = async () => {
    if (!userData || poolMembers.length <= 0) return;
    setMembersLoading(true);
    const models = await fetchPoolMembers(userData, 20, paginateModel);
    setMembersLoading(false);
    if (models.length > 0) {
      extractLatest(models);
      processPoolMemberModelsPaginate(models);
    }
  };


  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('quiz_results')}</h1>
        </div>
      </header>

      {/* Web View */}
      <div className={styles.webOnly}>
        <WebView
          resultViewType={resultViewType}
          setResultViewType={setResultViewType}
          resultsLoading={resultsLoading}
          membersLoading={membersLoading}
          quizResult={quizResult}
          poolMembers={poolMembers}
          loaderRef={webLoaderRef}
          callPaginate={callPaginate}
        />
      </div>

      {/* Tablet View */}
      <div className={styles.tabletOnly}>
        <TabletView
          resultViewType={resultViewType}
          setResultViewType={setResultViewType}
          resultsLoading={resultsLoading}
          membersLoading={membersLoading}
          quizResult={quizResult}
          poolMembers={poolMembers}
          loaderRef={tabLoaderRef}
          callPaginate={callPaginate}
        />
      </div>

      {/* Mobile View */}
      <div className={styles.mobileOnly}>
        <MobileView
          resultViewType={resultViewType}
          setResultViewType={setResultViewType}
          resultsLoading={resultsLoading}
          membersLoading={membersLoading}
          quizResult={quizResult}
          poolMembers={poolMembers}
          loaderRef={mobileLoaderRef}
          callPaginate={callPaginate}
        />
      </div>
    </main>
  );
}