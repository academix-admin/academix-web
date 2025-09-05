'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";


// Define TypeScript interfaces for our data models
enum TopicsSponsorship {
  paidPromotion = "paidPromotion",
  none = "none",
  advertised = "advertised",
  sponsored = "sponsored"
}

class ChallengeModel {
  challengeId: string;
  challengeDevelopmentCharge: number;
  challengePrice: number;
  challengeTopShare: number;
  challengeMidShare: number;
  challengeBotShare: number;
  challengeWaitingTime?: number;
  challengeMinParticipant: number;
  challengeMaxParticipant: number;
  challengeIdentity: string;
  challengeQuestionCount: number;

  constructor(data: Partial<ChallengeModel> = {}) {
    this.challengeId = data.challengeId || '';
    this.challengeDevelopmentCharge = data.challengeDevelopmentCharge || 0;
    this.challengePrice = data.challengePrice || 0;
    this.challengeTopShare = data.challengeTopShare || 0;
    this.challengeMidShare = data.challengeMidShare || 0;
    this.challengeBotShare = data.challengeBotShare || 0;
    this.challengeWaitingTime = data.challengeWaitingTime;
    this.challengeMinParticipant = data.challengeMinParticipant || 0;
    this.challengeMaxParticipant = data.challengeMaxParticipant || 0;
    this.challengeIdentity = data.challengeIdentity || '';
    this.challengeQuestionCount = data.challengeQuestionCount || 0;
  }
}

class QuizPool {
  sortCreatedId: string;
  sortUpdatedId: string;
  poolsId: string;
  poolsVisible: boolean;
  poolsAllowSubmission: boolean;
  poolsStatus: string;
  poolsAuth: string;
  poolsCode?: string;
  poolsJob?: string;
  poolsDuration?: number;
  challengeModel?: ChallengeModel;
  poolsStartingAt?: string;
  poolsJobEndAt?: string;
  poolsGradedAt?: string;
  poolsRankedAt?: string;
  poolsRewardedAt?: string;
  poolsCompletedAt?: string;
  poolsMembersCount: number;
  questionTrackerCount: number;

  constructor(data: Partial<QuizPool> = {}) {
    this.sortCreatedId = data.sortCreatedId || '';
    this.sortUpdatedId = data.sortUpdatedId || '';
    this.poolsId = data.poolsId || '';
    this.poolsVisible = data.poolsVisible || false;
    this.poolsAllowSubmission = data.poolsAllowSubmission || false;
    this.poolsStatus = data.poolsStatus || '';
    this.poolsAuth = data.poolsAuth || '';
    this.poolsCode = data.poolsCode;
    this.poolsJob = data.poolsJob;
    this.poolsDuration = data.poolsDuration;
    this.challengeModel = data.challengeModel;
    this.poolsStartingAt = data.poolsStartingAt;
    this.poolsJobEndAt = data.poolsJobEndAt;
    this.poolsGradedAt = data.poolsGradedAt;
    this.poolsRankedAt = data.poolsRankedAt;
    this.poolsRewardedAt = data.poolsRewardedAt;
    this.poolsCompletedAt = data.poolsCompletedAt;
    this.poolsMembersCount = data.poolsMembersCount || 0;
    this.questionTrackerCount = data.questionTrackerCount || 0;
  }
}

class UserDisplayQuizTopicModel {
  sortCreatedId: string;
  sortUpdatedId: string;
  topicsId: string;
  topicsIdentity: string;
  topicsCreatedAt: string;
  topicsUpdatedAt: string;
  topicsImageUrl?: string;
  topicsDescription: string;
  userImageUrl?: string;
  usernameText: string;
  creatorId: string;
  fullNameText: string;
  quizPool?: QuizPool;
  topicsSponsorship: TopicsSponsorship;

  constructor(data: Partial<UserDisplayQuizTopicModel> = {}) {
    this.sortCreatedId = data.sortCreatedId || '';
    this.sortUpdatedId = data.sortUpdatedId || '';
    this.topicsId = data.topicsId || '';
    this.topicsIdentity = data.topicsIdentity || '';
    this.topicsCreatedAt = data.topicsCreatedAt || '';
    this.topicsUpdatedAt = data.topicsUpdatedAt || '';
    this.topicsImageUrl = data.topicsImageUrl;
    this.topicsDescription = data.topicsDescription || '';
    this.userImageUrl = data.userImageUrl;
    this.usernameText = data.usernameText || '';
    this.creatorId = data.creatorId || '';
    this.fullNameText = data.fullNameText || '';
    this.quizPool = data.quizPool;
    this.topicsSponsorship = data.topicsSponsorship || TopicsSponsorship.none;
  }
}

export default function QuizPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // State for data with dummy data
  const [waitingTime, setWaitingTime] = useState<number>(47);
  const [pendingQuiz, setPendingQuiz] = useState<UserDisplayQuizTopicModel | null>(null);
  const [followedCreators, setFollowedCreators] = useState<UserDisplayQuizTopicModel[]>([]);
  const [favoriteContributors, setFavoriteContributors] = useState<UserDisplayQuizTopicModel[]>([]);
  const [mightInterestYou, setMightInterestYou] = useState<UserDisplayQuizTopicModel[]>([]);

  // Initialize data
  useEffect(() => {
    // Pending quiz data
    const pendingQuizData = new UserDisplayQuizTopicModel({
      topicsIdentity: "University Life",
      quizPool: new QuizPool({
        poolsCode: "L3Q855XLQ",
        challengeModel: new ChallengeModel({
          challengeQuestionCount: 10,
          challengeWaitingTime: 47
        })
      })
    });
    setPendingQuiz(pendingQuizData);

    // Followed creators data
    const followedCreatorsData = [
      new UserDisplayQuizTopicModel({
        topicsIdentity: "Ekiti State",
        quizPool: new QuizPool({
          poolsCode: "IGNIBETRW"
        })
      })
    ];
    setFollowedCreators(followedCreatorsData);

    // Favorite contributors data
    const favoriteContributorsData = [
      new UserDisplayQuizTopicModel({
        topicsIdentity: "Ekiti State",
        topicsCreatedAt: "2023-05-24T11:49:00",
        usernameText: "sacuisine"
      })
    ];
    setFavoriteContributors(favoriteContributorsData);

    // Might interest you data
    const mightInterestYouData = [
      new UserDisplayQuizTopicModel({
        topicsIdentity: "Champions League",
        topicsCreatedAt: "2023-05-21T18:31:00",
        usernameText: "irekanni_"
      })
    ];
    setMightInterestYou(mightInterestYouData);
  }, []);

  // Format date to match the screenshot (e.g., "May 24 at 11:49AM")
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

  return (
    <div className={styles.mainContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <h1>Explore</h1>
        <p>Curated quizzes</p>
      </div>

      {/* Waiting Time Section */}
      <div className={styles.waitingTimeSection}>
        <div className={styles.waitingTimeLabel}>Waiting time</div>
        <div className={styles.waitingTimeValue}>| {waitingTime}s</div>
      </div>

      {/* Pending Quiz Section */}
      {pendingQuiz && (
        <div className={styles.pendingQuizSection}>
          <div className={styles.sectionHeader}>
            <h2>PENDING QUIZ</h2>
          </div>
          <div className={styles.quizCard}>
            <div className={styles.quizTitle}>{pendingQuiz.topicsIdentity}</div>
            <div className={styles.quizDetails}>
              Answered 0 out of {pendingQuiz.quizPool?.challengeModel?.challengeQuestionCount} questions ● MINI
            </div>
            <div className={styles.quizCode}>{pendingQuiz.quizPool?.poolsCode}</div>
            <div className={styles.quizActions}>
              <button className={styles.leaveButton}>Leave</button>
            </div>
          </div>
          <div className={styles.divider}></div>
        </div>
      )}

      {/* Followed Creators Section */}
      <div className={styles.followedCreatorsSection}>
        <div className={styles.sectionHeader}>
          <h2>Followed Creators</h2>
          <span className={styles.seeAll}>{'>'}</span>
        </div>
        {followedCreators.map((creator, index) => (
          <div key={index} className={styles.creatorCard}>
            <div className={styles.creatorHeader}>
              <div className={styles.creatorStatus}>Open Quiz</div>
            </div>
            <div className={styles.creatorContent}>
              <div className={styles.creatorAvatar}>ES</div>
              <div className={styles.creatorInfo}>
                <div className={styles.creatorType}>MINI</div>
                <div className={styles.creatorName}>{creator.topicsIdentity}</div>
              </div>
            </div>
            <div className={styles.creatorCode}>{creator.quizPool?.poolsCode}</div>
          </div>
        ))}
        <div className={styles.divider}></div>
      </div>

      {/* Favorite Contributors Section */}
      <div className={styles.favoriteContributorsSection}>
        <div className={styles.sectionHeader}>
          <h2>Favourite Contributors</h2>
          <span className={styles.seeAll}>{'>'}</span>
        </div>
        {favoriteContributors.map((contributor, index) => (
          <div key={index} className={styles.contributorCard}>
            <div className={styles.contributorAvatar}>ES</div>
            <div className={styles.contributorInfo}>
              <div className={styles.contributorName}>{contributor.topicsIdentity}</div>
              <div className={styles.contributorDetails}>
                {formatDate(contributor.topicsCreatedAt)} • @{contributor.usernameText}
              </div>
            </div>
          </div>
        ))}
        <div className={styles.divider}></div>
      </div>

      {/* Might Interest You Section */}
      <div className={styles.mightInterestYouSection}>
        <div className={styles.sectionHeader}>
          <h2>Might Interest You</h2>
          <span className={styles.seeAll}>{'>'}</span>
        </div>
        {mightInterestYou.map((item, index) => (
          <div key={index} className={styles.interestCard}>
            <div className={styles.interestAvatar}>AI</div>
            <div className={styles.interestInfo}>
              <div className={styles.interestName}>{item.topicsIdentity}</div>
              <div className={styles.interestDetails}>
                {formatDate(item.topicsCreatedAt)} • @{item.usernameText}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}