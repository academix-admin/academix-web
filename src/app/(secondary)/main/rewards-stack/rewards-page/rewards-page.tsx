'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './rewards-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";

// Define TypeScript interfaces for our data models
interface RewardRedeemCodeModel {
  id?: string;
  value?: string;
  expires?: string;
}

interface DailyStreaksModel {
  dailyStreaksDate: string;
  dailyStreaksStatus: string;
  dailyStreaksCreatedAt?: string;
  dailyStreaksDateNumber: number;
  dailyStreaksCount: number;
  dailyStreaksMax: number;
  dailyStreaksAwarded: number;
  dailyStreaksReached: boolean;
  rewardRedeemCodeModel?: RewardRedeemCodeModel;
}

interface MissionData {
  missionCount: number;
  missionFinished: number;
  missionCompleted: number;
  missionNotRewarded: number;
}

interface AchievementsData {
  achievementsCount: number;
  achievementsFinished: number;
  achievementsCompleted: number;
  achievementsNotRewarded: number;
}

interface FriendsModel {
  usersId: string;
  usersNames: string;
  usersUsername: string;
  usersImage?: string;
  sortCreatedId: string;
  usersCreatedAt: string;
  usersReferredStatus: string;
}

export default function RewardsPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // State for data with dummy data
  const [academicRatio, setAcademicRatio] = useState<number>(0.21);
  const [dailyStreaks, setDailyStreaks] = useState<DailyStreaksModel[]>([]);
  const [missions, setMissions] = useState<MissionData>({
    missionCount: 1,
    missionFinished: 1,
    missionCompleted: 1,
    missionNotRewarded: 0
  });
  const [achievements, setAchievements] = useState<AchievementsData>({
    achievementsCount: 1,
    achievementsFinished: 1,
    achievementsCompleted: 1,
    achievementsNotRewarded: 0
  });
  const [friends, setFriends] = useState<FriendsModel[]>([
    {
      usersId: "1",
      usersNames: "Casperthefather",
      usersUsername: "fathercasper",
      sortCreatedId: "1",
      usersCreatedAt: "2023-04-27T03:00:00",
      usersReferredStatus: "referred"
    },
    {
      usersId: "2",
      usersNames: "Creator",
      usersUsername: "creator1",
      sortCreatedId: "2",
      usersCreatedAt: "2023-02-01T11:31:00",
      usersReferredStatus: "referred"
    },
    {
      usersId: "3",
      usersNames: "Completed",
      usersUsername: "completed",
      sortCreatedId: "3",
      usersCreatedAt: "2023-01-15T08:45:00",
      usersReferredStatus: "referred"
    },
    {
      usersId: "4",
      usersNames: "Ajibewa lyiola",
      usersUsername: "ajibewa",
      sortCreatedId: "4",
      usersCreatedAt: "2023-03-10T14:20:00",
      usersReferredStatus: "referred"
    }
  ]);

  // Initialize daily streaks data
  useEffect(() => {
    const streaksData: DailyStreaksModel[] = [
      {
        dailyStreaksDate: "Sun",
        dailyStreaksStatus: "missed",
        dailyStreaksDateNumber: 0,
        dailyStreaksCount: 0,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 0,
        dailyStreaksReached: false
      },
      {
        dailyStreaksDate: "Mon",
        dailyStreaksStatus: "missed",
        dailyStreaksDateNumber: 1,
        dailyStreaksCount: 0,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 0,
        dailyStreaksReached: false
      },
      {
        dailyStreaksDate: "Tue",
        dailyStreaksStatus: "missed",
        dailyStreaksDateNumber: 2,
        dailyStreaksCount: 0,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 0,
        dailyStreaksReached: false
      },
      {
        dailyStreaksDate: "Wed",
        dailyStreaksStatus: "missed",
        dailyStreaksDateNumber: 3,
        dailyStreaksCount: 0,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 0,
        dailyStreaksReached: false
      },
      {
        dailyStreaksDate: "Thu",
        dailyStreaksStatus: "completed",
        dailyStreaksDateNumber: 4,
        dailyStreaksCount: 1,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 100,
        dailyStreaksReached: true
      },
      {
        dailyStreaksDate: "Fri",
        dailyStreaksStatus: "pending",
        dailyStreaksDateNumber: 5,
        dailyStreaksCount: 0,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 0,
        dailyStreaksReached: false
      },
      {
        dailyStreaksDate: "Sat",
        dailyStreaksStatus: "pending",
        dailyStreaksDateNumber: 6,
        dailyStreaksCount: 0,
        dailyStreaksMax: 7,
        dailyStreaksAwarded: 0,
        dailyStreaksReached: false
      }
    ];

    setDailyStreaks(streaksData);
  }, []);

  // Format date to match the screenshot (e.g., "Apr 27 at 3:00AM")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Get status icon based on streak status
  const getStatusIcon = (status: string): string => {
    switch(status) {
      case "completed": return "✓";
      case "missed": return "X";
      case "pending": return "💬";
      default: return "";
    }
  };

  return (
    <div className={styles.mainContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <h1>Reward</h1>
        <p>Surprises await!</p>
      </div>

      {/* Academic Ratio Section */}
      <div className={styles.academicRatioSection}>
        <h2>Academic Ratio</h2>
        <div className={styles.ratioValue}>{academicRatio}</div>
        <div className={styles.divider}></div>
      </div>

      {/* Streaks Section */}
      <div className={styles.streaksSection}>
        <h2>Streaks</h2>
        <div className={styles.streaksCalendar}>
          <div className={styles.weekDays}>
            {dailyStreaks.map((day, index) => (
              <div key={index} className={styles.day}>
                {day.dailyStreaksDate}
              </div>
            ))}
          </div>
          <div className={styles.weekStatus}>
            {dailyStreaks.map((day, index) => (
              <div key={index} className={styles.status}>
                {getStatusIcon(day.dailyStreaksStatus)}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.divider}></div>
      </div>

      {/* Milestones Section */}
      <div className={styles.milestonesSection}>
        <h2>Milestones</h2>
        <div className={styles.milestonesGrid}>
          <div className={styles.milestoneItem}>
            <div className={styles.milestoneValue}>{missions.missionCompleted}/{missions.missionCount}</div>
            <div className={styles.milestoneLabel}>MISSIONS</div>
          </div>
          <div className={styles.milestoneItem}>
            <div className={styles.milestoneValue}>{achievements.achievementsCompleted}/{achievements.achievementsCount}</div>
            <div className={styles.milestoneLabel}>ACHIEVEMENTS</div>
          </div>
        </div>
        <div className={styles.divider}></div>
      </div>

      {/* Friends Section */}
      <div className={styles.friendsSection}>
        <h2>Friends</h2>
        <div className={styles.friendsList}>
          {friends.map((friend, index) => (
            <div key={index} className={styles.friendItem}>
              <div className={styles.friendAvatar}>C</div>
              <div className={styles.friendInfo}>
                <div className={styles.friendName}>{friend.usersNames}</div>
                <div className={styles.friendDetails}>
                  {formatDate(friend.usersCreatedAt)} • @{friend.usersUsername}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}