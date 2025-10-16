'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './rewards-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import RewardsTitle from "./rewards-title/rewards-title";
import AcademixRatio from "./academix-ratio/academix-ratio";
import RewardsStreaks from "./rewards-streaks/rewards-streaks";
import MilestoneView from "./milestone-view/milestone-view";
import RewardsFriends from "./rewards-friends/rewards-friends";
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useComponentState, ComponentStateProps, getComponentStatus } from '@/hooks/use-component-state';

export default function RewardsPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

    const { compState, handleStateChange, getComponentState, resetComponentState } = useComponentState();

    const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
      () => getComponentStatus(compState),
      [compState]
    );

    // we have an error but not all loaded yet
    const error = loadedCount < 5 && errorCount > 0;

    // we can show loading
    const loading = loadedCount < 5 && errorCount === 0 && loadingCount > 0;

    // show ui
//     const show = !error && !loading;
    const show = true;



  return (
    <div className={styles.mainContainer}>
      {show && (<RewardsTitle onStateChange={(state) => handleStateChange('rewardsTitle', state)}/>)}
      {show && (<AcademixRatio onStateChange={(state) => handleStateChange('academixRatio', state)}/>)}
      {show && (<RewardsStreaks onStateChange={(state) => handleStateChange('rewardsStreaks', state)}/>)}
      {show && (<MilestoneView onStateChange={(state) => handleStateChange('milestoneView', state)}/>)}
      {show && (<RewardsFriends onStateChange={(state) => handleStateChange('rewardsFriends', state)}/>)}


      <div>
            {loading && (<LoadingView />)}
      {error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={()=> console.log('error')} />)}
      </div>

    </div>
  );
}