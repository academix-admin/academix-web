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
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useAchievementsData } from '@/lib/stacks/milestone-stack';
import { useAchievementsModel } from '@/lib/stacks/achievements-stack';
import { AchievementsData } from '@/models/achievements-data';
import { StateStack } from '@/lib/state-stack';
import { useDialog } from '@/lib/DialogViewer';
import { useTopViewer } from '@/lib/TopViewer';
import { copyToClipboard } from '@/utils/clipboard';

interface AchievementsContainerProps {
  tab: string;
  achievementsModel: AchievementsModel[];
  setAchievementsModel: (models: AchievementsModel[]) => void;
  isLoading: boolean;
  error: string;
  handleCollected: () => void;
  onLoadMore: () => void;
}


const AchievementsCard: React.FC<{ achievements: AchievementsModel, tab: string, handleCollected: () => void }> = ({ achievements, tab, handleCollected }) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const errorDialog = useDialog();
  const { showToast, ToastComponent } = useTopViewer();
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
      await copyToClipboard(text);
      showToast(t('code_copied') || 'Code copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast(t('copy_failed') || 'Failed to copy code', 'error');
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
        errorDialog.open(<p>{t('error_occurred')}</p>);
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
        errorDialog.open(<p>{t('error_occurred')}</p>);
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
        setCollectAchievementsModel([updatedAchievements, ...collectAchievementsModel]);

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
      errorDialog.open(<p>{t('error_occurred')}</p>);
    } finally {
      setCollecting(false);
    }
  };

  const formattedExpiry = expires ? new Date(expires) : null;
  const isExpired = formattedExpiry ? formattedExpiry < new Date() : false;
  const expiryText = formattedExpiry && !isExpired
    ? formattedExpiry.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    : null;

  return (
    <>
      <ToastComponent />
      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px 16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
      <div className={styles.achievementsCard} role="group" aria-labelledby={`achievements-${achievements.achievementsId}`}>
        {/* TOP SECTION (lighter/green) */}
        <div className={styles.achievementsCardTop}>
          <div className={styles.achievementsHeader}>
            <div className={styles.achievementsIcon}>
              {achievements.achievementsImage ? (
                <Image src={achievements.achievementsImage} alt={achievements.achievementsTitle} width={56} height={56} className={styles.iconImg} />
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
          {(expiryText || isExpired) && (
            <div className={styles.expiresRow}>
              <div className={styles.expiresText}>
                {isExpired ? t('expired_text') : t('expires_text', { date: expiryText! })}
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
                {collecting ? <span className={styles.moreSpinner}></span> : t('collect_text')}
              </button>
            </div> : <></>
          )}
        </div>
      </div>
    </>
  );
}


const AchievementsContainer: React.FC<AchievementsContainerProps> = ({ 
  tab, 
  achievementsModel, 
  setAchievementsModel,
  isLoading, 
  error, 
  handleCollected,
  onLoadMore 
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && achievementsModel.length > 0 && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [achievementsModel, isLoading, onLoadMore]);

  const refreshData = () => {
    // Parent will handle refresh
  };


  return (
    <div className={styles.achievementsList}>
      {achievementsModel.map((achievements) => (
        <AchievementsCard key={achievements.achievementsId} achievements={achievements} tab={tab} handleCollected={handleCollected} />
      ))}

      {achievementsModel.length > 10 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
      {isLoading && achievementsModel.length === 0 && <LoadingView />}
      {!isLoading && achievementsModel.length === 0 && !error && (<NoResultsView text="No result" buttonText="Try Again" onButtonClick={refreshData} />)}
      {!isLoading && achievementsModel.length === 0 && error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={refreshData} />)}


    </div>
  );
};

export default function AchievementsPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();

  const [activeTabs, setActiveTabs] = useState<TabMilestone[]>([
    { id: 'AchievementTab.active', label: t('active_text'), active: true },
    { id: 'AchievementTab.pending', label: t('pending_text'), active: false },
    { id: 'AchievementTab.completed', label: t('completed_text'), active: false }
  ]);

  const [tabCounts, setTabCounts] = useState<Record<string, number>>({
    'AchievementTab.active': 0,
    'AchievementTab.pending': 0,
    'AchievementTab.completed': 0
  });

  const [achievementsData, demandAchievementsData] = useAchievementsData(lang);
  
  // Store data for all tabs
  const [activeModel, , setActiveModel] = useAchievementsModel(lang, 'AchievementTab.active');
  const [pendingModel, , setPendingModel] = useAchievementsModel(lang, 'AchievementTab.pending');
  const [completedModel, , setCompletedModel] = useAchievementsModel(lang, 'AchievementTab.completed');

  const [paginateModels, setPaginateModels] = useState<Record<string, PaginateModel>>({
    'AchievementTab.active': new PaginateModel(),
    'AchievementTab.pending': new PaginateModel(),
    'AchievementTab.completed': new PaginateModel()
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    'AchievementTab.active': false,
    'AchievementTab.pending': false,
    'AchievementTab.completed': false
  });

  const [errorStates, setErrorStates] = useState<Record<string, string>>({
    'AchievementTab.active': '',
    'AchievementTab.pending': '',
    'AchievementTab.completed': ''
  });

  // Fetch function for a specific tab
  const fetchTabData = useCallback(async (tabId: string, limitBy: number, paginate: PaginateModel) => {
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
        p_achievement_tab: tabId,
        p_after_achievements: paginate.toJson(),
      });

      if (error) {
        console.error(`[AchievementsPage] Error fetching ${tabId}:`, error);
        setErrorStates(prev => ({ ...prev, [tabId]: t('error_fetching_achievements') }));
        return [];
      }

      setErrorStates(prev => ({ ...prev, [tabId]: '' }));
      return (data || []).map((row: BackendAchievementsModel) => new AchievementsModel(row));
    } catch (err) {
      console.error(`[AchievementsPage] Error fetching ${tabId}:`, err);
      setErrorStates(prev => ({ ...prev, [tabId]: t('error_fetching_achievements') }));
      return [];
    }
  }, [userData, lang, t]);

  // Fetch all tabs in parallel on mount
  useEffect(() => {
    if (!userData) return;

    const fetchAllTabs = async () => {
      const tabs = ['AchievementTab.active', 'AchievementTab.pending', 'AchievementTab.completed'];
      
      setLoadingStates({
        'AchievementTab.active': true,
        'AchievementTab.pending': true,
        'AchievementTab.completed': true
      });

      const results = await Promise.all(
        tabs.map(async (tabId) => {
          const models = await fetchTabData(tabId, 10, new PaginateModel());
          return { tab: tabId, models };
        })
      );

      results.forEach(({ tab, models }) => {
        if (models.length > 0) {
          const lastItem = models[models.length - 1];
          setPaginateModels(prev => ({
            ...prev,
            [tab]: new PaginateModel({ sortId: lastItem.sortCreatedId })
          }));
        }

        // Directly set the models without triggering hook demand
        if (tab === 'AchievementTab.active') setActiveModel(models);
        else if (tab === 'AchievementTab.pending') setPendingModel(models);
        else if (tab === 'AchievementTab.completed') setCompletedModel(models);
      });

      setLoadingStates({
        'AchievementTab.active': false,
        'AchievementTab.pending': false,
        'AchievementTab.completed': false
      });
    };

    fetchAllTabs();
  }, [userData, fetchTabData, setActiveModel, setPendingModel, setCompletedModel]);

  // Update counts from models (only when models actually change)
  useEffect(() => {
    const newCounts = {
      'AchievementTab.active': activeModel.length,
      'AchievementTab.pending': pendingModel.length,
      'AchievementTab.completed': completedModel.length
    };
    
    // Only update if counts actually changed
    if (JSON.stringify(newCounts) !== JSON.stringify(tabCounts)) {
      setTabCounts(newCounts);
    }
  }, [activeModel.length, pendingModel.length, completedModel.length]);

  // Update counts when achievementsData changes
  useEffect(() => {
    if (achievementsData) {
      setTabCounts({
        'AchievementTab.active': achievementsData.achievementsCount - achievementsData.achievementsFinished,
        'AchievementTab.pending': achievementsData.achievementsNotRewarded,
        'AchievementTab.completed': achievementsData.achievementsCompleted
      });
    }
  }, [achievementsData]);

  // Load more for current tab
  const handleLoadMore = useCallback(async () => {
    const currentTab = activeTabs.find((tab: TabMilestone) => tab.active)?.id;
    if (!currentTab || loadingStates[currentTab]) return;

    setLoadingStates(prev => ({ ...prev, [currentTab]: true }));

    const currentModel = currentTab === 'AchievementTab.active' ? activeModel :
                         currentTab === 'AchievementTab.pending' ? pendingModel : completedModel;
    
    if (currentModel.length === 0) {
      setLoadingStates(prev => ({ ...prev, [currentTab]: false }));
      return;
    }

    const newModels = await fetchTabData(currentTab, 20, paginateModels[currentTab]);
    
    if (newModels.length > 0) {
      const lastItem = newModels[newModels.length - 1];
      setPaginateModels(prev => ({
        ...prev,
        [currentTab]: new PaginateModel({ sortId: lastItem.sortCreatedId })
      }));

      const oldIds = currentModel.map((e: AchievementsModel) => e.achievementsId);
      const merged = [...currentModel, ...newModels.filter((m: AchievementsModel) => !oldIds.includes(m.achievementsId))];

      if (currentTab === 'AchievementTab.active') setActiveModel(merged);
      else if (currentTab === 'AchievementTab.pending') setPendingModel(merged);
      else if (currentTab === 'AchievementTab.completed') setCompletedModel(merged);
    }

    setLoadingStates(prev => ({ ...prev, [currentTab]: false }));
  }, [activeTabs, activeModel, pendingModel, completedModel, loadingStates, paginateModels, fetchTabData, setActiveModel, setPendingModel, setCompletedModel]);

  // Get active tab
  const activeTab = activeTabs.find(tab => tab.active)?.id || 'AchievementTab.active';
  const currentModel = activeTab === 'AchievementTab.active' ? activeModel :
                       activeTab === 'AchievementTab.pending' ? pendingModel : completedModel;
  const currentSetModel = activeTab === 'AchievementTab.active' ? setActiveModel :
                          activeTab === 'AchievementTab.pending' ? setPendingModel : setCompletedModel;

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
              {tabCounts[tab.id] > 0 && (
                <span className={styles.tabCount}> ({tabCounts[tab.id]})</span>
              )}
            </button>
          ))}
        </div>

        <AchievementsContainer 
          tab={activeTab} 
          achievementsModel={currentModel}
          setAchievementsModel={currentSetModel}
          isLoading={loadingStates[activeTab]}
          error={errorStates[activeTab]}
          handleCollected={handleCollected}
          onLoadMore={handleLoadMore}
        />
      </div>
    </main>
  );
}