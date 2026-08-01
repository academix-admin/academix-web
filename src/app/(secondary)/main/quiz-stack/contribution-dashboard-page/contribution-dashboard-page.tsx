'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './contribution-dashboard-page.module.css';
import { useUserData } from '@/lib/stacks/user-stack';
import { useNav, Scaffold } from '@academix-admin/navigation-stack';
import { useDemandState } from '@academix-admin/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Header } from '@academix-admin/header';
import LoadingView from '@/components/LoadingView/LoadingView';
import ErrorView from '@/components/ErrorView/ErrorView';

/**
 * Role dashboard (Academix Engine — web equivalent of Flutter's `_openQuizLibrary` role dispatch, but a
 * professional per-role dashboard with stats + a menu). Opened from quiz-page-title's create action.
 *
 * Stats come from `get_role_dashboard` (server-authoritative — identity derived via gate_check, capability
 * flags mirror assert_can_contribute; the client never hard-codes role levels). From here the user opens
 * the creator library (contribute) and/or the review queue (reviewers). Waits for userData hydration so a
 * creator never sees a brief "locked" flash.
 */
interface RoleDashboard {
  roles_level: number;
  roles_checker: string;
  roles_can_contribute: boolean;
  roles_can_create_private: boolean;
  roles_can_review: boolean;
  categories_authored: number;
  topics_authored: number;
  questions_authored: number;
  content_authored: number;
  pending_approval: number;
  approved: number;
  review_queue: number;
  reviewed: number;
}

export default function ContributionDashboardPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { userData, __meta } = useUserData();
  const nav = useNav();

  return (
    <Scaffold
      bodyClassName={theme === 'dark' ? styles.container_dark : styles.container_light}
      appBar={<Header title={t('contribute_text')} theme={theme} onBack={() => nav.pop()} position="static" />}
    >
      <div className={styles.content}>
        {!__meta.isHydrated || !userData ? <LoadingView /> : <DashboardBody />}
      </div>
    </Scaffold>
  );
}

function DashboardBody() {
  const { t, lang } = useLanguage();
  const nav = useNav();

  const [dash, demandDash] = useDemandState<RoleDashboard | null>(null, {
    key: 'role_dashboard',
    persist: true,
    // TTL must exceed the 10-min idle app-lock window (AppLock IDLE_MS) so cached stats survive a
    // lock/unlock instead of cold-refetching to a blank state. persist+SWR shows cached data on return.
    ttl: 3600,
    scope: 'secondary_flow',
    deps: [lang],
  });
  const [status, setStatus] = useState<'loading' | 'data' | 'error'>('loading');

  const load = (override = false) => {
    setStatus('loading');
    demandDash(async ({ set }) => {
      try {
        const { data, error } = await supabaseBrowser.rpc('get_role_dashboard', { p_locale: lang });
        if (error) throw error;
        set(data as RoleDashboard, override ? { override: true } : undefined);
        setStatus('data');
      } catch (e) {
        console.error('[dashboard] get_role_dashboard error:', e);
        setStatus('error');
      }
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (dash) setStatus('data');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dash]);

  if (status === 'loading' && !dash) return <LoadingView />;
  if (status === 'error' && !dash)
    return <ErrorView text={t('error_occurred')} buttonText={t('reload_text')} onButtonClick={() => load(true)} />;
  if (!dash) return null;

  const canContribute = dash.roles_can_contribute;
  const canReview = dash.roles_can_review;

  if (!canContribute && !canReview) {
    return (
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
    );
  }

  const roleName = roleLabel(dash.roles_checker);

  return (
    <>
      <div className={styles.roleHeader}>
        <span className={styles.roleBadge}>{roleName}</span>
        <span className={styles.roleSub}>{t('contribution_dashboard_sub')}</span>
      </div>

      {/* Contributor stats */}
      {canContribute && (
        <div className={styles.statGrid}>
          <Stat n={dash.content_authored} label={t('stat_authored')} accent />
          <Stat n={dash.pending_approval} label={t('stat_pending')} />
          <Stat n={dash.approved} label={t('stat_approved')} />
          <Stat n={dash.categories_authored} label={t('stat_categories')} />
          <Stat n={dash.topics_authored} label={t('stat_topics')} />
          <Stat n={dash.questions_authored} label={t('stat_questions')} />
        </div>
      )}

      {/* Reviewer stats */}
      {canReview && (
        <div className={styles.statGrid}>
          <Stat n={dash.review_queue} label={t('stat_review_queue')} accent />
          <Stat n={dash.reviewed} label={t('stat_reviewed')} />
        </div>
      )}

      {/* Menu */}
      <div className={styles.menu}>
        {canContribute && (
          <MenuItem
            title={t('creator_library_text')}
            sub={t('create_public_sub')}
            onClick={() => nav.push('creator_library', { pType: 'creator' })}
            icon={<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />}
          />
        )}
        {canReview && (
          <MenuItem
            title={t('review_queue_text')}
            sub={t('review_sub')}
            onClick={() => nav.push('reviewer_library', { pType: 'reviewer', reviewerTab: 'Approval.open' })}
            icon={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
          />
        )}
      </div>
    </>
  );
}

function Stat({ n, label, accent = false }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statCard_accent : ''}`}>
      <span className={styles.statNum}>{n}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function MenuItem({ title, sub, onClick, icon }: { title: string; sub: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button className={styles.menuItem} onClick={onClick}>
      <span className={styles.menuIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span className={styles.menuInfo}>
        <span className={styles.menuTitle}>{title}</span>
        <span className={styles.menuSub}>{sub}</span>
      </span>
      <span className={styles.chevron}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </span>
    </button>
  );
}

// "Roles.creator" → "Creator" (server enum → display; no capability logic here, purely a label).
function roleLabel(checker: string): string {
  const name = (checker || '').split('.').pop() ?? '';
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
