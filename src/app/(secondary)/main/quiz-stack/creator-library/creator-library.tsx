'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './creator-library.module.css';
import { useNav, Scaffold, useInfiniteScrollObserver } from '@academix-admin/navigation-stack';
import { useDemandState } from '@academix-admin/state-stack';
import { useDialog } from '@academix-admin/dialog-viewer';
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
import { capitalize } from '@/utils/textUtils';

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
  const { t } = useLanguage();
  const nav = useNav();
  const dialog = useDialog();

  const isReviewer = pType === 'reviewer';
  const title = isReviewer ? t('review_text') : t('library_text');

  // Authoring (create category) is Phase 2 — surface a clear notice for now (Flutter opens categoryAddition).
  const onNew = () =>
    dialog.open(
      <div className={styles.dialog}>
        <p className={styles.dialogTitle}>{t('create_public_text')}</p>
        <p className={styles.dialogSub}>{t('coming_soon_text')}</p>
        <button className={styles.dialogBtn} onClick={() => dialog.close()}>{t('ok_text')}</button>
      </div>,
    );

  return (
    <Scaffold
      bodyClassName={theme === 'dark' ? styles.container_dark : styles.container_light}
      appBar={<Header title={title} theme={theme} onBack={() => nav.pop()} position="static" />}
    >
      <div className={styles.content}>
        {isReviewer ? (
          <CategoryList pType="reviewer" reviewerTab={reviewerTab} standalone />
        ) : (
          <>
            <RecentStrip onNew={onNew} />
            <CardStrip pType="favourite" title={t('favourite_text')} />
            <CardStrip pType="private" title={t('create_private_text')} />
            <PublicSection />
          </>
        )}
      </div>
    </Scaffold>
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
    ttl: 3600,
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
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
      <span className={styles.recentName}>{capitalize(category.topicCategoryIdentity)}</span>
    </div>
  );
}

/* ---------------- Favourite / Private card strips ---------------- */
function CardStrip({ pType, title }: { pType: string; title: string }) {
  const { lang } = useLanguage();
  const { userData } = useUserData();
  const [items, demandItems] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: `lib_strip_${pType}`,
    persist: true,
    ttl: 3600,
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
      <div className={styles.strip}>
        {items.map((cat) => (
          <CategoryCard key={cat.topicCategoryId} category={cat} variant="strip" />
        ))}
      </div>
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
      <CategoryList pType="creator" />
    </section>
  );
}

function CategoryList({
  pType,
  reviewerTab = null,
  standalone = false,
}: {
  pType: string;
  reviewerTab?: string | null;
  standalone?: boolean;
}) {
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const [items, demandItems, setItems] = useDemandState<UserQuizCreatorCategoryModel[]>([], {
    key: `lib_list_${pType}`,
    persist: true,
    ttl: 3600,
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
      {items.map((cat) => (
        <ListRow key={cat.topicCategoryId} category={cat} />
      ))}
      {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
      {paginating && <div className={styles.moreSpinner}><span /></div>}
    </div>
  );
}

/* ---------------- cards ---------------- */
function CategoryCard({ category }: { category: UserQuizCreatorCategoryModel; variant?: 'strip' }) {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const approvalKey = category.approvalBucket;
  return (
    <div className={styles.stripCard} role="button">
      <div className={styles.stripImage}>
        {category.topicCategoryImageUrl && !imgError ? (
          <Image src={category.topicCategoryImageUrl} alt={category.topicCategoryIdentity} width={130} height={84} onError={() => setImgError(true)} />
        ) : (
          <span className={styles.stripInitials}>{getInitials(category.topicCategoryIdentity)}</span>
        )}
      </div>
      <span className={styles.stripName}>{capitalize(category.topicCategoryIdentity)}</span>
      <div className={styles.stripMeta}>
        <span className={`${styles.badge} ${styles[`badge_${approvalKey}`]}`}>{t(`approval_${approvalKey}`)}</span>
        <span className={styles.counts}>{category.topicsCount} · {category.questionsCount}</span>
      </div>
    </div>
  );
}

function ListRow({ category }: { category: UserQuizCreatorCategoryModel }) {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [userImgError, setUserImgError] = useState(false);
  const approvalKey = category.approvalBucket;

  return (
    <div className={styles.row} role="button">
      <div className={styles.rowImage}>
        {category.topicCategoryImageUrl && !imgError ? (
          <Image src={category.topicCategoryImageUrl} alt={category.topicCategoryIdentity} width={52} height={52} onError={() => setImgError(true)} />
        ) : (
          <span className={styles.rowInitials}>{getInitials(category.topicCategoryIdentity)}</span>
        )}
      </div>

      <div className={styles.rowBody}>
        <div className={styles.rowTitleLine}>
          <span className={styles.rowTitle}>{capitalize(category.topicCategoryIdentity)}</span>
          {category.isFavourite && <span className={styles.star} aria-label="favourite">★</span>}
        </div>
        <div className={styles.metaLine}>
          <span className={`${styles.badge} ${styles[`badge_${approvalKey}`]}`}>{t(`approval_${approvalKey}`)}</span>
          <span className={styles.counts}>{category.topicsCount} · {category.questionsCount}</span>
        </div>
        <div className={styles.creatorLine}>
          <div className={styles.creatorImg}>
            {category.userImageUrl && !userImgError ? (
              <Image src={category.userImageUrl} alt={category.fullNameText} width={22} height={22} onError={() => setUserImgError(true)} />
            ) : (
              <span className={styles.creatorInitials}>{getInitials(category.fullNameText || category.usernameText)}</span>
            )}
          </div>
          <span className={styles.creatorName}>{category.usernameText}</span>
        </div>
      </div>
    </div>
  );
}
