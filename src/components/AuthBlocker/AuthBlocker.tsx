// 'use client';
// import styles from './AuthBlocker.module.css';
// import { useTheme } from '@/context/ThemeContext';
// import { useLanguage } from '@/context/LanguageContext';
// import Link from 'next/link'
// import LoadingView from '@/components/LoadingView/LoadingView'
// import { useAuthContext } from '@/providers/AuthProvider'

// export default function AuthBlocker({ children }: { children: React.ReactNode }) {
//   const { theme, applyTheme } = useTheme();
//   const { t } = useLanguage();
//   const { initialized } = useAuthContext();

//   return (
//     <div className={styles.ab_span} >
//        <div className={!initialized ? styles.hide : '' }>{children}</div>
//        <div className={!initialized ?  `${applyTheme(styles, 'overlay')}` : styles.hide}>
//           <LoadingView text={t('loading')} />
//        </div>
//     </div>
//   );
// }


'use client';
import styles from './AuthBlocker.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import LoadingView from '@/components/LoadingView/LoadingView';
import { useAuthContext } from '@/providers/AuthProvider';

export default function AuthBlocker({ children }: { children: React.ReactNode }) {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const { coldStart, resolving } = useAuthContext();

  // COLD start (protected route, session not yet known): withhold children entirely — we must not render
  // protected content before the session resolves.
  if (coldStart) {
    return (
      <div className={`${applyTheme(styles, 'overlay')}`}>
        <LoadingView text={t('loading')} />
      </div>
    );
  }

  // `resolving` = the profile-resolve effect refetching userData (a signed-in user whose persisted profile
  // was null — e.g. after a full reload where the userData TTL had expired). OVERLAY the loader but KEEP
  // children mounted: unmounting here tears down and remounts every page, reloading all cached lists.
  // (A genuine live resume never reaches here — userData stays in memory, so `resolving` doesn't fire.)
  return (
    <>
      <div style={{ display: resolving ? 'none' : 'contents' }}>{children}</div>
      {resolving && (
        <div className={`${applyTheme(styles, 'overlay')}`}>
          <LoadingView text={t('loading')} />
        </div>
      )}
    </>
  );
}