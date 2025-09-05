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
import HomeTitle from "./home-title/home-title";
import HomeExperience from "./home-experience/home-experience";
import HomePerformance from "./home-performance/home-performance";
import HomeStatistics from "./home-statistics/home-statistics";


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

      <HomeTitle />
      <HomeExperience />
      <HomePerformance />
      <HomeStatistics />

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