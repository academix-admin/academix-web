'use client';
import styles from './AuthBlocker.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link'
import LoadingView from '@/components/LoadingView/LoadingView'
import { useAuthContext } from '@/providers/AuthProvider'

export default function AuthBlocker({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { initialized } = useAuthContext();

  return (
    <div className={styles.ab_span}>
       {children}
       <div className={!initialized ?  `${styles.overlay} ${styles[`overlay_${theme}`]}` : styles.hide}>
          <LoadingView text={t('loading')} />
       </div>
    </div>
  );
}
