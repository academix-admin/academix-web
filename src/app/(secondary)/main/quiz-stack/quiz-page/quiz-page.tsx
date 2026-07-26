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
import { useNav } from "@academix-admin/navigation-stack";
import { useComponentState, ComponentStateProps, getComponentStatus, useSettledReveal } from '@/hooks/use-component-state';
import LoadingView from '@/components/LoadingView/LoadingView';
import QuizPageTitle from "./quiz-page-title/quiz-page-title";
import AvailableQuizTopics from "./available-quiz-topics/available-quiz-topics";
import PublicQuizTopics from "./public-quiz-topics/public-quiz-topics";
import ActiveQuizTopic from "./active-quiz-topic/active-quiz-topic";


export default function QuizPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

    const { compState, handleStateChange, getComponentState, resetComponentState } = useComponentState();

    const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
      () => getComponentStatus(compState),
      [compState]
    );

    // Reveal the topic lists together once loads settle; the title shows immediately and the
    // lists stay mounted (fetching) but hidden behind one LoadingView until then.
    const revealed = useSettledReveal(loadedCount);

  return (
    <div className={styles.mainContainer}>
      <QuizPageTitle onStateChange={(state) => handleStateChange('quizPageTitle', state)} />

      <div style={{ display: revealed ? 'contents' : 'none' }}>
        <ActiveQuizTopic onStateChange={(state) => handleStateChange('activeQuizTopic', state)} />

        <PublicQuizTopics onStateChange={(state) => handleStateChange('creatorPublicQuizTopics', state)} pType={'creator'} />

        <PublicQuizTopics onStateChange={(state) => handleStateChange('personalizedPublicQuizTopics', state)} pType={'personalized'} />

        <PublicQuizTopics onStateChange={(state) => handleStateChange('publicPublicQuizTopics', state)} pType={'public'} />

        <AvailableQuizTopics onStateChange={(state) => handleStateChange('creatorAvailableQuizTopics', state)} pType={'creator'} />

        <AvailableQuizTopics onStateChange={(state) => handleStateChange('personalizedAvailableQuizTopics', state)} pType={'personalized'} />

        <AvailableQuizTopics onStateChange={(state) => handleStateChange('publicAvailableQuizTopics', state)} pType={'public'} />
      </div>

      {!revealed && <LoadingView />}

    </div>
  );
}