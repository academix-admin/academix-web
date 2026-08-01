'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './contribution-page.module.css';
import { useUserData } from '@/lib/stacks/user-stack';
import { useNav } from '@academix-admin/navigation-stack';
import { Header } from '@academix-admin/header';
import { ComponentStateProps } from '@/hooks/use-component-state';

/**
 * Contribution hub (Academix Engine, web read-only surface Phase 1).
 *
 * Opened from quiz-page-title's "create" action (handleQuizClick). Role-aware entry into the
 * contribution engine: only roles above student (rolesLevel > 1) can contribute. Each role's own
 * dashboard/library is reached from here. The server enforces the same rule (assert_can_contribute) —
 * this is just the UX gate.
 */
export default function ContributionPage({ onStateChange }: ComponentStateProps) {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const { userData } = useUserData();
  const nav = useNav();

  // Capabilities are server-authoritative (get_user_record, mirroring assert_can_contribute) —
  // no client-side role-level/checker heuristics.
  const role = userData?.usersRole;
  const isContributor = role?.rolesCanContribute ?? false;
  const canCreatePrivate = role?.rolesCanCreatePrivate ?? false;
  const canReview = role?.rolesCanReview ?? false;

  useEffect(() => { onStateChange?.('data'); }, [onStateChange]);

  const goCreate = () => nav.push('creator_library', { pType: 'creator' });
  const goPersonal = () => nav.push('creator_library', { pType: 'private' });
  const goReview = () => nav.push('reviewer_library', { pType: 'reviewer', reviewerTab: 'Approval.open' });

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header variant="title" theme={theme} title={t('contribute_text')} onBack={() => nav.pop()} />

      {!isContributor ? (
        <div className={`${applyTheme(styles, 'empty')}`}>
          <p className={styles.emptyTitle}>{t('contribution_locked_title')}</p>
          <p className={styles.emptySub}>{t('contribution_locked_sub')}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          <button className={`${applyTheme(styles, 'card')}`} onClick={goCreate}>
            <span className={styles.cardTitle}>{t('create_public_text')}</span>
            <span className={styles.cardSub}>{t('create_public_sub')}</span>
          </button>

          {canCreatePrivate && (
            <button className={`${applyTheme(styles, 'card')}`} onClick={goPersonal}>
              <span className={styles.cardTitle}>{t('create_private_text')}</span>
              <span className={styles.cardSub}>{t('create_private_sub')}</span>
            </button>
          )}

          {canReview && (
            <button className={`${applyTheme(styles, 'card')}`} onClick={goReview}>
              <span className={styles.cardTitle}>{t('review_text')}</span>
              <span className={styles.cardSub}>{t('review_sub')}</span>
            </button>
          )}
        </div>
      )}
    </main>
  );
}
