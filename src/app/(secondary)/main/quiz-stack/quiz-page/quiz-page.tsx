'use client';

import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@academix-admin/navigation-stack";
import { useComponentState, ComponentStateProps } from '@/hooks/use-component-state';
import QuizPageTitle from "./quiz-page-title/quiz-page-title";
import AvailableQuizTopics from "./available-quiz-topics/available-quiz-topics";
import PublicQuizTopics from "./public-quiz-topics/public-quiz-topics";
import ActiveQuizTopic from "./active-quiz-topic/active-quiz-topic";


export default function QuizPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

    const { handleStateChange } = useComponentState();

    // NOTE: no hide-then-reveal here. The quiz topic lists load based on visibility/scroll
    // (paginated), so hiding them with display:none during a reveal window stopped their
    // initial fetch and left the page blank. They render directly and manage their own
    // loading. (Duplicate state key for ActiveQuizTopic fixed → 'activeQuizTopic'.)

  return (
    <div className={styles.mainContainer}>
      <QuizPageTitle onStateChange={(state) => handleStateChange('quizPageTitle', state)} />

      <ActiveQuizTopic onStateChange={(state) => handleStateChange('activeQuizTopic', state)} />

      <PublicQuizTopics onStateChange={(state) => handleStateChange('creatorPublicQuizTopics', state)} pType={'creator'} />

      <PublicQuizTopics onStateChange={(state) => handleStateChange('personalizedPublicQuizTopics', state)} pType={'personalized'} />

      <PublicQuizTopics onStateChange={(state) => handleStateChange('publicPublicQuizTopics', state)} pType={'public'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('creatorAvailableQuizTopics', state)} pType={'creator'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('personalizedAvailableQuizTopics', state)} pType={'personalized'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('publicAvailableQuizTopics', state)} pType={'public'} />

    </div>
  );
}