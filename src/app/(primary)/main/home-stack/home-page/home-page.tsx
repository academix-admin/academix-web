'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './home-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";

// Define TypeScript interfaces for our data models
interface HomeEngagementProgress {
  currentPoints: number;
  engagementLevelsId: number;
  pointsToNextLevel: number;
  currentProgressPercent: number;
  nextEngagementLevelsId: number;
  engagementLevelsIdentity: string;
  nextEngagementLevelsIdentity: string;
}

interface UserEngagementModel {
  userEngagementProgressTime: number;
  userEngagementProgressQuestions: number;
  userEngagementProgressQuizCount: number;
  userEngagementProgressPointsDetails: HomeEngagementProgress;
}

interface DailyPerformance {
  dailyPerformanceEarnings: number;
  dailyPerformanceQuiz: number;
}

interface QuizHistory {
  poolsId: string;
  poolsDuration: number;
  sortCreatedId: string;
  topicsIdentity: string;
  topicsImage?: string;
  poolsMembersRank: number;
  poolsMembersPoints: number;
  challengeQuestionCount: number;
  poolsMembersCreatedAt: string;
  poolsMembersPaidAmount: number;
  poolsCompletedQuestionTrackerTime: number;
}

export default function HomePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // State for data with dummy data
  const [userEngagement, setUserEngagement] = useState<UserEngagementModel | null>({
    userEngagementProgressTime: 92, // 1m32s in seconds
    userEngagementProgressQuestions: 28,
    userEngagementProgressQuizCount: 38,
    userEngagementProgressPointsDetails: {
      currentPoints: 0, // Not shown in UI
      engagementLevelsId: 4,
      pointsToNextLevel: 23983,
      currentProgressPercent: 45, // Approximate based on level progress
      nextEngagementLevelsId: 5,
      engagementLevelsIdentity: "Level 4",
      nextEngagementLevelsIdentity: "Level 5"
    }
  });

  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance | null>({
    dailyPerformanceEarnings: 0, // Not sure from UI
    dailyPerformanceQuiz: 0 // Not sure from UI
  });

  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([
    {
      poolsId: "1",
      poolsDuration: 92, // 1m32s in seconds
      sortCreatedId: "1",
      topicsIdentity: "University Life",
      poolsMembersRank: 2,
      poolsMembersPoints: 3500,
      challengeQuestionCount: 10,
      poolsMembersCreatedAt: "2023-06-11T10:52:00",
      poolsMembersPaidAmount: 1200,
      poolsCompletedQuestionTrackerTime: 0
    },
    {
      poolsId: "2",
      poolsDuration: 325, // 5m25s in seconds
      sortCreatedId: "2",
      topicsIdentity: "Champions League",
      poolsMembersRank: 2,
      poolsMembersPoints: 3500,
      challengeQuestionCount: 10,
      poolsMembersCreatedAt: "2023-06-08T16:19:00",
      poolsMembersPaidAmount: 1200,
      poolsCompletedQuestionTrackerTime: 154.796 // 2m34s 796ms in seconds
    },
    {
      poolsId: "3",
      poolsDuration: 270, // 4m30s in seconds
      sortCreatedId: "3",
      topicsIdentity: "Ekiti State",
      poolsMembersRank: 2,
      poolsMembersPoints: 3500,
      challengeQuestionCount: 10,
      poolsMembersCreatedAt: "2023-06-03T14:17:00",
      poolsMembersPaidAmount: 1200,
      poolsCompletedQuestionTrackerTime: 27.829 // 27s 829ms in seconds
    }
  ]);

  const [userName, setUserName] = useState('Irekamni');

  // Format time from seconds to minutes and seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m${secs}s`;
  };

  // Format response time (could be in seconds with ms)
  const formatResponseTime = (time: number): string => {
    if (time < 60) {
      return `${Math.floor(time)}s ${Math.floor((time % 1) * 1000)}ms`;
    } else {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      const ms = Math.floor(((time % 60) - secs) * 1000);
      return `${mins}m ${secs}s ${ms}ms`;
    }
  };

  // Format date to match the screenshot (e.g., "Jun 11 at 10:52AM")
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

  // Format large numbers with K suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className={styles.mainContainer}>
      {/* Title Section */}
      <div className={styles.titleSection}>
        <h1>{userName}</h1>
        <p>Welcome back</p>
      </div>

      {/* Experience Points Section */}
      <div className={styles.experienceSection}>
        <h2>Experience points</h2>
        {userEngagement && (
          <>
            <div className={styles.levelInfo}>
              <span className={styles.levelLabel}>Level {userEngagement.userEngagementProgressPointsDetails.engagementLevelsId}</span>
              <span className={styles.pointsToNext}>
                {Math.floor(userEngagement.userEngagementProgressPointsDetails.pointsToNextLevel)} points to next level
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${userEngagement.userEngagementProgressPointsDetails.currentProgressPercent}%` }}
              ></div>
            </div>
          </>
        )}
      </div>

      {/* Performance Section */}
      <div className={styles.performanceSection}>
        <h2>Performance</h2>
        <div className={styles.performanceGrid}>
          <div className={styles.performanceItem}>
            <span className={styles.performanceValue}>0</span>
            <span className={styles.performanceLabel}>Quiz</span>
          </div>
          <div className={styles.performanceItem}>
            <span className={styles.performanceValue}>OK</span>
            <span className={styles.performanceLabel}>Earning</span>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className={styles.statisticsSection}>
        <h2>Statistics</h2>
        {userEngagement && (
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{userEngagement.userEngagementProgressQuestions}</span>
              <span className={styles.statLabel}>QUESTIONS</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{userEngagement.userEngagementProgressQuizCount}</span>
              <span className={styles.statLabel}>QUIZZES</span>
            </div>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className={styles.historySection}>
        <h2>History</h2>
        <div className={styles.historyList}>
          {quizHistory.map((quiz, index) => (
            <div key={index} className={styles.historyItem}>
              <div className={styles.historyMain}>
                <div className={styles.historyTopic}>
                  <span className={styles.topicName}>{quiz.topicsIdentity}</span>
                </div>
                <div className={styles.historyTime}>{formatDate(quiz.poolsMembersCreatedAt)}</div>
              </div>
              <div className={styles.historyDetails}>
                <span className={styles.duration}>{formatTime(quiz.poolsDuration)}</span>
                <span className={styles.questions}>● {quiz.challengeQuestionCount} Questions</span>
                <span className={styles.rank}>
                  {quiz.poolsMembersRank}
                  {quiz.poolsMembersRank === 1 ? 'st' : quiz.poolsMembersRank === 2 ? 'nd' : quiz.poolsMembersRank === 3 ? 'rd' : 'th'}
                </span>
                <span className={styles.participants}>● {formatNumber(quiz.poolsMembersPoints)}</span>
                {quiz.poolsCompletedQuestionTrackerTime > 0 ? (
                  <span className={styles.responseTime}>● {formatResponseTime(quiz.poolsCompletedQuestionTrackerTime)}</span>
                ) : (
                  <span className={styles.responseTime}>● 0ms</span>
                )}
                <span className={styles.earnings}>{quiz.poolsMembersPaidAmount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}