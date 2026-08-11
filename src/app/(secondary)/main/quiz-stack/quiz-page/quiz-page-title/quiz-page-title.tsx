'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-page-title.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { BottomViewer, useBottomController } from "@academix-admin/bottom-viewer";
import DialogCancel from '@/components/DialogCancel';
import { TextInput } from '@academix-admin/forms';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserDisplayQuizTopicModel, BackendUserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import dynamic from 'next/dynamic';
import { useNav, useProvideObject } from "@academix-admin/navigation-stack";
import { Header } from '@academix-admin/header';
import { SearchViewer, Row, Column, useSearchController } from '@academix-admin/search-viewer';
import type { SearchResult } from '@academix-admin/search-viewer';
import { PaginateModel } from '@/models/paginate-model';
import { useActiveQuiz } from '@/lib/stacks/active-quiz-stack';
import { usePublicQuiz } from '@/lib/stacks/public-quiz-stack';
import { useAvailableQuiz } from '@/lib/stacks/available-quiz-stack';
import { OpenQuizCard } from '../public-quiz-topics/public-quiz-topics';
import { TopicCard } from '../available-quiz-topics/available-quiz-topics';
import LoadingView from '@/components/LoadingView/LoadingView';
import ErrorView from '@/components/ErrorView/ErrorView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';

function getInitials(text: string): string {
  if (!text) return '?';
  return text.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('');
}

function formatQuizDate(dateString: string): string {
  const date = new Date(dateString);
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions).toLowerCase().replace(' ', '')}`;
}

function createSubgroups<T>(list: T[], subgroupLength: number): T[][] {
  const result: T[][] = [];
  const totalGroups = Math.ceil(list.length / subgroupLength);
  for (let i = 0; i < totalGroups; i++) {
    result.push(list.slice(i * subgroupLength, Math.min((i + 1) * subgroupLength, list.length)));
  }
  return result;
}

// Same match fields as every other SearchViewer's onInitialData in this codebase (topic name /
// pool code / challenge name).
function filterLocalQuizzes(list: UserDisplayQuizTopicModel[], text: string): UserDisplayQuizTopicModel[] {
  if (!text) return list;
  const q = text.toLowerCase();
  return list.filter(
    (m) =>
      m.topicsIdentity?.toLowerCase().includes(q) ||
      m.quizPool?.poolsCode?.toLowerCase().includes(q) ||
      m.quizPool?.challengeModel?.challengeIdentity?.toLowerCase().includes(q),
  );
}

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then(mod => ({ default: mod.Scanner })), { ssr: false });

export default function QuizPageTitle({ onStateChange }: ComponentStateProps) {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const [bottomViewerId, bottomController, bottomIsOpen] = useBottomController();
  const [scannedQuizPool, setScannedQuizPool] = useState<UserDisplayQuizTopicModel | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const nav = useNav();
  const { userData } = useUserData();

  // ── Search across quiz topics (SearchViewer: 6 independently-paginating Rows, one per
  //    PublicQuizTopics/AvailableQuizTopics section, aggregated by a Column) ──────────────────
  const [searchId, searchOps, isSearchOpen] = useSearchController();
  const [activeQuiz] = useActiveQuiz(lang);

  // Already-loaded lists (shared demand-state, same source each section's own page component reads)
  // → instant local-cache first paint, exactly like every other SearchViewer's onInitialData.
  const [creatorPublicQuizzes] = usePublicQuiz(lang, 'creator');
  const [personalizedPublicQuizzes] = usePublicQuiz(lang, 'personalized');
  const [publicPublicQuizzes] = usePublicQuiz(lang, 'public');
  const [creatorAvailableQuizzes] = useAvailableQuiz(lang, 'creator');
  const [personalizedAvailableQuizzes] = useAvailableQuiz(lang, 'personalized');
  const [publicAvailableQuizzes] = useAvailableQuiz(lang, 'public');

  const queryPublicQuizzes = useCallback(
    (pType: string) =>
      async (cursor: PaginateModel | undefined, text: string): Promise<{ data: UserDisplayQuizTopicModel[]; cursor?: PaginateModel }> => {
        const after = cursor ?? new PaginateModel();
        const { data, error } = await supabaseBrowser.rpc('fetch_public_quizzes', {
          p_locale: lang,
          p_type: pType,
          p_limit_by: 20,
          p_after_quiz_topics: after.toJson(),
          p_search_key: text || null,
        });
        if (error || !data) return { data: [] };
        const rows = (data as BackendUserDisplayQuizTopicModel[]).map((r) => new UserDisplayQuizTopicModel(r));
        const last = rows[rows.length - 1];
        return { data: rows, cursor: last ? new PaginateModel({ sortId: last.sortCreatedId }) : undefined };
      },
    [lang],
  );

  const queryAvailableQuizzes = useCallback(
    (pType: string) =>
      async (cursor: PaginateModel | undefined, text: string): Promise<{ data: UserDisplayQuizTopicModel[]; cursor?: PaginateModel }> => {
        const after = cursor ?? new PaginateModel();
        const { data, error } = await supabaseBrowser.rpc('fetch_available_quizzes', {
          p_locale: lang,
          p_type: pType,
          p_limit_by: 20,
          p_after_quiz_topics: after.toJson(),
          p_search_key: text || null,
        });
        if (error || !data) return { data: [] };
        const rows = (data as BackendUserDisplayQuizTopicModel[]).map((r) => new UserDisplayQuizTopicModel(r));
        const last = rows[rows.length - 1];
        return { data: rows, cursor: last ? new PaginateModel({ sortId: last.sortCreatedId }) : undefined };
      },
    [lang],
  );

  // Mirrors PublicQuizTopics's own handleTopicClick — no activeQuiz guard there either.
  const handlePublicResultClick = useCallback(
    (topic: UserDisplayQuizTopicModel, pType: string) => {
      nav.provideObject(
        'getQuizByPoolsId',
        () => (poolsId: string) => (poolsId === topic.quizPool?.poolsId ? topic : undefined),
        { global: true, scope: 'quiz-topics' },
      );
      nav.push('quiz_commitment', { poolsId: topic.quizPool?.poolsId, action: pType });
      searchOps.close();
    },
    [nav, searchOps],
  );

  // Mirrors AvailableQuizTopics's own handleTopicClick, guard included.
  const handleAvailableResultClick = useCallback(
    (topic: UserDisplayQuizTopicModel, pType: string) => {
      if (activeQuiz) return;
      nav.provideObject(
        'getQuizByTopicsId',
        () => (topicsId: string) => (topicsId === topic.topicsId ? topic : undefined),
        { global: true, scope: 'quiz-topics' },
      );
      nav.push('quiz_challenge', { topicsId: topic.topicsId, pType });
      searchOps.close();
    },
    [nav, searchOps, activeQuiz],
  );

  const searchIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );

  useEffect(() => {
    if (!userData?.usersId) return;
    
    const fetchActivationStatus = async () => {
      try {
        // No p_user_id — forced to auth.uid() server-side (see roles-page for the reasoning).
        const { data, error } = await supabaseBrowser.rpc("fetch_user_activation_status", {});

        if (error) {
          console.error("[QuizPageTitle] activation status error:", error);
          return;
        }

        setIsActivated(data === true);
      } catch (err) {
        console.error("[QuizPageTitle] fetch error:", err);
      }
    };

    fetchActivationStatus();
  }, [userData?.usersId]);
  useEffect(() => {
    if (!scannedQuizPool) return;
    nav.provideObject(
      'getActiveQuiz',
      () => scannedQuizPool,
      { global: true, scope: 'quiz-topics' }
    );

    nav.provideObject(
      'getCodeQuiz',
      () => scannedQuizPool,
      { global: true, scope: 'quiz-topics' }
    );
  }, [scannedQuizPool, nav]);

  const handleDisplayClose = () => {
    bottomController.close();
  };

  useEffect(() => {
    onStateChange?.("data");
  }, []);

  const handleQuizClick = () => {
    // Academix Engine: open the role-gated contribution hub (server enforces via assert_can_contribute).
    nav.push('contribution_page');
  };

  const handleAddClick = () => {
    bottomController.open();
  };

  const handlePrivateClick = () => {
    console.log('Private quiz icon clicked');
  };

  return (
    <>
      <Header
        variant="title"
        theme={theme}
        title={t('explore_text')}
        description={t('curated_quizzes')}
        actions={[
          {
            icon: (
              <svg width="22" height="22" fill="none" viewBox="0 0 24 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z"
                  fill="currentColor" />
              </svg>
            ),
            onClick: handleQuizClick,
            ariaLabel: 'Create Quiz',
          },
          ...(isActivated
            ? [
                {
                  icon: (
                    <svg width="22" height="22" fill="none" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path clipRule="evenodd" d="M4.77514 0.342973C8.91238 -0.114324 13.0875 -0.114324 17.2248 0.342973C19.5155 0.599286 21.3635 2.40015 21.6323 4.69496C22.1226 8.88407 22.1226 13.1159 21.6323 17.305C21.3635 19.5998 19.5155 21.4007 17.2248 21.657C13.0875 22.1143 8.91238 22.1143 4.77514 21.657C2.48446 21.4007 0.636401 19.5998 0.367617 17.305C-0.122539 13.1164 -0.122539 8.88497 0.367617 4.69629C0.503571 3.58143 1.01267 2.54506 1.81241 1.75516C2.61215 0.965259 3.65565 0.468118 4.7738 0.344308M6.5 6.5C6.5 6.23478 6.60536 5.98043 6.79289 5.79289C6.98043 5.60536 7.23478 5.5 7.5 5.5H12.5C13.163 5.5 13.7989 5.76339 14.2678 6.23223C14.7366 6.70107 15 7.33696 15 8C15 8.66304 14.7366 9.29893 14.2678 9.76777C13.7989 10.2366 13.163 10.5 12.5 10.5H11.5V16.5C11.5 16.7652 11.3946 17.0196 11.2071 17.2071C11.0196 17.3946 10.7652 17.5 10.5 17.5C10.2348 17.5 9.98043 17.3946 9.79289 17.2071C9.60536 17.0196 9.5 16.7652 9.5 16.5V6.5H6.5ZM11.5 8.5V7H12.5C12.7652 7 13.0196 7.10536 13.2071 7.29289C13.3946 7.48043 13.5 7.73478 13.5 8C13.5 8.26522 13.3946 8.51957 13.2071 8.70711C13.0196 8.89464 12.7652 9 12.5 9H11.5V8.5Z"
                        fill="currentColor"
                        fillRule="evenodd" />
                    </svg>
                  ),
                  onClick: handlePrivateClick,
                  ariaLabel: 'Private quiz',
                },
                {
                  icon: (
                    <svg width="22" height="22" fill="none" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path clipRule="evenodd" d="M4.77514 0.342973C8.91238 -0.114324 13.0875 -0.114324 17.2248 0.342973C19.5155 0.599286 21.3635 2.40015 21.6323 4.69496C22.1226 8.88407 22.1226 13.1159 21.6323 17.305C21.3635 19.5998 19.5155 21.4007 17.2248 21.657C13.0875 22.1143 8.91238 22.1143 4.77514 21.657C2.48446 21.4007 0.636401 19.5998 0.367617 17.305C-0.122539 13.1164 -0.122539 8.88497 0.367617 4.69629C0.503571 3.58143 1.01267 2.54506 1.81241 1.75516C2.61215 0.965259 3.65565 0.468118 4.7738 0.344308M11 4.33452C11.266 4.33452 11.5211 4.44 11.7091 4.62777C11.8972 4.81554 12.0029 5.0702 12.0029 5.33574V9.99878H16.6738C16.9398 9.99878 17.1949 10.1043 17.383 10.292C17.5711 10.4798 17.6768 10.7345 17.6768 11C17.6768 11.2655 17.5711 11.5202 17.383 11.708C17.1949 11.8957 16.9398 12.0012 16.6738 12.0012H12.0029V16.6643C12.0029 16.9298 11.8972 17.1845 11.7091 17.3722C11.5211 17.56 11.266 17.6655 11 17.6655C10.734 17.6655 10.4789 17.56 10.2908 17.3722C10.1027 17.1845 9.99704 16.9298 9.99704 16.6643V12.0012H5.32608C5.06009 12.0012 4.80499 11.8957 4.6169 11.708C4.42882 11.5202 4.32315 11.2655 4.32315 11C4.32315 10.7345 4.42882 10.4798 4.6169 10.292C4.80499 10.1043 5.06009 9.99878 5.32608 9.99878H9.99704V5.33574C9.99704 5.0702 10.1027 4.81554 10.2908 4.62777C10.4789 4.44 10.734 4.33452 11 4.33452Z"
                        fill="currentColor"
                        fillRule="evenodd" />
                    </svg>
                  ),
                  onClick: handleAddClick,
                  ariaLabel: 'Add quiz',
                },
              ]
            : []),
          // Search sits at the END of the icon list on the quiz page.
          {
            icon: searchIcon,
            onClick: searchOps.open,
            ariaLabel: t('search_text'),
          },
        ]}
      />

      <BottomViewer
        id={bottomViewerId}
        isOpen={bottomIsOpen}
        onClose={handleDisplayClose}
        cancelButton={{
          position: "right",
          onClick: handleDisplayClose,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
          maxWidth: '800px',
          maxHeight: '90dvh',
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <QuizJoinContent theme={theme} t={t} onClose={handleDisplayClose} scannedQuizPool={scannedQuizPool} setScannedQuizPool={setScannedQuizPool} />
      </BottomViewer>

      <SearchViewer
        id={searchId}
        isOpen={isSearchOpen}
        onClose={searchOps.close}
        debounceMs={350}
        searchProp={{
          text: t('search_text'),
          textColor: theme === 'light' ? '#000' : '#fff',
          autoFocus: true,
          background: theme === 'light' ? '#f5f5f5' : '#272727',
          padding: { l: '4px', r: '4px', t: '0px', b: '0px' },
        }}
        loadingProp={{ view: <LoadingView text={t('loading')} /> }}
        noResultProp={{ view: <NoResultsView text={t('no_result_text')} /> }}
        errorProp={{ view: <ErrorView text={t('error_occurred')} /> }}
        layoutProp={{
          gapBetweenSearchAndContent: '12px',
          searchBackground: theme === 'light' ? '#fff' : '#121212',
          maxWidth: '800px',
        }}
        childrenDirection="vertical"
      >
        <Column>
          <QuizSearchSection
            title={t('followed_creator')}
            theme={theme}
            onInitialData={(text) => filterLocalQuizzes(creatorPublicQuizzes, text)}
            localDataDeps={[creatorPublicQuizzes]}
            queryData={queryPublicQuizzes('creator')}
            renderResults={(results) => (
              <div className={styles.searchRow}>
                {results.map((topic) => (
                  <OpenQuizCard
                    key={topic.topicsId}
                    topic={topic}
                    length={results.length}
                    getInitials={getInitials}
                    onClick={() => handlePublicResultClick(topic, 'creator')}
                  />
                ))}
              </div>
            )}
          />
          <QuizSearchSection
            title={t('discovered_interest')}
            theme={theme}
            onInitialData={(text) => filterLocalQuizzes(personalizedPublicQuizzes, text)}
            localDataDeps={[personalizedPublicQuizzes]}
            queryData={queryPublicQuizzes('personalized')}
            renderResults={(results) => (
              <div className={styles.searchRow}>
                {results.map((topic) => (
                  <OpenQuizCard
                    key={topic.topicsId}
                    topic={topic}
                    length={results.length}
                    getInitials={getInitials}
                    onClick={() => handlePublicResultClick(topic, 'personalized')}
                  />
                ))}
              </div>
            )}
          />
          <QuizSearchSection
            title={t('active_suggestions')}
            theme={theme}
            onInitialData={(text) => filterLocalQuizzes(publicPublicQuizzes, text)}
            localDataDeps={[publicPublicQuizzes]}
            queryData={queryPublicQuizzes('public')}
            renderResults={(results) => (
              <div className={styles.searchRow}>
                {results.map((topic) => (
                  <OpenQuizCard
                    key={topic.topicsId}
                    topic={topic}
                    length={results.length}
                    getInitials={getInitials}
                    onClick={() => handlePublicResultClick(topic, 'public')}
                  />
                ))}
              </div>
            )}
          />
          <QuizSearchSection
            title={t('favourite_contributors')}
            theme={theme}
            onInitialData={(text) => filterLocalQuizzes(creatorAvailableQuizzes, text)}
            localDataDeps={[creatorAvailableQuizzes]}
            queryData={queryAvailableQuizzes('creator')}
            renderResults={(results) => (
              <div className={styles.searchRow}>
                {createSubgroups(results, 2).map((pair, i) => (
                  <div className={styles.searchColumn} key={i}>
                    {pair.map((topic) => (
                      <TopicCard
                        key={topic.topicsId}
                        topic={topic}
                        theme={theme}
                        getInitials={getInitials}
                        formatDate={formatQuizDate}
                        onClick={() => handleAvailableResultClick(topic, 'creator')}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          />
          <QuizSearchSection
            title={t('just_for_you')}
            theme={theme}
            onInitialData={(text) => filterLocalQuizzes(personalizedAvailableQuizzes, text)}
            localDataDeps={[personalizedAvailableQuizzes]}
            queryData={queryAvailableQuizzes('personalized')}
            renderResults={(results) => (
              <div className={styles.searchRow}>
                {createSubgroups(results, 2).map((pair, i) => (
                  <div className={styles.searchColumn} key={i}>
                    {pair.map((topic) => (
                      <TopicCard
                        key={topic.topicsId}
                        topic={topic}
                        theme={theme}
                        getInitials={getInitials}
                        formatDate={formatQuizDate}
                        onClick={() => handleAvailableResultClick(topic, 'personalized')}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          />
          <QuizSearchSection
            title={t('might_interest_you')}
            theme={theme}
            onInitialData={(text) => filterLocalQuizzes(publicAvailableQuizzes, text)}
            localDataDeps={[publicAvailableQuizzes]}
            queryData={queryAvailableQuizzes('public')}
            renderResults={(results) => (
              <div className={styles.searchRow}>
                {createSubgroups(results, 2).map((pair, i) => (
                  <div className={styles.searchColumn} key={i}>
                    {pair.map((topic) => (
                      <TopicCard
                        key={topic.topicsId}
                        topic={topic}
                        theme={theme}
                        getInitials={getInitials}
                        formatDate={formatQuizDate}
                        onClick={() => handleAvailableResultClick(topic, 'public')}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          />
        </Column>
      </SearchViewer>
    </>
  );
}

// One titled, independently-paginating horizontal shelf inside the search Column — mirrors
// PublicQuizTopics/AvailableQuizTopics's own section title, one per pType. Results render with the
// EXACT same card component the normal (non-search) page uses for that section (OpenQuizCard /
// TopicCard) via `renderResults`, so the search UI is never a different look from the real list.
// Stays hidden (but mounted, so its Row keeps searching/reporting state) until it actually has
// results, so an empty section never shows a bare title with nothing under it.
function QuizSearchSection({
  title,
  theme,
  onInitialData,
  localDataDeps,
  queryData,
  renderResults,
}: {
  title: string;
  theme: string;
  onInitialData: (text: string) => UserDisplayQuizTopicModel[];
  localDataDeps: React.DependencyList;
  queryData: (cursor: PaginateModel | undefined, text: string, signal?: AbortSignal) => Promise<{ data: UserDisplayQuizTopicModel[]; cursor?: PaginateModel }>;
  renderResults: (results: UserDisplayQuizTopicModel[]) => React.ReactNode;
}) {
  const [results, setResults] = useState<SearchResult<UserDisplayQuizTopicModel>[]>([]);
  const hasResults = results.length > 0;

  return (
    // 16px horizontal padding to align with the search bar's own 16px margin (search-viewer's
    // `.search-viewer-search` CSS) -- the same convention every other SearchViewer in this codebase
    // applies to its result items (e.g. rewards-friends.tsx's `padding: '0 16px'`).
    <div style={{ display: hasResults ? undefined : 'none', padding: '0 16px' }}>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: theme === 'light' ? '#111' : '#f0f0f0',
          padding: '4px 0 0',
        }}
      >
        {title}
      </div>
      <Row<UserDisplayQuizTopicModel, PaginateModel>
        onInitialData={onInitialData}
        localDataDeps={localDataDeps}
        queryData={queryData}
        onRemoveDuplicateBy={(m) => m.topicsId}
        onResult={setResults}
      >
        {({ results }) => renderResults(results.map((r) => r.data))}
      </Row>
    </div>
  );
}

function QuizJoinContent({ theme, t, onClose, scannedQuizPool, setScannedQuizPool }: {
  theme: string;
  t: any;
  onClose: () => void;
  scannedQuizPool: UserDisplayQuizTopicModel | null;
  setScannedQuizPool: (quiz: UserDisplayQuizTopicModel | null) => void;
}) {
  const { applyTheme } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { userData } = useUserData();
  const { lang } = useLanguage();
  const nav = useNav();

  const handleCodeSubmit = async (submittedCode: string) => {
    if (!userData || !submittedCode || submittedCode.length === 0) return;

    setLoading(true);
    setError(false);

    try {

      const { data, error: rpcError } = await supabaseBrowser.rpc("get_public_auth_quiz_pool", {
        p_locale: lang ?? "",
        p_pool_auth_code: submittedCode.toUpperCase()
      });

      if (rpcError || data?.error) {
        setError(true);
        setCode('');
        return;
      }

      if (data?.status && data?.quiz_pool) {
        const quizPool = new UserDisplayQuizTopicModel(data.quiz_pool);
        const memberStatus = data?.is_member === true;

        setScannedQuizPool(quizPool);

        nav.push('quiz_commitment', {
          poolsId: quizPool?.quizPool?.poolsId,
          action: memberStatus ? 'active' : 'code'
        });
        onClose();
      } else {
        setError(true);
        setCode('');
      }
    } catch (err) {
      console.error('Error submitting code:', err);
      setError(true);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && code.length > 0) {
      handleCodeSubmit(code);
    }
  };

  const handleScanResult = (result: any) => {
    if (result?.[0]?.rawValue) {
      handleCodeSubmit(result[0].rawValue);
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner error:', err);
  };

  useEffect(() => {
    if (code.length === 9) {
      handleCodeSubmit(code);
    }
  }, [code]);

  return (
    <div className={`${applyTheme(styles, 'joinContainer')}`}>
      <div className={`${applyTheme(styles, 'joinHeader')}`}>
        <h2 className={`${applyTheme(styles, 'joinTitle')}`}>
          {t('join_quiz_pool')}
        </h2>
      </div>

      {loading && (
        <div className={styles.joinContent}>
          <div className={`${applyTheme(styles, 'loadingText')}`}>{t('loading')}</div>
        </div>
      )}

      {error && (
        <div className={styles.errorContainer}>
          <p className={`${applyTheme(styles, 'errorText')}`}>{t('no_result_text')}</p>
          <button onClick={() => setError(false)} className={`${applyTheme(styles, 'errorButton')}`}>
            {t('continue')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={styles.joinContent}>
            {activeTab === 0 ? (
              <div className={styles.cameraContainer}>
                <div className={`${applyTheme(styles, 'cameraBox')}`}>
                  {Scanner && (
                    <Scanner
                      onScan={handleScanResult}
                      onError={handleError}
                      styles={{
                        container: { width: '100%', height: '100%' }
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.codeContainer}>
                <div className={`${applyTheme(styles, 'codeLabel')}`}>
                  {t('code_placeholder')}
                </div>
                <TextInput
                  value={code}
                  onChange={(v) => setCode(v)}
                  onKeyPress={handleKeyPress}
                  transform="uppercase"
                  maxLength={9}
                  hint="XXXXXXXXX"
                  autoFocus
                  counter
                  classNames={{
                    root: styles.textInputRoot,
                    field: styles.codeInputWrapper,
                    input: applyTheme(styles, 'codeInput'),
                    counter: applyTheme(styles, 'codeCounter'),
                  }}
                />
              </div>
            )}
          </div>

          <div className={`${applyTheme(styles, 'tabSwitcher')}`}>
            <div className={`${applyTheme(styles, 'tabContainer')}`}>
              <button
                onClick={() => setActiveTab(0)}
                className={`${applyTheme(styles, 'tabButton')} ${activeTab === 0 ? applyTheme(styles, 'tabButton_active') : styles.tabButton_inactive}`}
              >
                {t('qr_code')}
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`${applyTheme(styles, 'tabButton')} ${activeTab === 1 ? applyTheme(styles, 'tabButton_active') : styles.tabButton_inactive}`}
              >
                {t('enter_text')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
