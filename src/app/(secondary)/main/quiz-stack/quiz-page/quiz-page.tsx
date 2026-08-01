'use client';

import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './quiz-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { useNav } from "@academix-admin/navigation-stack";
import { useComponentState, ComponentStateProps, getComponentStatus } from '@/hooks/use-component-state';
import { useEffect, useState, Fragment } from 'react';
import ErrorView from '@/components/ErrorView/ErrorView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import LoadingView from '@/components/LoadingView/LoadingView';
import QuizPageTitle from "./quiz-page-title/quiz-page-title";
import AvailableQuizTopics from "./available-quiz-topics/available-quiz-topics";
import PublicQuizTopics from "./public-quiz-topics/public-quiz-topics";
import ActiveQuizTopic from "./active-quiz-topic/active-quiz-topic";


export default function QuizPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

    const { compState, handleStateChange, resetComponentState } = useComponentState();

    // NOTE: no hide-then-reveal here. The quiz topic lists load based on visibility/scroll
    // (paginated), so hiding them with display:none during a reveal window stopped their
    // initial fetch and left the page blank. They render directly and manage their own
    // loading. (Duplicate state key for ActiveQuizTopic fixed → 'activeQuizTopic'.)

    // When every section has settled with NO data (all error / feature-unavailable / empty), the page
    // would otherwise be blank. Surface one clear aggregate view instead. `nonce` bumps to retry.
    const status = getComponentStatus(compState);
    const anyData = status.loadedCount > 0;
    const anyLoading = status.loadingCount > 0;
    // Content sections tracked below (keep in sync with the JSX): active + 3 public + 3 available.
    const EXPECTED_SECTIONS = 7;
    const allReported = compState.size >= EXPECTED_SECTIONS;
    // `settled` is now only a SAFETY fallback for the rare case a section never reports at all — the
    // verdict normally shows the instant every section has reported (no artificial 3.5s wait).
    const [settled, setSettled] = useState(false);
    const [nonce, setNonce] = useState(0);
    useEffect(() => {
      setSettled(false);
      const timer = window.setTimeout(() => setSettled(true), 3500);
      return () => window.clearTimeout(timer);
    }, [compState.size, status.loadedCount, status.errorCount, status.noneCount, status.loadingCount]);

    const nothing   = (allReported || settled) && !anyLoading && !anyData && compState.size > 0;
    const allErrored = nothing && status.errorCount > 0 && status.noneCount === 0;
    // Before any section has data and before we've settled into an empty/error verdict, show one loader
    // instead of a blank page (sections report 'none' while fetching, so a plain "any loading?" is false).
    const initialLoading = !anyData && !nothing;

  return (
    <div className={styles.mainContainer}>
      {/* The title ALWAYS renders and is deliberately NOT part of the content aggregate — it always has
          "data", so counting it kept anyData permanently true and suppressed the loader/empty/error state
          (a region-blocked page then showed a title over a blank body). It also stays outside the `nonce`
          Fragment so a retry doesn't remount it. */}
      <QuizPageTitle />

      {initialLoading && (
        <div className={styles.aggregateState}><LoadingView /></div>
      )}

      {nothing && (
        allErrored
          ? <div className={styles.aggregateState}>
              <ErrorView text={t('region_blocked_or_error')} buttonText={t('try_again')}
                         onButtonClick={() => { resetComponentState(); setSettled(false); setNonce(n => n + 1); }} />
            </div>
          : <div className={styles.aggregateState}>
              <NoResultsView text={t('quiz_none_or_region')} buttonText={null} onButtonClick={null} />
            </div>
      )}

      {/* Content sections stay mounted (they fetch on visibility); the aggregate above is purely additive
          and disappears the instant any section reports data. `nonce` remounts them on retry. */}
      <Fragment key={nonce}>
      <ActiveQuizTopic onStateChange={(state) => handleStateChange('activeQuizTopic', state)} />

      <PublicQuizTopics onStateChange={(state) => handleStateChange('creatorPublicQuizTopics', state)} pType={'creator'} />

      <PublicQuizTopics onStateChange={(state) => handleStateChange('personalizedPublicQuizTopics', state)} pType={'personalized'} />

      <PublicQuizTopics onStateChange={(state) => handleStateChange('publicPublicQuizTopics', state)} pType={'public'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('creatorAvailableQuizTopics', state)} pType={'creator'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('personalizedAvailableQuizTopics', state)} pType={'personalized'} />

      <AvailableQuizTopics onStateChange={(state) => handleStateChange('publicAvailableQuizTopics', state)} pType={'public'} />
      </Fragment>

    </div>
  );
}