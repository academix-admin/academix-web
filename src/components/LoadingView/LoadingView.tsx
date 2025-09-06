'use client';

import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LoadingView.module.css';
import CachedLottie from '@/components/CachedLottie';

export default function LoadingView({text = null }: { text?: string | null;}) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.l_span}>
        <CachedLottie
          id="loading"
          src="/assets/lottie/loading_lottie_1.json"
          className={styles.loading_lottie}
          restoreProgress
        />
      </div>
      {text && <p className={`${styles.loading_text} ${styles[`loading_text_${theme}`]}`}>{text}</p>}
    </div>
  );
}