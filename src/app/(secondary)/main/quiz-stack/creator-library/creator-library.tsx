'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './creator-library.module.css';
import { useNav, Scaffold, useInfiniteScrollObserver } from '@academix-admin/navigation-stack';
import { useDemandState } from '@academix-admin/state-stack';
import { useDialog } from '@academix-admin/dialog-viewer';
import { SearchViewer, Row, Column, useSearchController } from '@academix-admin/search-viewer';
import type { SearchResult } from '@academix-admin/search-viewer';
import { Header } from '@academix-admin/header';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import LoadingView from '@/components/LoadingView/LoadingView';
import ErrorView from '@/components/ErrorView/ErrorView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import { PaginateModel } from '@/models/paginate-model';
import {
  UserQuizCreatorCategoryModel,
  BackendCreatorCategoryRow,
} from '@/models/user-quiz-creator-category-model';
import { capitalizeWords, pluralize } from '@/utils/textUtils';

// Same 6-color cycle as Flutter's AcademixMoreQuizCategoryCard / AcademixLessQuizCategoryCard palette.
const CATEGORY_CARD_COLORS = ['#4A401C', '#4A1D24', '#1C374A', '#361C4B', '#1C4A2D', '#374A1C'];
function cardColor(index: number): string {
  return CATEGORY_CARD_COLORS[index % CATEGORY_CARD_COLORS.length];
}

function formatRelativeTime(dateString: string): string {
  const then = new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const steps: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
  ];
  let value = diffSec;
  let unit = 'year';
  for (const [amount, name] of steps) {
    if (value < amount) { unit = name; break; }
    value = Math.floor(value / amount);
  }
  if (unit === 'second' && value < 5) return 'just now';
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

/**
 * Creator / reviewer library (Academix Engine web surface — port of Flutter
 * user_quiz_creator_library_screen / user_quiz_reviewer_library_screen). Reached from the role dashboard
 * (contribution-page); owns its OWN Scaffold. Reads `fetch_categories` (identity + demographics derived
 * server-side, §2.5 — the client sends no p_user_id/p_country/p_gender/p_age).
 *
 * creator  → Recents (with the "New" add button, à la Flutter recentNewWidget) + Favourite + Private card
 *            strips + a paginated Public list.
 * reviewer → the review queue list (needs reviewerTab).
 */
type CreatorLibraryProps = {
  pType?: string;
  reviewerTab?: string | null;
};

async function fetchCategories(
  lang: string,
  pType: string,
  limitBy: number,
  after: PaginateModel,
  reviewerTab?: string | null,
): Promise<UserQuizCreatorCategoryModel[]> {
  const { data, error } = await supabaseBrowser.rpc('fetch_categories', {
    p_locale: lang,
    p_type: pType,
    p_limit_by: limitBy,
    p_after_categories: after.toJson(),
    ...(reviewerTab ? { p_reviewer_tab: reviewerTab } : {}),
  });
  if (error) {
    console.error(`[CreatorLibrary:${pType}] fetch_categories error:`, error);
    throw error;
  }
  return (data || []).map((row: BackendCreatorCategoryRow) => new UserQuizCreatorCategoryModel(row));
}

function nextSortId(list: UserQuizCreatorCategoryModel[], pType: string): string | null {
  if (list.length === 0) return null;
  const last = list[list.length - 1];
  // creator/reviewer paginate on sort_updated_id; private on sort_created_id (mirrors fetch_categories)
  return pType === 'private' ? last.sortCreatedId : last.sortUpdatedId;
}

function getInitials(text: string): string {
  if (!text) return '?';
  return text.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('');
}

export default function CreatorLibrary({ pType = 'creator', reviewerTab = null }: CreatorLibraryProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const dialog = useDialog();

  const isReviewer = pType === 'reviewer';
  const title = isReviewer ? t('review_text') : t('library_text');
  const searchType = isReviewer ? 'reviewer' : 'creator';

  const [searchId, searchOps, isSearchOpen] = useSearchController();
  const [searchResults, setSearchResults] = useState<SearchResult<UserQuizCreatorCategoryModel>[]>([]);
  // Read the already-loaded list (shared demand-state) so search can filter it locally, instantly.
  // Reviewer-only (creator mode uses the three per-section caches below instead).
  const [loadedItems] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: `lib_list_${searchType}`,
    persist: true,
    scope: 'secondary_flow',
    deps: [lang, reviewerTab ?? ''],
  });

  // Server search (fetch_categories now takes p_search_key; matches the category name). Cursor = PaginateModel.
  // Reviewer-only.
  const queryCategories = useCallback(
    async (cursor: PaginateModel | undefined, text: string): Promise<{ data: UserQuizCreatorCategoryModel[]; cursor?: PaginateModel }> => {
      const after = cursor ?? new PaginateModel();
      const { data, error } = await supabaseBrowser.rpc('fetch_categories', {
        p_locale: lang,
        p_type: searchType,
        p_limit_by: 20,
        p_after_categories: after.toJson(),
        p_search_key: text || null,
        ...(reviewerTab ? { p_reviewer_tab: reviewerTab } : {}),
      });
      if (error || !data) return { data: [] };
      const rows = (data as BackendCreatorCategoryRow[]).map((r) => new UserQuizCreatorCategoryModel(r));
      const last = rows[rows.length - 1];
      const nextSort = last ? nextSortId(rows, searchType) : null;
      return { data: rows, cursor: nextSort ? new PaginateModel({ sortId: nextSort }) : undefined };
    },
    [lang, searchType, reviewerTab],
  );

  // ── Creator-mode search: 3 independently-paginating horizontal Rows (Favourite/Private/Public),
  //    aggregated by a Column — same pattern as quiz-page-title.tsx. Each Row reuses the SAME
  //    demand-state cache key its normal-page section already reads (instant local paint) plus a
  //    server query against the same pType.
  const [favouriteCache] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: 'lib_strip_favourite', persist: true, scope: 'secondary_flow', deps: [lang],
  });
  const [privateCache] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: 'lib_strip_private', persist: true, scope: 'secondary_flow', deps: [lang],
  });
  const [publicCache] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: 'lib_list_creator', persist: true, scope: 'secondary_flow', deps: [lang, ''],
  });

  const filterLocalCategories = (list: UserQuizCreatorCategoryModel[], text: string) => {
    if (!text) return list;
    const q = text.toLowerCase();
    return list.filter((c) => c.topicCategoryIdentity.toLowerCase().includes(q));
  };

  const queryCategoriesByType = useCallback(
    (categoryPType: string) =>
      async (cursor: PaginateModel | undefined, text: string): Promise<{ data: UserQuizCreatorCategoryModel[]; cursor?: PaginateModel }> => {
        const after = cursor ?? new PaginateModel();
        const { data, error } = await supabaseBrowser.rpc('fetch_categories', {
          p_locale: lang,
          p_type: categoryPType,
          p_limit_by: 20,
          p_after_categories: after.toJson(),
          p_search_key: text || null,
        });
        if (error || !data) return { data: [] };
        const rows = (data as BackendCreatorCategoryRow[]).map((r) => new UserQuizCreatorCategoryModel(r));
        const last = rows[rows.length - 1];
        const nextSort = last ? nextSortId(rows, categoryPType) : null;
        return { data: rows, cursor: nextSort ? new PaginateModel({ sortId: nextSort }) : undefined };
      },
    [lang],
  );

  // Authoring (create category) is Phase 2 — surface a clear notice for now (Flutter opens categoryAddition).
  const onNew = () =>
    dialog.open(
      <div className={styles.dialog}>
        <p className={styles.dialogTitle}>{t('create_public_text')}</p>
        <p className={styles.dialogSub}>{t('coming_soon_text')}</p>
        <button className={styles.dialogBtn} onClick={() => dialog.close()}>{t('ok_text')}</button>
      </div>,
    );

  const searchIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );

  return (
    <>
      <Scaffold
        bodyClassName={theme === 'dark' ? styles.container_dark : styles.container_light}
        appBar={
          <Header
            title={title}
            theme={theme}
            onBack={() => nav.pop()}
            position="static"
            actions={[{ icon: searchIcon, onClick: searchOps.open, ariaLabel: t('search_text') }]}
          />
        }
      >
        <div className={styles.content}>
          {isReviewer ? (
            <CategoryList pType="reviewer" reviewerTab={reviewerTab} standalone />
          ) : (
            <>
              <RecentStrip onNew={onNew} />
              <CardStrip pType="favourite" title={t('favourite_text')} />
              <CardStrip pType="private" title={t('private_text')} />
              <PublicSection />
            </>
          )}
        </div>
      </Scaffold>

      {isReviewer ? (
        <SearchViewer<UserQuizCreatorCategoryModel, PaginateModel>
          id={searchId}
          isOpen={isSearchOpen}
          onClose={searchOps.close}
          debounceMs={350}
          minQueryLength={1}
          onInitialData={(text) => {
            if (!text) return loadedItems;
            const q = text.toLowerCase();
            return loadedItems.filter((c) => c.topicCategoryIdentity.toLowerCase().includes(q));
          }}
          localDataDeps={[loadedItems]}
          queryData={queryCategories}
          onRemoveDuplicateBy={(c) => c.topicCategoryId}
          onResult={setSearchResults}
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
          {searchResults.map((r) => (
            <div key={r.data.topicCategoryId} style={{ padding: '0 12px' }}>
              <CompactCategoryCard category={r.data} onClick={() => {}} />
            </div>
          ))}
        </SearchViewer>
      ) : (
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
            <LibrarySearchSection
              title={t('favourite_text')}
              theme={theme}
              onInitialData={(text) => filterLocalCategories(favouriteCache, text)}
              localDataDeps={[favouriteCache]}
              queryData={queryCategoriesByType('favourite')}
            />
            <LibrarySearchSection
              title={t('private_text')}
              theme={theme}
              onInitialData={(text) => filterLocalCategories(privateCache, text)}
              localDataDeps={[privateCache]}
              queryData={queryCategoriesByType('private')}
            />
            <LibrarySearchSection
              title={t('public_text')}
              theme={theme}
              onInitialData={(text) => filterLocalCategories(publicCache, text)}
              localDataDeps={[publicCache]}
              queryData={queryCategoriesByType('creator')}
            />
          </Column>
        </SearchViewer>
      )}
    </>
  );
}

// One titled, independently-paginating horizontal Row inside the search Column — mirrors
// quiz-page-title.tsx's QuizSearchSection. Results render with the same WideCategoryCard the
// normal page uses (Flutter has no separate compact-search mode; a search Row is always a
// horizontal shelf). Stays hidden (but mounted, so its Row keeps searching/reporting state) until
// it actually has results.
function LibrarySearchSection({
  title,
  theme,
  onInitialData,
  localDataDeps,
  queryData,
}: {
  title: string;
  theme: string;
  onInitialData: (text: string) => UserQuizCreatorCategoryModel[];
  localDataDeps: React.DependencyList;
  queryData: (cursor: PaginateModel | undefined, text: string, signal?: AbortSignal) => Promise<{ data: UserQuizCreatorCategoryModel[]; cursor?: PaginateModel }>;
}) {
  const [results, setResults] = useState<SearchResult<UserQuizCreatorCategoryModel>[]>([]);
  const hasResults = results.length > 0;

  return (
    <div style={{ display: hasResults ? undefined : 'none', padding: '0 16px' }}>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: theme === 'light' ? '#111' : '#f0f0f0',
          padding: '4px 0 0',
        }}
      >
        {title}
      </div>
      <Row<UserQuizCreatorCategoryModel, PaginateModel>
        onInitialData={onInitialData}
        localDataDeps={localDataDeps}
        queryData={queryData}
        onRemoveDuplicateBy={(c) => c.topicCategoryId}
        onResult={setResults}
      >
        {({ results }) => results.map((r, index) => (
          <WideCategoryCard key={r.data.topicCategoryId} category={r.data} color={cardColor(index)} onClick={() => {}} />
        ))}
      </Row>
    </div>
  );
}

/* ---------------- section header ---------------- */
function SectionHead({ title, more }: { title: string; more?: boolean }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.sectionTitle}>{title}</span>
      {more && (
        <span className={styles.sectionMore} aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </span>
      )}
    </div>
  );
}

/* ---------------- Recents strip (circular avatars + New add button) ---------------- */
function RecentStrip({ onNew }: { onNew: () => void }) {
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const [items, demandItems] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: 'lib_strip_recent',
    persist: true,
    scope: 'secondary_flow',
    deps: [lang],
  });

  useEffect(() => {
    if (!userData) return;
    demandItems(async ({ set }) => {
      try { set(await fetchCategories(lang, 'recent', 10, new PaginateModel())); } catch { set([]); }
    });
  }, [demandItems, userData, lang]);

  return (
    <section>
      <SectionHead title={t('recents_text')} more={items.length >= 9} />
      <div className={styles.strip}>
        {/* New: create a category (Flutter recentNewWidget) */}
        <button className={styles.recentItem} onClick={onNew}>
          <span className={`${styles.recentCircle} ${styles.newCircle}`}>
            {/* Matches Flutter's recentNewWidget icon (AssetsName.categorySvg): triangle + circle + square. */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L15.5 8.5H8.5L12 2Z" />
              <circle cx="7" cy="17.5" r="3.5" />
              <rect x="13.5" y="14" width="7" height="7" rx="1" />
            </svg>
          </span>
          <span className={styles.recentName}>{t('new_text')}</span>
        </button>

        {items.map((cat) => (
          <RecentCard key={cat.topicCategoryId} category={cat} />
        ))}
      </div>
    </section>
  );
}

function RecentCard({ category }: { category: UserQuizCreatorCategoryModel }) {
  const [imgError, setImgError] = useState(false);
  const pending = category.approvalBucket === 'pending';
  return (
    <div className={styles.recentItem} role="button">
      <span className={styles.recentCircle}>
        {category.topicCategoryImageUrl && !imgError ? (
          <Image src={category.topicCategoryImageUrl} alt={category.topicCategoryIdentity} width={64} height={64} onError={() => setImgError(true)} />
        ) : (
          <span className={styles.recentInitials}>{getInitials(category.topicCategoryIdentity)}</span>
        )}
        {pending && <span className={styles.recentPending} aria-label="pending">⏱</span>}
      </span>
      <span className={styles.recentName}>{capitalizeWords(category.topicCategoryIdentity)}</span>
    </div>
  );
}

/* ---------------- Favourite / Private card strips ---------------- */
// Mirrors Flutter's _personalTopicsDisplay: <=2 items -> a vertical stack of CompactCategoryCards;
// >2 items -> a horizontal strip of WideCategoryCards.
function CardStrip({ pType, title }: { pType: string; title: string }) {
  const { lang } = useLanguage();
  const { userData } = useUserData();
  const [items, demandItems] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: `lib_strip_${pType}`,
    persist: true,
    scope: 'secondary_flow',
    deps: [lang],
  });

  useEffect(() => {
    if (!userData) return;
    demandItems(async ({ set }) => {
      try { set(await fetchCategories(lang, pType, 10, new PaginateModel())); } catch { set([]); }
    });
  }, [demandItems, userData, lang, pType]);

  if (items.length === 0) return null;

  return (
    <section>
      <SectionHead title={title} more={items.length >= 9} />
      {items.length <= 2 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((cat) => (
            <CompactCategoryCard key={cat.topicCategoryId} category={cat} onClick={() => {}} />
          ))}
        </div>
      ) : (
        <div className={styles.strip}>
          {items.map((cat, index) => (
            <WideCategoryCard key={cat.topicCategoryId} category={cat} color={cardColor(index)} onClick={() => {}} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Public paginated section ---------------- */
type ViewState = 'loading' | 'data' | 'error' | 'empty';

function PublicSection() {
  const { t } = useLanguage();
  return (
    <section>
      <SectionHead title={t('public_text')} />
      <CategoryList pType="creator" useWideCards />
    </section>
  );
}

function CategoryList({
  pType,
  reviewerTab = null,
  standalone = false,
  useWideCards = false,
}: {
  pType: string;
  reviewerTab?: string | null;
  useWideCards?: boolean;
  standalone?: boolean;
}) {
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const [items, demandItems, setItems] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: `lib_list_${pType}`,
    persist: true,
    scope: 'secondary_flow',
    deps: [lang, reviewerTab ?? ''],
  });

  const PAGE = 20;
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [paginate, setPaginate] = useState<PaginateModel>(new PaginateModel());
  const [paginating, setPaginating] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    (override = false) => {
      demandItems(async ({ set }) => {
        try {
          const list = await fetchCategories(lang, pType, 12, new PaginateModel(), reviewerTab);
          setPaginate(new PaginateModel({ sortId: nextSortId(list, pType) }));
          setHasMore(list.length >= 12); // a short first page means there's nothing more to fetch
          set(list, override ? { override: true } : undefined);
          setViewState(list.length > 0 ? 'data' : 'empty');
        } catch {
          setViewState('error');
        }
      });
    },
    [demandItems, lang, pType, reviewerTab],
  );

  useEffect(() => {
    if (!userData) return;
    load();
  }, [userData, load]);

  useEffect(() => {
    if (items.length > 0) setViewState('data');
  }, [items.length]);

  const loadMore = useCallback(async () => {
    if (paginating || items.length === 0) return;
    setPaginating(true);
    try {
      const more = await fetchCategories(lang, pType, PAGE, paginate, reviewerTab);
      const seen = new Set(items.map((c) => c.topicCategoryId));
      const fresh = more.filter((c) => !seen.has(c.topicCategoryId));
      // Stop when a page brings nothing new or is short — this is what kills the loadMore loop.
      setHasMore(fresh.length > 0 && more.length >= PAGE);
      if (fresh.length > 0) {
        setPaginate(new PaginateModel({ sortId: nextSortId(more, pType) }));
        setItems([...items, ...fresh]);
      }
    } catch {
      /* keep current list on pagination error */
    } finally {
      setPaginating(false);
    }
  }, [paginating, items, paginate, lang, pType, reviewerTab, setItems]);

  // Stable, library-level infinite scroll (drop-in for the loaderRef+IntersectionObserver pattern, but the
  // observer is created once + guarded by hasMore/loading, so it never loops when unchanged/exhausted).
  const sentinelRef = useInfiniteScrollObserver({ onLoadMore: loadMore, hasMore, loading: paginating, rootMargin: '320px' });

  if (viewState === 'loading') return <LoadingView />;
  if (viewState === 'error') return <ErrorView text={t('error_occurred')} buttonText={t('reload_text')} onButtonClick={() => { setViewState('loading'); load(true); }} />;
  if (viewState === 'empty') return standalone ? <NoResultsView text={t('contribute_first')} /> : <p className={styles.emptyInline}>{t('contribute_first')}</p>;

  return (
    <div className={styles.list}>
      {items.map((cat, index) => (
        useWideCards ? (
          <WideCategoryCard key={cat.topicCategoryId} category={cat} color={cardColor(index)} onClick={() => {}} fullWidth />
        ) : (
          <CompactCategoryCard key={cat.topicCategoryId} category={cat} onClick={() => {}} />
        )
      ))}
      {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
      {paginating && <div className={styles.moreSpinner}><span /></div>}
    </div>
  );
}

/* ---------------- cards (match Flutter's AcademixMoreQuizCategoryCard / AcademixLessQuizCategoryCard) ---------------- */

// The rich, themed card — Flutter reuses this for BOTH Favourite/Private (when a section has >2
// items) and, per this port, for the Public section too (it has no distinct "compact" mode of its
// own in Flutter — everything with more than a couple items becomes this card).
function WideCategoryCard({
  category,
  color,
  onClick,
  fullWidth = false,
}: {
  category: UserQuizCreatorCategoryModel;
  color: string;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [userImgError, setUserImgError] = useState(false);
  const pending = category.approvalBucket === 'pending';

  return (
    <div
      className={styles.wideCard}
      style={{ background: color, width: fullWidth ? '100%' : '216px', flex: fullWidth ? undefined : '0 0 auto' }}
      role="button"
      onClick={onClick}
    >
      <div className={styles.wideCardHeader}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
          <rect x="3" y="16" width="18" height="4" rx="1" />
        </svg>
        <span className={styles.wideCardHeaderText}>{t('category_text')}</span>
      </div>

      <div className={styles.wideCardImage}>
        {category.topicCategoryImageUrl && !imgError ? (
          <Image src={category.topicCategoryImageUrl} alt={category.topicCategoryIdentity} fill sizes="220px" style={{ objectFit: 'cover' }} onError={() => setImgError(true)} />
        ) : (
          <span className={styles.wideCardImageInitials}>{getInitials(category.topicCategoryIdentity)}</span>
        )}
      </div>

      {pending ? (
        <div className={styles.wideCardPendingPill}>{t('pending_text')}</div>
      ) : (
        <div className={styles.wideCardPills}>
          <span className={styles.wideCardPill} style={{ background: color }}>
            <span className={styles.wideCardPillInner}>{pluralize(category.topicsCount, t('quiz_text', { count: category.topicsCount }))}</span>
          </span>
          <span className={styles.wideCardPill} style={{ background: color }}>
            <span className={styles.wideCardPillInner}>{pluralize(category.questionsCount, t('question_text', { count: category.questionsCount }))}</span>
          </span>
        </div>
      )}

      <div className={styles.wideCardTitle}>{capitalizeWords(category.topicCategoryIdentity)}</div>

      <div className={styles.wideCardFooter}>
        <div className={styles.wideCardFooterAvatar}>
          {category.userImageUrl && !userImgError ? (
            <Image src={category.userImageUrl} alt={category.fullNameText} fill sizes="34px" style={{ objectFit: 'cover' }} onError={() => setUserImgError(true)} />
          ) : (
            <span className={styles.wideCardFooterInitials}>{getInitials(category.fullNameText || category.usernameText)}</span>
          )}
        </div>
        <span className={styles.wideCardFooterName}>{category.usernameText}</span>
      </div>
    </div>
  );
}

// The plain list-row card — Flutter uses this only when a Favourite/Private section has 2 or
// fewer items.
function CompactCategoryCard({ category, onClick }: { category: UserQuizCreatorCategoryModel; onClick: () => void }) {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  return (
    <div className={styles.compactCard} role="button" onClick={onClick}>
      <div className={styles.compactCardHeader}>
        <span className={styles.compactCardUsername}>{category.usernameText}</span>
        <span className={styles.compactCardTime}>{formatRelativeTime(category.topicCategoryCreatedAt)}</span>
      </div>
      <div className={styles.compactCardBody}>
        <div className={styles.compactCardAvatar}>
          {category.topicCategoryImageUrl && !imgError ? (
            <Image src={category.topicCategoryImageUrl} alt={category.topicCategoryIdentity} fill sizes="40px" style={{ objectFit: 'cover' }} onError={() => setImgError(true)} />
          ) : (
            <span className={styles.compactCardInitials}>{getInitials(category.topicCategoryIdentity)}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className={styles.compactCardTitle}>{capitalizeWords(category.topicCategoryIdentity)}</span>
          <div className={styles.compactCardMeta}>
            <span>{pluralize(category.topicsCount, t('quiz_text', { count: category.topicsCount }))}</span>
            <span className={styles.compactCardDot} />
            <span>{pluralize(category.questionsCount, t('question_text', { count: category.questionsCount }))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
