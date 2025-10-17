'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './mission-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalize } from '@/utils/textUtils';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import TabMilestone from "@/models/tab-milestone";
import { useDemandState } from '@/lib/state-stack';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendMissionModel } from '@/models/mission-model';
import { MissionModel } from '@/models/mission-model';
import { RewardClaimModel } from '@/models/mission-model';
import { MissionProgressDetails } from '@/models/mission-model';
import { PaginateModel } from '@/models/paginate-model';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useMissionData } from '@/lib/stacks/milestone-stack';
import { useMissionModel } from '@/lib/stacks/mission-stack';
import { MissionData } from '@/models/mission-data';
import { StateStack } from '@/lib/state-stack';

interface MissionContainerProps {
  tab: string;
  handleCollected: () => void
}


const MissionCard: React.FC<{ mission: MissionModel, tab: string, handleCollected: () => void }> = ({ mission, tab, handleCollected }) => {
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const [collecting, setCollecting] = useState(false);
  const [missionModel, demandMissionModel, setMissionModel] = useMissionModel(lang, tab);
  const [collectMissionModel, demandCollectMissionModel, setCollectMissionModel] = useMissionModel(lang, 'MissionTab.completed');
  const [missionData, demandMissionData, setMissionData] = useMissionData(lang);

  const progressCount = mission.missionProgressDetails.missionProgressCount ?? 0;
  const progressRequired = mission.missionProgressDetails.missionProgressRequired ?? 1;
  const progressPercentage = Math.min(100, Math.round((progressCount / Math.max(1, progressRequired)) * 100));
  const rewarded = mission.missionProgressDetails.missionProgressRewarded === true;
  const redeem = mission.missionProgressDetails.rewardRedeemCodeModel;
  const redeemCode = redeem?.value ?? null;
  const expires = redeem?.expires ?? null;

  const rewardText = useMemo(() => {
    try {
      // Format number
      return new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: 2 }).format(
        mission.rewardDetails?.rewardValue ?? 0
      );
    } catch {
      return String(mission.rewardDetails?.rewardValue ?? 0);
    }
  }, [mission.rewardDetails, lang]);

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

     const { data, error } = await supabaseBrowser.rpc("claim_user_mission", {
       p_user_id: paramatical.usersId,
       p_locale: paramatical.locale,
       p_country: paramatical.country,
       p_gender: paramatical.gender,
       p_age: paramatical.age,
       p_mission_id: mission.missionId
     });

     if (error) {
       console.error("Failed to claim mission:", error);
       setCollecting(false);
       return;
     }

     if (data.status === 'MissionReward.success') {
       const claimDetails = new RewardClaimModel(data.reward_claim_details);

       // 1. Find the mission in missionModel
       const missionIndex = missionModel.findIndex(item => {
         const missionInstance = MissionModel.from(item);
         return missionInstance.missionId === mission.missionId;
       });

       if (missionIndex === -1) {
         console.error("Mission not found in missionModel");
         setCollecting(false);
         return;
       }

       // 2. Remove it from missionModel and create updated version
       const updatedMissionModel = [...missionModel];
       const missionToUpdate = updatedMissionModel.splice(missionIndex, 1)[0];

       // 3. Update the mission with rewarded status
       const missionInstance = MissionModel.from(missionToUpdate);
       const updatedMission = missionInstance.copyWith({
         missionProgressDetails: missionInstance.missionProgressDetails.copyWithRewarded(
           true,
           claimDetails.redeemCode
         )
       });

       // 4. Add the updated mission to collectMissionModel
       setCollectMissionModel([updatedMission,...collectMissionModel]);

       setMissionModel(updatedMissionModel);

       // Update mission count data
       if (data.mission_count_details) {
         const missionCount = new MissionData(data.mission_count_details);
         setMissionData(missionCount);
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
    <div className={styles.missionCard} role="group" aria-labelledby={`mission-${mission.missionId}`}>
      {/* TOP SECTION (lighter/green) */}
      <div className={styles.missionCardTop}>
        <div className={styles.missionHeader}>
          <div className={styles.missionIcon}>
            {mission.missionImage ? (
              <Image src={mission.missionImage} alt={mission.missionTitle} width={56} height={56} className={styles.iconImg}/>
            ) : (
              <div className={styles.placeholderIcon}>🎯</div>
            )}
          </div>

          <div className={styles.missionInfo}>
            <h3 id={`mission-${mission.missionId}`} className={styles.missionTitle}>
              {mission.missionTitle}
            </h3>
            <p className={styles.missionDescription}>
              {mission.missionDescription}
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
      <div className={styles.missionCardBottom}>
        {/* If not yet rewarded: show Instructions heading (like Dart) */}
        {!rewarded && (
          <div className={styles.instructionsRow}>
            <div className={styles.instructionsTitle}>{t('instructions_text')}</div>
            <div className={styles.instructionsBody}>
              {mission.rewardDetails?.rewardInstruction ?? mission.rewardDetails.rewardInstruction ?? t('no_instructions') ?? ''}
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


const MissionContainer: React.FC<MissionContainerProps> = ({ tab, handleCollected }) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [missionLoading, setMissionLoading] = useState(false);
  const [error, setError] = useState('');

  const [missionModel, demandMissionModel, setMissionModel] = useMissionModel(lang, tab);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && missionModel.length > 0 && !missionLoading) {
          callPaginate();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [missionModel, paginateModel, missionLoading]);

  const fetchMissionModel = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<MissionModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_user_missions", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_mission_tab: tab,
        p_after_missions: paginateModel.toJson(),
      });

      if (error) {
        console.error("[MissionModel] error:", error);
        setError(t('error_fetching_missions'));
        return [];
      }

      setError('');
      return (data || []).map((row: BackendMissionModel) => new MissionModel(row));
    } catch (err) {
      console.error("[MissionModel] error:", err);
      setError(t('error_fetching_missions'));
      setMissionLoading(false);
      return [];
    }
  }, [lang, tab, t]);

  const extractLatest = (userMissionModel: MissionModel[]) => {
    if (userMissionModel.length > 0) {
      const lastItem = userMissionModel[userMissionModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processMissionModelPaginate = (userMissionModel: MissionModel[]) => {
    const oldMissionModelIds = missionModel.map((e) => e.missionId);
    const newMissionModel = [...missionModel];

    for (const mission of userMissionModel) {
      if (!oldMissionModelIds.includes(mission.missionId)) {
        newMissionModel.push(mission);
      }
    }

    setMissionModel(newMissionModel);
  };

  useEffect(() => {
      if (!userData) return;
    demandMissionModel(async ({ get, set }) => {
      setMissionLoading(true);
      const missionModels = await fetchMissionModel(userData, 10, new PaginateModel());
      extractLatest(missionModels);
      set(missionModels);
      setFirstLoaded(true);
      setMissionLoading(false);
    });
  }, [demandMissionModel, userData]);

  const callPaginate = async () => {
    if (!userData || missionModel.length <= 0 || missionLoading) return;
    setMissionLoading(true);
    const missionModels = await fetchMissionModel(userData, 20, paginateModel);
    setMissionLoading(false);
    if (missionModels.length > 0) {
      extractLatest(missionModels);
      processMissionModelPaginate(missionModels);
    }
  };

  const refreshData = async () => {
    if (!userData) return;
    setMissionLoading(true);
    setMissionModel([]);
    setPaginateModel(new PaginateModel());
    const missionModels = await fetchMissionModel(userData, 10, new PaginateModel());
    setMissionLoading(false);
    if (missionModels.length > 0) {
      extractLatest(missionModels);
      setMissionModel(missionModels);
    }
  };


  return (
    <div className={styles.missionsList}>
      {missionModel.map((mission) => (
        <MissionCard key={mission.missionId} mission={mission} tab={tab} handleCollected={handleCollected}/>
      ))}

       {missionModel.length > 10 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
       {missionLoading && missionModel.length === 0 && <LoadingView />}
       {!missionLoading && missionModel.length === 0 && !error && (<NoResultsView text="No result" buttonText="Try Again" onButtonClick={refreshData} />)}
       {!missionLoading && missionModel.length === 0 && error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={refreshData} />)}


    </div>
  );
};

export default function MissionPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();

  const [activeTabs, setActiveTabs] = useState<TabMilestone[]>([
    { id: 'MissionTab.active', label: t('active_text'), active: true },
    { id: 'MissionTab.pending', label: t('pending_text'), active: false },
    { id: 'MissionTab.completed', label: t('completed_text'), active: false }
  ]);

  // Get active tab
  const activeTab = activeTabs.find(tab => tab.active)?.id || 'MissionTab.active';

  // Set active tab
  const setActiveTab = (id: string) => {
    setActiveTabs(prev => prev.map(tab => ({
      ...tab,
      active: tab.id === id
    })));
  };


  const handleCollected = () => {
    setActiveTab('MissionTab.completed');
  };

  const goBack = async () => {
    await nav.pop();
    StateStack.core.clearScope('mission_flow');
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
          <h1 className={styles.title}>{t('missions_text')}</h1>
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

        <MissionContainer tab={activeTab} handleCollected={handleCollected} />
      </div>
    </main>
  );
}