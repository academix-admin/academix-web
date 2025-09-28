'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { useComponentState, ComponentStateProps, getComponentStatus } from '@/hooks/use-component-state';
import QuizPageTitle from "./quiz-page-title/quiz-page-title";
import AvailableQuizTopics from "./available-quiz-topics/available-quiz-topics";


export default function QuizPage() {
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
    const show = !error && !loading;



  return (
    <div className={styles.mainContainer}>
      <QuizPageTitle onStateChange={(state) => handleStateChange('quizPageTitle', state)} />



      <AvailableQuizTopics onStateChange={(state) => handleStateChange('creatorAvailableQuizTopics', state)} pType={'creator'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('personalizedAvailableQuizTopics', state)} pType={'personalized'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('publicAvailableQuizTopics', state)} pType={'public'} />

    </div>
  );
}