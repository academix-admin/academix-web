'use client';

import { useCallback, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useNav } from '@academix-admin/navigation-stack';
import { Header } from '@academix-admin/header';
import { SessionManager } from '@/components/SessionManager';
import styles from './device-sessions.module.css';

export default function DeviceSessions() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await refreshRef.current?.(); } finally { setIsRefreshing(false); }
  }, [isRefreshing]);

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header
        title={t('devices_sessions')}
        theme={theme}
        onBack={() => nav.pop()}
        actions={[
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            ),
            onClick: refreshData,
            loading: isRefreshing,
            ariaLabel: t('refresh') || 'Refresh',
          },
        ]}
      />
      <div className={styles.content}>
        <SessionManager onRegisterRefresh={(fn) => { refreshRef.current = fn; }} />
      </div>
    </main>
  );
}
