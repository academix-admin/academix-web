'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './home-quiz-history.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendQuizHistory } from '@/models/quiz-history';
import { QuizHistory } from '@/models/quiz-history';
import { PaginateModel } from '@/models/paginate-model';
import Image from 'next/image';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { usePinnedState } from '@/hooks/pinned-state-hook';


export default function HomeQuizHistory({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();
  const { ref: pinnedRef, stuck } = usePinnedState<HTMLHeadingElement>({ offset: 0 });
  const loaderRef = useRef<HTMLDivElement | null>(null);


  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);


  const [quizHistoryData, demandQuizHistoryData, setQuizHistoryData] = useDemandState<QuizHistory[]>(
    [],
    {
      key: "quizHistoryData",
      persist: true,
      ttl: 3600,
      scope: "secondary_flow",
      deps: [lang],
    }
  );


  useEffect(() => {
    console.log('stuck',stuck);
  }, [stuck]);

  useEffect(() => {
        if (!loaderRef.current) return;

     const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                callPaginate();
            }
        },
        { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [quizHistoryData, paginateModel]);

  const fetchQuizHistory = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<QuizHistory[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_user_quiz_history", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_after_histories: paginateModel.toJson(),
      });

      if (error) {
        console.error("[HomeQuizHistory] error:", error);
        return [];
      }
      return (data || []).map((row: BackendQuizHistory) => new QuizHistory(row));
    } catch (err) {
      console.error("[HomeQuizHistory] error:", err);
      onStateChange?.('error');
      setHistoryLoading(false);
      return [];
    }
  }, [lang]);
  
  const extractLatest = (userQuizHistory: QuizHistory[]) => {
    if (userQuizHistory.length > 0) {
      const lastItem = userQuizHistory[userQuizHistory.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processQuizHistoryPaginate = (userQuizHistory: QuizHistory[]) => {
    const oldQuizHistoryIds = quizHistoryData.map((e) => e.poolsId);
    const newQuizHistory = [...quizHistoryData];

    for (const quiz of userQuizHistory) {
      if (!oldQuizHistoryIds.includes(quiz.poolsId)) {
        newQuizHistory.push(quiz);
      }
    }

    setQuizHistoryData(newQuizHistory);
  };


  useEffect(() => {
    if (!userData || quizHistoryData.length > 0) return;

    demandQuizHistoryData(async ({ get, set }) => {
      const quizHistories = await fetchQuizHistory(userData, 10, paginateModel);
      extractLatest(quizHistories);
      set(quizHistories);
      setFirstLoaded(true);
      onStateChange?.('data');
    });
  }, [demandQuizHistoryData]);


  const callPaginate = async () => {
    if (!userData || quizHistoryData.length <= 0) return;
    setHistoryLoading(true);
    const quizHistories = await fetchQuizHistory(userData, 20, paginateModel);
    setHistoryLoading(false);
    if (quizHistories.length > 0) {
      extractLatest(quizHistories);
      processQuizHistoryPaginate(quizHistories);
    }
  };
  const refreshData = async () => {
    if (!userData || quizHistoryData.length > 0) return;
    setHistoryLoading(true);
    const quizHistories = await fetchQuizHistory(userData, 10, paginateModel);
    setHistoryLoading(false);
    if (quizHistories.length > 0) {
      extractLatest(quizHistories);
      setQuizHistoryData(quizHistories);
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
    return date.toLocaleDateString(lang, options);
  };

  // Format large numbers with K suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const formatAmount = (amount: number): string => {
   return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace('-', '');
  };

  const formatTimeWithTranslation = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m${secs}s`;
  };

  // Format response time with translation support
  const formatResponseTimeWithTranslation = (time: number): string => {
    if (time < 1) {
      const ms = Math.floor(time * 1000);
      return t('time_ms', { time: ms });
    } else if (time < 60) {
      const secs = Math.floor(time);
      const ms = Math.floor((time % 1) * 1000);
      return t('time_s_ms', { seconds: secs, milliseconds: ms });
    } else {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      const ms = Math.floor(((time % 60) - secs) * 1000);
      return t('time_m_s_ms', { minutes: mins, seconds: secs, milliseconds: ms });
    }
  };

  // Format rank with translation support
  const formatRank = (rank: number): string => {
    if (rank === 1) return t('rank_1st', { rank });
    if (rank === 2) return t('rank_2nd', { rank });
    if (rank === 3) return t('rank_3rd', { rank });
    return t('rank_other', { rank });
  };
// ${stuck ? styles.historyTitlePinned : ''}

  if(!firstLoaded && quizHistoryData.length <= 0)return null;
  return (
    <div className={styles.historyContainer}>
      <h2 className={`${stuck ? styles.historyTitlePinned : styles.historyTitleHidden}`}>
         {t('history_text')}
      </h2>
      <h2 ref={pinnedRef} className={`${styles.historyTitle} ${styles[`historyTitle_${theme}`]}`}>
         {t('history_text')}
      </h2>

      <div className={styles.historyList}>
        {quizHistoryData.map((quiz, index) => (
          <div key={index} className={styles.historyItemContainer}>

            {
                quiz.topicsImage ? (
              <Image
                className={styles.logo}
                src={quiz.topicsImage}
                alt="Topic"
                width={40}
                height={40}
              />
            ) :
        (
              <div className={styles.initials}>{getInitials(quiz.topicsIdentity)}</div>
            )}

            <div className={styles.historyItem}>
              <div className={styles.historyMain}>
                <span className={`${styles.topicName} ${styles[`topicName_${theme}`]}`}>{quiz.topicsIdentity}</span>
                <span className={styles.historyTime}>{formatDate(quiz.poolsMembersCreatedAt)}</span>
              </div>

              <div className={`${styles.historyDetails} ${styles[`historyDetails_${theme}`]}`}>
                <span>{formatTimeWithTranslation(quiz.poolsDuration)}</span>
                <span>● {t('duration_text',{value: quiz.challengeQuestionCount})}</span>
              </div>

                <div className={styles.historyDetailsBottom}>

              <div className={`${styles.historyDetails} ${styles[`historyDetails_${theme}`]}`}>
                {/* Rank */}
                <span>
                  <svg className={styles.icon} fill="none" height="8" viewBox="0 0 8 8" width="8" xmlns="http://www.w3.org/2000/svg"> <path d="M0.0640625 0.596875C0.021875 0.534375 0 0.459375 0 0.384375C0 0.171875 0.171875 0 0.384375 0H2.09219C2.26719 0 2.43125 0.0921875 2.52031 0.242188L3.59063 2.025C2.8375 2.12031 2.16406 2.47188 1.6625 2.99219L0.0640625 0.596875ZM7.93437 0.596875L6.3375 2.99219C5.83594 2.47188 5.1625 2.12031 4.40938 2.025L5.47969 0.242188C5.57031 0.0921875 5.73281 0 5.90781 0H7.61562C7.82812 0 8 0.171875 8 0.384375C8 0.459375 7.97812 0.534375 7.93594 0.596875H7.93437ZM1.25 5.25C1.25 4.52065 1.53973 3.82118 2.05546 3.30546C2.57118 2.78973 3.27065 2.5 4 2.5C4.72935 2.5 5.42882 2.78973 5.94454 3.30546C6.46027 3.82118 6.75 4.52065 6.75 5.25C6.75 5.97935 6.46027 6.67882 5.94454 7.19454C5.42882 7.71027 4.72935 8 4 8C3.27065 8 2.57118 7.71027 2.05546 7.19454C1.53973 6.67882 1.25 5.97935 1.25 5.25ZM4.13125 3.76719C4.07812 3.65781 3.92344 3.65781 3.86875 3.76719L3.51875 4.47656C3.49687 4.52031 3.45625 4.55 3.40937 4.55625L2.625 4.67031C2.50469 4.6875 2.45781 4.83437 2.54375 4.92031L3.11094 5.47344C3.14531 5.50781 3.16094 5.55469 3.15313 5.60313L3.01875 6.38281C2.99844 6.50156 3.12344 6.59375 3.23125 6.5375L3.93125 6.16875C3.97344 6.14687 4.025 6.14687 4.06719 6.16875L4.76719 6.5375C4.875 6.59375 5 6.50312 4.97969 6.38281L4.84531 5.60313C4.8375 5.55625 4.85312 5.50781 4.8875 5.47344L5.45469 4.92031C5.54219 4.83594 5.49375 4.68906 5.37344 4.67031L4.59062 4.55625C4.54375 4.55 4.50156 4.51875 4.48125 4.47656L4.13125 3.76719Z" fill="#8500C4" /> </svg>
                  {formatRank(quiz.poolsMembersRank)}
                </span>

                {/* Points */}
                <span>
                  <svg className={styles.icon} fill="#FFFFFF" height="31" viewBox="0 0 31 31" width="31" xmlns="http://www.w3.org/2000/svg"> <path d="M31 15.5C31 19.6109 29.367 23.5533 26.4602 26.4602C23.5533 29.367 19.6109 31 15.5 31C11.3891 31 7.44666 29.367 4.53985 26.4602C1.63303 23.5533 0 19.6109 0 15.5C0 11.3891 1.63303 7.44666 4.53985 4.53985C7.44666 1.63303 11.3891 0 15.5 0C19.6109 0 23.5533 1.63303 26.4602 4.53985C29.367 7.44666 31 11.3891 31 15.5ZM10.6562 7.75387V23.25H13.1421V17.7552H16.3738C19.4389 17.7552 21.3125 15.655 21.3125 12.7604C21.3125 9.889 19.4622 7.75387 16.3951 7.75387H10.6562ZM16.0231 15.6434C17.7533 15.6434 18.7724 14.5874 18.7724 12.7604C18.7724 10.9333 17.7533 9.889 16.0212 9.889H13.1324V15.6434H16.0231Z" fill="#FE9C36" /> </svg>
                  {formatNumber(quiz.poolsMembersPoints)}
                </span>

                {/* Time */}
                <span>
                  <svg className={styles.icon} fill="none" height="8" viewBox="0 0 8 8" width="8" xmlns="http://www.w3.org/2000/svg"> <path d="M3.6 0C5.58828 0 7.2 1.64188 7.2 3.66737C7.2 5.69286 5.58828 7.33474 3.6 7.33474C1.61172 7.33474 0 5.69286 0 3.66737C0 1.64188 1.61172 0 3.6 0ZM3.6 1.46695C3.50452 1.46695 3.41295 1.50559 3.34544 1.57436C3.27793 1.64314 3.24 1.73642 3.24 1.83368V3.66737C3.24002 3.76463 3.27796 3.85789 3.34548 3.92665L4.42548 5.02686C4.49338 5.09367 4.58431 5.13063 4.6787 5.1298C4.77309 5.12896 4.86339 5.09039 4.93013 5.0224C4.99688 4.9544 5.03474 4.86242 5.03556 4.76626C5.03638 4.6701 5.0001 4.57746 4.93452 4.5083L3.96 3.51554V1.83368C3.96 1.73642 3.92207 1.64314 3.85456 1.57436C3.78705 1.50559 3.69548 1.46695 3.6 1.46695Z" fill="#005CE6" /> </svg>
                  {quiz.poolsCompletedQuestionTrackerTime > 0
                    ? formatResponseTimeWithTranslation(quiz.poolsCompletedQuestionTrackerTime)
                    : '0ms'}
                </span>
                </div>
                {/* Amount */}
                <span className={ quiz.poolsMembersPaidAmount < 0 ?  `${styles.crossText} ${styles[`crossText_${theme}`]}` : `${styles.earnings} ${styles[`earnings_${theme}`]}`}>
                    <svg className={styles.iconLarge} fill="none" height="98" viewBox="0 0 86 98" width="86" xmlns="http://www.w3.org/2000/svg"> <circle cx="43" cy="51" fill="#155B16" r="43" /> <circle cx="43" cy="51" fill="#249E27" r="40" /> <path d="M59.6494 46.5244V46.9512C59.6195 48.209 59.4847 49.5117 59.2451 50.8594C59.0205 52.207 58.6986 53.5547 58.2793 54.9023C57.86 56.25 57.3584 57.5827 56.7744 58.9004C56.1904 60.2181 55.5316 61.4759 54.7979 62.6738C54.0791 63.8867 53.3005 65.0173 52.4619 66.0654C51.6234 67.1286 50.7399 68.0645 49.8115 68.873L46.4648 66.9414C46.9889 66.0579 47.4606 65.0921 47.8799 64.0439C48.3141 63.0107 48.7035 61.9251 49.0479 60.7871C49.3923 59.6491 49.6842 58.4811 49.9238 57.2832C50.1784 56.0853 50.388 54.8949 50.5527 53.7119C50.7174 52.529 50.8372 51.3685 50.9121 50.2305C51.002 49.0775 51.0469 47.9844 51.0469 46.9512C51.0469 46.1426 51.0394 45.2292 51.0244 44.2109C51.0244 43.1777 50.9645 42.1296 50.8447 41.0664C50.7399 40.0033 50.5602 38.9701 50.3057 37.9668C50.0511 36.9486 49.6693 36.0426 49.1602 35.249C48.666 34.4554 48.0221 33.819 47.2285 33.3398C46.4499 32.8607 45.4766 32.6211 44.3086 32.6211C43.2754 32.6211 42.3844 32.8008 41.6357 33.1602C40.902 33.5046 40.2731 33.9762 39.749 34.5752C39.2399 35.1592 38.8281 35.8405 38.5137 36.6191C38.2142 37.3978 37.9746 38.2214 37.7949 39.0898C37.6302 39.9434 37.5179 40.8118 37.458 41.6953C37.4131 42.5638 37.3906 43.3874 37.3906 44.166V50.4326H47.0713V54.1387H37.3906V62H28.4736V45.5586C28.4736 43.2077 28.848 41.0215 29.5967 39C30.3454 36.9785 31.401 35.2266 32.7637 33.7441C34.1413 32.2467 35.7884 31.0788 37.7051 30.2402C39.6367 29.3867 41.7855 28.96 44.1514 28.96C45.7536 28.96 47.251 29.1921 48.6436 29.6562C50.0511 30.1055 51.3314 30.7344 52.4844 31.543C53.6374 32.3366 54.6631 33.2874 55.5615 34.3955C56.4749 35.4886 57.2311 36.6865 57.8301 37.9893C58.444 39.292 58.9082 40.6696 59.2227 42.1221C59.5371 43.5745 59.6794 45.042 59.6494 46.5244Z" fill="white" /> <rect fill="white" height="55" width="4" x="40" y="23.6075" /> </svg>
                        {formatAmount(quiz.poolsMembersPaidAmount)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      { historyLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
      { !historyLoading && quizHistoryData.length === 0 && <span className={`${styles.refreshContainer} ${styles[`refreshContainer_${theme}`]}`}>{t('history_empty')} <span role="button" onClick={refreshData} className={`${styles.refreshButton} ${styles[`refreshButton_${theme}`]}`}> {t('refresh')} </span></span>}
      { quizHistoryData.length > 0 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}

    </div>
  );
}
