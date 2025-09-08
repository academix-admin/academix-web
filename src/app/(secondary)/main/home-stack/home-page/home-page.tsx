'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import HomeQuizHistory from "./home-quiz-history/home-quiz-history";
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useComponentState, ComponentStateProps, getComponentStatus } from '@/hooks/use-component-state';



export default function HomePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { compState, handleStateChange, getComponentState, resetComponentState } = useComponentState();

  const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
    () => getComponentStatus(compState),
    [compState]
  );

  // we have an error but not all loaded yet
  const error = loadedCount < 5 && errorCount > 0;

  // the title is none
  const none = getComponentState('homeTitle') === 'none';

  // we can show loading
  const loading = loadedCount < 5 && errorCount === 0 && loadingCount > 0;

  // show ui
  const show = !error && !none && !loading;

  return (
    <div className={`${styles.mainContainer} ${styles[`mainContainer_${theme}`]}`}>
      {show && (<HomeTitle onStateChange={(state) => handleStateChange('homeTitle', state)}/>)}
      {show && (<HomeExperience onStateChange={(state) => handleStateChange('homeExperience', state)}/>)}
      {show && (<HomePerformance onStateChange={(state) => handleStateChange('homePerformance', state)}/>)}
      {show && (<HomeStatistics onStateChange={(state) => handleStateChange('homeStatistics', state)}/>)}
      {show && (<HomeQuizHistory onStateChange={(state) => handleStateChange('homeQuizHistory', state)}/>)}


     <div>
      {error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={()=> console.log('error')} />)}
           {loading && (<LoadingView />)}
           {none && (<LoadingView />)}
     </div>

    </div>
  );
}