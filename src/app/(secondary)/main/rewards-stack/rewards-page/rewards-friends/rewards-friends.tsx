'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './rewards-friends.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendFriendsModel } from '@/models/friends-model';
import { FriendsModel } from '@/models/friends-model';
import { PaginateModel } from '@/models/paginate-model';
import Image from 'next/image';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { usePinnedState } from '@/hooks/pinned-state-hook';


export default function RewardsFriends({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();
  const loaderRef = useRef<HTMLDivElement | null>(null);


  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);


  const [friendsModel, demandFriendsModel, setFriendsModel] = useDemandState<FriendsModel[]>(
    [],
    {
      key: "friendsModel",
      persist: true,
      ttl: 3600,
      scope: "secondary_flow",
      deps: [lang],
    }
  );


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
    }, [friendsModel, paginateModel]);

  const fetchFriendsModel = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<FriendsModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_friends", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_after_friends: paginateModel.toJson(),
      });

      if (error) {
        console.error("[FriendsModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendFriendsModel) => new FriendsModel(row));
    } catch (err) {
      console.error("[FriendsModel] error:", err);
      onStateChange?.('error');
      setFriendsLoading(false);
      return [];
    }
  }, [lang]);

  const extractLatest = (userFriendsModel: FriendsModel[]) => {
    if (userFriendsModel.length > 0) {
      const lastItem = userFriendsModel[userFriendsModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processFriendsModelPaginate = (userFriendsModel: FriendsModel[]) => {
    const oldFriendsModelIds = friendsModel.map((e) => e.usersId);
    const newFriendsModel = [...friendsModel];

    for (const friend of userFriendsModel) {
      if (!oldFriendsModelIds.includes(friend.usersId)) {
        newFriendsModel.push(friend);
      }
    }

    setFriendsModel(newFriendsModel);
  };


  useEffect(() => {
    demandFriendsModel(async ({ get, set }) => {
      if (!userData || friendsModel.length > 0) return;
      const friendHistories = await fetchFriendsModel(userData, 10,  new PaginateModel());
      extractLatest(friendHistories);
      set(friendHistories);
      setFirstLoaded(true);
      onStateChange?.('data');
    });
  }, [demandFriendsModel]);


  const callPaginate = async () => {
    if (!userData || friendsModel.length <= 0) return;
    setFriendsLoading(true);
    const friendHistories = await fetchFriendsModel(userData, 20, paginateModel);
    setFriendsLoading(false);
    if (friendHistories.length > 0) {
      extractLatest(friendHistories);
      processFriendsModelPaginate(friendHistories);
    }
  };
  const refreshData = async () => {
    if (!userData || friendsModel.length > 0) return;
    setFriendsLoading(true);
    const friendHistories = await fetchFriendsModel(userData, 10, paginateModel);
    setFriendsLoading(false);
    if (friendHistories.length > 0) {
      extractLatest(friendHistories);
      setFriendsModel(friendHistories);
    }
  };

  // Format date to match the screenshot (e.g., "Apr 27 at 3:00AM")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    return `${date.toLocaleDateString('en-US', options)} at ${date.toLocaleTimeString('en-US', timeOptions).toLowerCase().replace(' ', '')}`;
  };


  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const getReferralStatus = (status: string | null): string => {
    switch (status) {
      case null:
        return "Error";
      case 'Referral.none':
        return t('failed_text');
      case 'Referral.completed':
        return t('completed_text');
      case 'Referral.failed':
        return t('failed_text');
      case 'Referral.active':
        return t('active_text');
      default:
        return "Error";
    }
  };

  const getStatusClass = (status: string | null): string => {
    switch (status) {
      case 'Referral.active':
        return styles.statusActive;
      case 'Referral.completed':
        return styles.statusCompleted;
      case 'Referral.failed':
        return styles.statusFailed;
      default:
        return styles.statusFailed;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  if(!firstLoaded && friendsModel.length <= 0) return null;

  return (
    <div className={styles.historyContainer}>
      <h2 className={`${styles.historyTitle} ${styles[`historyTitle_${theme}`]}`}>
         {t('friends_text')}
      </h2>

      <div className={styles.historyList}>
        {friendsModel.map((friend, index) => (
          <div key={index} className={styles.historyItemContainer}>
            {friend.usersImage ? (
              <Image
                className={styles.logo}
                src={friend.usersImage}
                alt="Topic"
                width={40}
                height={40}
              />
            ) : (
              <div className={styles.initials}>{getInitials(friend.usersNames)}</div>
            )}

            <div className={styles.historyItem}>
              <div className={styles.historyMain}>
                <span className={`${styles.topicName} ${styles[`topicName_${theme}`]}`}>
                  {friend.usersNames}
                </span>
                <span className={`${styles.historyTime} ${getStatusClass(friend.usersReferredStatus)}`}>
                  {getReferralStatus(friend.usersReferredStatus)}
                </span>
              </div>
              <div className={styles.historyContent}>
                <div className={styles.historyDetails}>
                    <span className={`${styles.historyDetail} ${styles[`historyDetails_${theme}`]}`}>
                        {formatDate(friend.usersCreatedAt)}
                    </span>
                    <span className={`${styles.historyDetail} ${styles[`historyDetails_${theme}`]}`}>
                        {friend.usersUsername}
                    </span>
                </div>
                              <button
                                className={`${styles.copyButton}`}
                                onClick={() => copyToClipboard(friend.usersUsername)}
                                aria-label="Copy username"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={styles.copyIcon}
                                >
                                  <path
                                    d="M13.3333 6H7.33333C6.59695 6 6 6.59695 6 7.33333V13.3333C6 14.0697 6.59695 14.6667 7.33333 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V7.33333C14.6667 6.59695 14.0697 6 13.3333 6Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M10 6V4.66667C10 3.95942 9.71905 3.28115 9.21903 2.78105C8.71902 2.28104 8.04076 2 7.3335 2H4.00016C3.29291 2 2.61464 2.28104 2.11463 2.78105C1.61462 3.28115 1.3335 3.95942 1.3335 4.66667V8.66667C1.3335 9.37391 1.61462 10.0522 2.11463 10.5522C2.61464 11.0523 3.29291 11.3333 4.00016 11.3333H6.00016"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!friendsLoading && friendsModel.length === 0 && <div className={`${styles.rewardInfo} ${styles[`rewardInfo_${theme}`]}`}>
                                                         {t('referral_reward_info_username', {
                                                           amount: '500',
                                                           threshold: '700',
                                                           hours: '24',
                                                           username: userData?.usersUsername || '@yda'
                                                         })}
                                                         <div className={styles.refreshHint}>
                                                           <span
                                                                                                                                                            role="button"
                                                                                                                                                            onClick={refreshData}
                                                                                                                                                            className={`${styles.refreshText} ${styles[`refreshText_${theme}`]}`}
                                                                                                                                                          >
                                                                                                                                                            {t('click_to_refresh')}
                                                                                                                                                          </span>

                                                         </div>
                                                       </div>}
      {friendsModel.length > 0 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
            {friendsLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}

    </div>
  );
}
