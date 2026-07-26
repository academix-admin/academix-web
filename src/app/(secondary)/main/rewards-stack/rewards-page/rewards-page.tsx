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
import { useNav } from "@academix-admin/navigation-stack";
import RewardsTitle from "./rewards-title/rewards-title";
import AcademixRatio from "./academix-ratio/academix-ratio";
import RewardsStreaks from "./rewards-streaks/rewards-streaks";
import MilestoneView from "./milestone-view/milestone-view";
import RewardsFriends from "./rewards-friends/rewards-friends";
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useComponentState, ComponentStateProps, getComponentStatus, useSettledReveal } from '@/hooks/use-component-state';

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

    // Reveal the body sections together once loads settle (see useSettledReveal). The title
    // shows early; the rest stay mounted (fetching) but hidden behind one LoadingView.
    const revealed = useSettledReveal(loadedCount);

  return (
    <div className={styles.mainContainer}>
      <RewardsTitle onStateChange={(state) => handleStateChange('rewardsTitle', state)}/>

      <div style={{ display: revealed ? 'contents' : 'none' }}>
        <AcademixRatio onStateChange={(state) => handleStateChange('academixRatio', state)}/>
        <RewardsStreaks onStateChange={(state) => handleStateChange('rewardsStreaks', state)}/>
        <MilestoneView onStateChange={(state) => handleStateChange('milestoneView', state)}/>
        <RewardsFriends onStateChange={(state) => handleStateChange('rewardsFriends', state)}/>
      </div>

      <div>
        {!revealed && <LoadingView />}
        {revealed && error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={()=> console.log('error')} />)}
      </div>

    </div>
  );
}