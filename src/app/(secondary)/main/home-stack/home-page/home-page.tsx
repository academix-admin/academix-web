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
import { useNav } from "@academix-admin/navigation-stack";
import HomeTitle from "./home-title/home-title";
import HomeExperience from "./home-experience/home-experience";
import HomePerformance from "./home-performance/home-performance";
import HomeStatistics from "./home-statistics/home-statistics";
import HomeQuizHistory from "./home-quiz-history/home-quiz-history";
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useComponentState, ComponentStateProps, getComponentStatus, useSettledReveal } from '@/hooks/use-component-state';



export default function HomePage() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const { compState, handleStateChange, getComponentState, resetComponentState } = useComponentState();

  const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
    () => getComponentStatus(compState),
    [compState]
  );

  // we have an error but not all loaded yet
  // Page-level error ONLY on total failure (nothing loaded) — never stack an error over loaded content.
  const error = loadedCount === 0 && errorCount > 0;

  // Reveal the body sections TOGETHER once their loads settle, instead of painting them in
  // one-by-one. On a cold start (e.g. right after Google sign-in — a full-page reload) each
  // section fetches its own data at a different time, which looked like an empty body filling
  // piece by piece. The sections stay MOUNTED while hidden (display:none still runs their
  // effects/fetches), so nothing is delayed; we just hold the reveal until things settle.
  const revealed = useSettledReveal(loadedCount);

  return (
    <div className={`${applyTheme(styles, 'mainContainer')}`}>
      {/* Header shows as soon as userData is ready (it only needs the profile). */}
      <HomeTitle onStateChange={(state) => handleStateChange('homeTitle', state)} />

      {/* Body: mounted (so it fetches) but hidden until the sections settle, then revealed
          all at once — no piecemeal fill. */}
      <div style={{ display: revealed ? 'contents' : 'none' }}>
        <HomeExperience onStateChange={(state) => handleStateChange('homeExperience', state)} />
        <HomePerformance onStateChange={(state) => handleStateChange('homePerformance', state)} />
        <HomeStatistics onStateChange={(state) => handleStateChange('homeStatistics', state)} />
        <HomeQuizHistory onStateChange={(state) => handleStateChange('homeQuizHistory', state)} />
      </div>

      <div>
        {!revealed && <LoadingView />}
        {revealed && error && (
          <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={() => window.location.reload()} />
        )}
      </div>
    </div>
  );
}