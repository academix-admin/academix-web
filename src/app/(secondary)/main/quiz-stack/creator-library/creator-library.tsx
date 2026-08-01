'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import styles from './creator-library.module.css';
import { useDemandState } from '@academix-admin/state-stack';
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
 * Creator / reviewer library BODY (Academix Engine web surface — port of Flutter
 * user_quiz_creator_library_screen / user_quiz_reviewer_library_screen). Rendered inside the role
 * dashboard (contribution-page), which owns the Scaffold + Header. Reads `fetch_categories`
 * (identity + demographics are derived server-side; the client sends neither p_user_id nor
 * p_country/p_gender/p_age).
 *
 * pType 'creator'  → the full creator library: Recents / Favourite / Private horizontal strips
 *                    (mirroring Flutter) followed by the paginated public list.
 * pType 'reviewer' → the review queue (needs reviewerTab; paginated list).
 */
type CreatorLibraryBodyProps = {
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

export function CreatorLibraryBody({ pType = 'creator', reviewerTab = null }: CreatorLibraryBodyProps) {
  const { t } = useLanguage();

  if (pType === 'reviewer') {
    return <CategoryList pType="reviewer" reviewerTab={reviewerTab} title={t('review_text')} standalone />;
  }

  // creator dashboard: Recents / Favourite / Private strips (hidden when empty) + paginated public list.
  return (
    <>
      <CategoryStrip pType="recent" title={t('recents_text')} />
      <CategoryStrip pType="favourite" title={t('favourite_text')} />
      <CategoryStrip pType="private" title={t('create_private_text')} />
      <CategoryList pType="creator" title={t('public_text')} />
    </>
  );
}

function getInitials(text: string): string {
  if (!text) return '?';
  return text.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('');
}

/* ---------------- horizontal strip (recent / favourite / private) ---------------- */
function CategoryStrip({ pType, title }: { pType: string; title: string }) {
  const { t, lang } = useLanguage();
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
      try {
        set(await fetchCategories(lang, pType, 10, new PaginateModel()));
      } catch {
        set([]);
      }
    });
  }, [demandItems, userData, lang, pType]);

  if (items.length === 0) return null;

  return (
    <section>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>{title}</span>
        {items.length >= 9 && (
          <span className={styles.sectionMore} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </span>
        )}
      </div>
      <div className={styles.strip}>
        {items.map((cat) => (
          <StripCard key={cat.topicCategoryId} category={cat} />
        ))}
      </div>
    </section>
  );
}

function StripCard({ category }: { category: UserQuizCreatorCategoryModel }) {
  const [imgError, setImgError] = useState(false);
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
    </div>
  );
}

/* ---------------- vertical paginated list (public / private / reviewer) ---------------- */
type ViewState = 'loading' | 'data' | 'error' | 'empty';

function CategoryList({
  pType,
  reviewerTab = null,
  title,
  standalone = false,
}: {
  pType: string;
  reviewerTab?: string | null;
  title: string;
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

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [paginate, setPaginate] = useState<PaginateModel>(new PaginateModel());
  const [paginating, setPaginating] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    (override = false) => {
      demandItems(async ({ set }) => {
        try {
          const list = await fetchCategories(lang, pType, 12, new PaginateModel(), reviewerTab);
          setPaginate(new PaginateModel({ sortId: nextSortId(list, pType) }));
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
      const more = await fetchCategories(lang, pType, 20, paginate, reviewerTab);
      if (more.length > 0) {
        setPaginate(new PaginateModel({ sortId: nextSortId(more, pType) }));
        const seen = new Set(items.map((c) => c.topicCategoryId));
        setItems([...items, ...more.filter((c) => !seen.has(c.topicCategoryId))]);
      }
    } catch {
      /* keep current list on pagination error */
    } finally {
      setPaginating(false);
    }
  }, [paginating, items, paginate, lang, pType, reviewerTab, setItems]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { threshold: 1.0 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  if (viewState === 'loading') return <LoadingView />;
  if (viewState === 'error') return <ErrorView text={t('error_occurred')} buttonText={t('reload_text')} onButtonClick={() => { setViewState('loading'); load(true); }} />;
  // In the sectioned creator view, an empty public list shouldn't blank the whole screen.
  if (viewState === 'empty') return standalone ? <NoResultsView text={t('contribute_first')} /> : null;

  return (
    <section>
      {!standalone && (
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>{title}</span>
        </div>
      )}
      <div className={styles.list}>
        {items.map((cat) => (
          <ListRow key={cat.topicCategoryId} category={cat} />
        ))}
        <div ref={loaderRef} className={styles.sentinel} />
        {paginating && <div className={styles.moreSpinner}><span /></div>}
      </div>
    </section>
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
