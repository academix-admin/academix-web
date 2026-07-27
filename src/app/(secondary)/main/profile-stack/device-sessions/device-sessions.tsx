'use client';

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

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('devices_sessions') || 'Devices & sessions'} theme={theme} onBack={() => nav.pop()} />
      <div className={styles.content}>
        <SessionManager />
      </div>
    </main>
  );
}
