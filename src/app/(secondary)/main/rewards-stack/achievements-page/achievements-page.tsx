'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './achievements-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalize } from '@/utils/textUtils';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import TabMilestone from "@/models/tab-milestone";
import { useDemandState } from '@/lib/state-stack';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendAchievementsModel } from '@/models/achievements-model';
import { AchievementsModel } from '@/models/achievements-model';
import { RewardClaimModel } from '@/models/achievements-model';
import { AchievementsProgressDetails } from '@/models/achievements-model';
import { PaginateModel } from '@/models/paginate-model';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useAchievementsData } from '@/lib/stacks/milestone-stack';
import { useAchievementsModel } from '@/lib/stacks/achievements-stack';
import { AchievementsData } from '@/models/achievements-data';
import { StateStack } from '@/lib/state-stack';

interface AchievementsContainerProps {
  tab: string;
  handleCollected: () => void
}


const AchievementsCard: React.FC<{ achievements: AchievementsModel, tab: string, handleCollected: () => void }> = ({ achievements, tab, handleCollected }) => {
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const [collecting, setCollecting] = useState(false);
  const [achievementsModel, demandAchievementsModel, setAchievementsModel] = useAchievementsModel(lang, tab);
  const [collectAchievementsModel, demandCollectAchievementsModel, setCollectAchievementsModel] = useAchievementsModel(lang, 'AchievementTab.completed');
  const [achievementsData, demandAchievementsData, setAchievementsData] = useAchievementsData(lang);

  const progressCount = achievements.achievementsProgressDetails.achievementsProgressCount ?? 0;
  const progressRequired = achievements.achievementsProgressDetails.achievementsProgressRequired ?? 1;
  const progressPercentage = Math.min(100, Math.round((progressCount / Math.max(1, progressRequired)) * 100));
  const rewarded = achievements.achievementsProgressDetails.achievementsProgressRewarded === true;
  const redeem = achievements.achievementsProgressDetails.rewardRedeemCodeModel;
  const redeemCode = redeem?.value ?? null;
  const expires = redeem?.expires ?? null;

  const rewardText = useMemo(() => {
    try {
      // Format number
      return new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: 2 }).format(
        achievements.rewardDetails?.rewardValue ?? 0
      );
    } catch {
      return String(achievements.rewardDetails?.rewardValue ?? 0);
    }
  }, [achievements.rewardDetails, lang]);

  const handleCopy = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
    }
  };

 const handleCollect = async () => {
   if (!userData) {
     console.warn("User data not available");
     return;
   }

   try {
     setCollecting(true);

     const paramatical = await getParamatical(
       userData.usersId,
       lang,
       userData.usersSex,
       userData.usersDob
     );

     if (!paramatical) {
       setCollecting(false);
       console.error("Failed to get paramatical data");
       return;
     }

     const { data, error } = await supabaseBrowser.rpc("claim_user_achievements", {
       p_user_id: paramatical.usersId,
       p_locale: paramatical.locale,
       p_country: paramatical.country,
       p_gender: paramatical.gender,
       p_age: paramatical.age,
       p_achievements_id: achievements.achievementsId
     });

     if (error) {
       console.error("Failed to claim achievements:", error);
       setCollecting(false);
       return;
     }

     if (data.status === 'AchievementReward.success') {
       const claimDetails = new RewardClaimModel(data.reward_claim_details);

       // 1. Find the achievements in achievementsModel
       const achievementsIndex = achievementsModel.findIndex(item => {
         const achievementsInstance = AchievementsModel.from(item);
         return achievementsInstance.achievementsId === achievements.achievementsId;
       });

       if (achievementsIndex === -1) {
         console.error("Achievements not found in achievementsModel");
         setCollecting(false);
         return;
       }

       // 2. Remove it from achievementsModel and create updated version
       const updatedAchievementsModel = [...achievementsModel];
       const achievementsToUpdate = updatedAchievementsModel.splice(achievementsIndex, 1)[0];

       // 3. Update the achievements with rewarded status
       const achievementsInstance = AchievementsModel.from(achievementsToUpdate);
       const updatedAchievements = achievementsInstance.copyWith({
         achievementsProgressDetails: achievementsInstance.achievementsProgressDetails.copyWithRewarded(
           true,
           claimDetails.redeemCode
         )
       });

       // 4. Add the updated achievements to collectAchievementsModel
       setCollectAchievementsModel([updatedAchievements,...collectAchievementsModel]);

       setAchievementsModel(updatedAchievementsModel);

       // Update achievements count data
       if (data.achievements_count_details) {
         const achievementsCount = new AchievementsData(data.achievements_count_details);
         setAchievementsData(achievementsCount);
         handleCollected();
       }
     }
   } catch (err) {
     console.error("Unexpected error in handleCollect:", err);
   } finally {
     setCollecting(false);
   }
 };

  const formattedExpiry = expires ? new Date(expires) : null;
  const expiryText = formattedExpiry
    ? formattedExpiry.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    : null;

  return (
    <div className={styles.achievementsCard} role="group" aria-labelledby={`achievements-${achievements.achievementsId}`}>
      {/* TOP SECTION (lighter/green) */}
      <div className={styles.achievementsCardTop}>
        <div className={styles.achievementsHeader}>
          <div className={styles.achievementsIcon}>
            {achievements.achievementsImage ? (
              <Image src={achievements.achievementsImage} alt={achievements.achievementsTitle} width={56} height={56} className={styles.iconImg}/>
            ) : (
              <div className={styles.placeholderIcon}>🎯</div>
            )}
          </div>

          <div className={styles.achievementsInfo}>
            <h3 id={`achievements-${achievements.achievementsId}`} className={styles.achievementsTitle}>
              {achievements.achievementsTitle}
            </h3>
            <p className={styles.achievementsDescription}>
              {achievements.achievementsDescription}
            </p>


                      <div className={styles.pointsWrap}>
                        <div className={styles.pointsRow}>
                          <svg viewBox="0 0 24 24" width="20" height="20" className={styles.coinSvg} aria-hidden>
                            <circle cx="12" cy="12" r="10" fill="white" stroke="none" />
                          </svg>
                          <span className={styles.pointsText}>{rewardText}</span>
                        </div>

                        <div className={styles.progressCount}>
                          {progressCount}/{progressRequired}
                        </div>
                      </div>

          </div>
        </div>
      </div>

      {/* BOTTOM SECTION (darker) */}
      <div className={styles.achievementsCardBottom}>
        {/* If not yet rewarded: show Instructions heading (like Dart) */}
        {!rewarded && (
          <div className={styles.instructionsRow}>
            <div className={styles.instructionsTitle}>{t('instructions_text')}</div>
            <div className={styles.instructionsBody}>
              {achievements.rewardDetails?.rewardInstruction ?? achievements.rewardDetails.rewardInstruction ?? t('no_instructions') ?? ''}
            </div>
          </div>
        )}

        {/* Expiry row (shown when there is an expiry — in Dart they show it when rewardRedeemCodeModel?.expires != null) */}
        {expiryText && (
          <div className={styles.expiresRow}>
            <div className={styles.expiresText}>
              {t('expires_text', { date: expiryText})}
            </div>
            {/* small copy icon next to expiry (like screenshot shows) - clicking should not copy code */}
            {redeemCode && (
              <button
                className={styles.smallIconButton}
                title={'copy'}
                onClick={(e) => {
                  handleCopy(redeemCode);
                }}
              >
                {/* simple square icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="9" y="9" width="9" height="9" stroke="currentColor" strokeWidth="1.6" rx="1" />
                  <rect x="4.5" y="4.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2" rx="1" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* If rewarded: show code (centered) OR fallback to rewarded text */}
        {rewarded ? (
          <div className={styles.redeemBlock}>
            {redeemCode ? (
              <>
                <div className={styles.redeemCodeLarge}>{redeemCode}</div>
              </>
            ) : (
              <div className={styles.redeemedText}>
                {t('rewarded_text')}
              </div>
            )}
          </div>
        ) : (
          // Not rewarded: show collect button if progress complete, otherwise nothing
          progressRequired === progressCount ? <div className={styles.actionRow}>
              <button
                className={styles.collectButton}
                onClick={handleCollect}
                disabled={collecting}
              >
                {collecting ? <span className={styles.moreSpinner}></span> : t('collect_text') }
              </button>
          </div> : <></>
        )}
      </div>
    </div>
  );
}


const AchievementsContainer: React.FC<AchievementsContainerProps> = ({ tab, handleCollected }) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [error, setError] = useState('');

  const [achievementsModel, demandAchievementsModel, setAchievementsModel] = useAchievementsModel(lang, tab);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && achievementsModel.length > 0 && !achievementsLoading) {
          callPaginate();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [achievementsModel, paginateModel, achievementsLoading]);

  const fetchAchievementsModel = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<AchievementsModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_user_achievements", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_achievement_tab: tab,
        p_after_achievements: paginateModel.toJson(),
      });

      if (error) {
        console.error("[AchievementsModel] error:", error);
        setError(t('error_fetching_achievements'));
        return [];
      }

      setError('');
      return (data || []).map((row: BackendAchievementsModel) => new AchievementsModel(row));
    } catch (err) {
      console.error("[AchievementsModel] error:", err);
      setError(t('error_fetching_achievements'));
      setAchievementsLoading(false);
      return [];
    }
  }, [lang, tab, t]);

  const extractLatest = (userAchievementsModel: AchievementsModel[]) => {
    if (userAchievementsModel.length > 0) {
      const lastItem = userAchievementsModel[userAchievementsModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processAchievementsModelPaginate = (userAchievementsModel: AchievementsModel[]) => {
    const oldAchievementsModelIds = achievementsModel.map((e) => e.achievementsId);
    const newAchievementsModel = [...achievementsModel];

    for (const achievements of userAchievementsModel) {
      if (!oldAchievementsModelIds.includes(achievements.achievementsId)) {
        newAchievementsModel.push(achievements);
      }
    }

    setAchievementsModel(newAchievementsModel);
  };

  useEffect(() => {
      if (!userData) return;
    demandAchievementsModel(async ({ get, set }) => {
      setAchievementsLoading(true);
      const achievementsModels = await fetchAchievementsModel(userData, 10, new PaginateModel());
      extractLatest(achievementsModels);
      set(achievementsModels);
      setFirstLoaded(true);
      setAchievementsLoading(false);
    });
  }, [demandAchievementsModel, userData]);

  const callPaginate = async () => {
    if (!userData || achievementsModel.length <= 0 || achievementsLoading) return;
    setAchievementsLoading(true);
    const achievementsModels = await fetchAchievementsModel(userData, 20, paginateModel);
    setAchievementsLoading(false);
    if (achievementsModels.length > 0) {
      extractLatest(achievementsModels);
      processAchievementsModelPaginate(achievementsModels);
    }
  };

  const refreshData = async () => {
    if (!userData) return;
    setAchievementsLoading(true);
    setAchievementsModel([]);
    setPaginateModel(new PaginateModel());
    const achievementsModels = await fetchAchievementsModel(userData, 10, new PaginateModel());
    setAchievementsLoading(false);
    if (achievementsModels.length > 0) {
      extractLatest(achievementsModels);
      setAchievementsModel(achievementsModels);
    }
  };


  return (
    <div className={styles.achievementsList}>
      {achievementsModel.map((achievements) => (
        <AchievementsCard key={achievements.achievementsId} achievements={achievements} tab={tab} handleCollected={handleCollected}/>
      ))}

       {achievementsModel.length > 10 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
       {achievementsLoading && achievementsModel.length === 0 && <LoadingView />}
       {!achievementsLoading && achievementsModel.length === 0  && !error && (<NoResultsView text="No result" buttonText="Try Again" onButtonClick={refreshData} />)}
       {!achievementsLoading && achievementsModel.length === 0 && error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={refreshData} />)}


    </div>
  );
};

export default function AchievementsPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();

  const [activeTabs, setActiveTabs] = useState<TabMilestone[]>([
    { id: 'AchievementTab.active', label: t('active_text'), active: true },
    { id: 'AchievementTab.pending', label: t('pending_text'), active: false },
    { id: 'AchievementTab.completed', label: t('completed_text'), active: false }
  ]);

  // Get active tab
  const activeTab = activeTabs.find(tab => tab.active)?.id || 'AchievementsTab.active';

  // Set active tab
  const setActiveTab = (id: string) => {
    setActiveTabs(prev => prev.map(tab => ({
      ...tab,
      active: tab.id === id
    })));
  };


  const handleCollected = () => {
    setActiveTab('AchievementTab.completed');
  };

  const goBack = async () => {
    await nav.pop();
    StateStack.core.clearScope('achievements_flow');
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
          <h1 className={styles.title}>{t('achievements_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
        <div className={styles.tab_switcher}>
          {activeTabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${tab.active ? styles.tab_active : ''} ${styles[`tab_${theme}`]}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {capitalize(tab.label)}
            </button>
          ))}
        </div>

        <AchievementsContainer tab={activeTab} handleCollected={handleCollected} />
      </div>
    </main>
  );
}