'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './creator-library.module.css';
import { useNav } from '@academix-admin/navigation-stack';
import { useDemandState } from '@academix-admin/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import { Header } from '@academix-admin/header';
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
 * Creator / reviewer category library (Academix Engine web surface — port of Flutter
 * user_quiz_creator_library_screen). Reads `fetch_categories` (identity + demographics are derived
 * server-side; the client sends neither p_user_id nor p_country/p_gender/p_age). Reused for:
 *   - pType 'creator'  → public categories to contribute into
 *   - pType 'private'  → the user's own private categories
 *   - pType 'reviewer' → the review queue (needs reviewerTab)
 */
type CreatorLibraryProps = {
  pType?: string;
  reviewerTab?: string | null;
};

type ViewState = 'loading' | 'data' | 'error' | 'empty';

export default function CreatorLibrary({ pType = 'creator', reviewerTab = null }: CreatorLibraryProps) {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();

  const [categories, demandCategories, setCategories] = useDemandState<UserQuizCreatorCategoryModel[]>(
    [],
    { key: `creator_library_${pType}`, persist: true, ttl: 3600, scope: 'secondary_flow', deps: [lang, reviewerTab ?? ''] },
  );

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [paginate, setPaginate] = useState<PaginateModel>(new PaginateModel());
  const [paginating, setPaginating] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const fetchCategories = useCallback(
    async (limitBy: number, after: PaginateModel): Promise<UserQuizCreatorCategoryModel[]> => {
      const { data, error } = await supabaseBrowser.rpc('fetch_categories', {
        p_locale: lang,
        p_type: pType,
        p_limit_by: limitBy,
        p_after_categories: after.toJson(),
        ...(reviewerTab ? { p_reviewer_tab: reviewerTab } : {}),
      });
      if (error) {
        console.error('[CreatorLibrary] fetch_categories error:', error);
        throw error;
      }
      return (data || []).map((row: BackendCreatorCategoryRow) => new UserQuizCreatorCategoryModel(row));
    },
    [lang, pType, reviewerTab],
  );

  const extractLatest = (list: UserQuizCreatorCategoryModel[]) => {
    if (list.length > 0) {
      const last = list[list.length - 1];
      // creator/reviewer paginate on sort_updated_id; private on sort_created_id (mirrors fetch_categories)
      const sortId = pType === 'private' ? last.sortCreatedId : last.sortUpdatedId;
      setPaginate(new PaginateModel({ sortId }));
    }
  };

  // Initial load (cached via demand-state; only fetches on a cold cache).
  useEffect(() => {
    if (!userData) return;
    demandCategories(async ({ set }) => {
      try {
        const list = await fetchCategories(12, new PaginateModel());
        extractLatest(list);
        set(list);
        setViewState(list.length > 0 ? 'data' : 'empty');
      } catch {
        setViewState('error');
      }
    });
  }, [demandCategories, userData, fetchCategories]);

  // Reflect a warm cache immediately.
  useEffect(() => {
    if (categories.length > 0) setViewState('data');
  }, [categories.length]);

  const loadMore = useCallback(async () => {
    if (paginating || categories.length === 0) return;
    setPaginating(true);
    try {
      const more = await fetchCategories(20, paginate);
      if (more.length > 0) {
        extractLatest(more);
        const existing = new Set(categories.map((c) => c.topicCategoryId));
        const merged = [...categories, ...more.filter((c) => !existing.has(c.topicCategoryId))];
        setCategories(merged);
      }
    } catch {
      /* keep existing list on pagination error */
    } finally {
      setPaginating(false);
    }
  }, [paginating, categories, paginate, fetchCategories, setCategories]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 1.0 },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const retry = () => {
    setViewState('loading');
    demandCategories(async ({ set }) => {
      try {
        const list = await fetchCategories(12, new PaginateModel());
        extractLatest(list);
        set(list, { override: true });
        setViewState(list.length > 0 ? 'data' : 'empty');
      } catch {
        setViewState('error');
      }
    });
  };

  const title = pType === 'reviewer' ? t('review_text') : pType === 'private' ? t('create_private_text') : t('library_text');

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header variant="title" theme={theme} title={title} onBack={() => nav.pop()} />

      {viewState === 'loading' && <LoadingView />}
      {viewState === 'error' && (
        <ErrorView text={t('error_occurred')} buttonText={t('reload_text')} onButtonClick={retry} />
      )}
      {viewState === 'empty' && <NoResultsView text={t('contribute_first')} />}

      {viewState === 'data' && (
        <div className={styles.list}>
          {categories.map((cat) => (
            <CategoryCard key={cat.topicCategoryId} category={cat} theme={theme} />
          ))}
          <div ref={loaderRef} className={styles.sentinel} />
          {paginating && <div className={styles.moreSpinner}><span /></div>}
        </div>
      )}
    </main>
  );
}

function getInitials(text: string): string {
  if (!text) return '?';
  return text.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('');
}

function CategoryCard({ category, theme }: { category: UserQuizCreatorCategoryModel; theme: string }) {
  const { applyTheme } = useTheme();
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [userImgError, setUserImgError] = useState(false);

  const approvalKey = category.approvalBucket;

  return (
    <div className={`${applyTheme(styles, 'card')}`} role="button">
      <div className={styles.imageBox}>
        {category.topicCategoryImageUrl && !imgError ? (
          <Image
            src={category.topicCategoryImageUrl}
            alt={category.topicCategoryIdentity}
            width={56}
            height={56}
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.initials}>{getInitials(category.topicCategoryIdentity)}</div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={`${applyTheme(styles, 'title')}`}>{capitalize(category.topicCategoryIdentity)}</h3>
          {category.isFavourite && <span className={styles.star} aria-label="favourite">★</span>}
        </div>

        <div className={styles.metaRow}>
          <span className={`${styles.badge} ${styles[`badge_${approvalKey}`]}`}>{t(`approval_${approvalKey}`)}</span>
          <span className={`${applyTheme(styles, 'counts')}`}>
            {category.topicsCount} · {category.questionsCount}
          </span>
        </div>

        <div className={styles.creatorRow}>
          <div className={styles.creatorImageBox}>
            {category.userImageUrl && !userImgError ? (
              <Image
                src={category.userImageUrl}
                alt={category.fullNameText}
                width={24}
                height={24}
                className={styles.creatorImage}
                onError={() => setUserImgError(true)}
              />
            ) : (
              <div className={styles.creatorInitials}>{getInitials(category.fullNameText || category.usernameText)}</div>
            )}
          </div>
          <span className={`${applyTheme(styles, 'creatorName')}`}>{category.usernameText}</span>
        </div>
      </div>
    </div>
  );
}
