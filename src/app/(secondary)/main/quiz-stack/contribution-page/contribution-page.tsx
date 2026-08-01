'use client';

import { useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './contribution-page.module.css';
import { useUserData } from '@/lib/stacks/user-stack';
import { useNav, Scaffold } from '@academix-admin/navigation-stack';
import { Header } from '@academix-admin/header';
import LoadingView from '@/components/LoadingView/LoadingView';
import { CreatorLibraryBody } from '../creator-library/creator-library';

/**
 * Role dashboard (Academix Engine, web read-only surface Phase 1).
 *
 * Opened from quiz-page-title's "create" action — the web equivalent of Flutter's `_openQuizLibrary`
 * dispatch (creator library vs reviewer library by role). Instead of routing to a separate screen per
 * role, THIS is the role dashboard: it shows the right landing based on server-authoritative capability
 * flags (get_user_record, mirroring assert_can_contribute — the client never hard-codes role
 * levels/checkers). Every contributor can create; reviewers additionally get a Review view, so they get a
 * Create | Review switch (defaulting to Review, matching Flutter's reviewer→reviewer-library routing) —
 * and can still contribute. We wait for hydration so a creator never sees a brief "locked" flash.
 */
type Tab = 'create' | 'review';

export default function ContributionPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { userData, __meta } = useUserData();
  const nav = useNav();

  const role = userData?.usersRole;
  const canContribute = role?.rolesCanContribute ?? false;
  const canReview = role?.rolesCanReview ?? false;

  const tabs = useMemo<Tab[]>(() => {
    const list: Tab[] = [];
    if (canContribute) list.push('create');
    if (canReview) list.push('review');
    return list;
  }, [canContribute, canReview]);

  // Reviewers land on Review (matches Flutter), everyone else on Create.
  const [tab, setTab] = useState<Tab | null>(null);
  const activeTab: Tab | null = tab ?? (canReview ? 'review' : canContribute ? 'create' : null);

  return (
    <Scaffold
      bodyClassName={theme === 'dark' ? styles.container_dark : styles.container_light}
      appBar={<Header title={t('contribute_text')} theme={theme} onBack={() => nav.pop()} position="static" />}
    >
      <div className={styles.content}>
        {!__meta.isHydrated ? (
          <LoadingView />
        ) : !canContribute && !canReview ? (
          <div className={styles.locked}>
            <span className={styles.lockedIcon} aria-hidden>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <p className={styles.lockedTitle}>{t('contribution_locked_title')}</p>
            <p className={styles.lockedSub}>{t('contribution_locked_sub')}</p>
          </div>
        ) : (
          <>
            {tabs.length > 1 && (
              <div className={styles.segment} role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === 'create'}
                  className={`${styles.segmentBtn} ${activeTab === 'create' ? styles.segmentBtn_active : ''}`}
                  onClick={() => setTab('create')}
                >
                  {t('create_text')}
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'review'}
                  className={`${styles.segmentBtn} ${activeTab === 'review' ? styles.segmentBtn_active : ''}`}
                  onClick={() => setTab('review')}
                >
                  {t('review_text')}
                </button>
              </div>
            )}

            <div className={styles.dashboardBody}>
              {activeTab === 'review' ? (
                <CreatorLibraryBody pType="reviewer" reviewerTab="Approval.open" />
              ) : (
                <CreatorLibraryBody pType="creator" />
              )}
            </div>
          </>
        )}
      </div>
    </Scaffold>
  );
}
