'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './NoResultsView.module.css';
import CachedLottie from '@/components/CachedLottie';

export default function NoResultsView({
  text = null,
  buttonText = null,
  onButtonClick = null
}: {
  text: string | null;
  buttonText?: string | null;
  onButtonClick?: (() => void) | null;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.l_span}>
        <CachedLottie
          id="no-results"
          src="/assets/lottie/no_result_lottie_1.json"
          className={styles.no_results_lottie}
          restoreProgress
        />
      </div>

      {text && <p className={`${styles.no_results_text} ${styles[`no_results_text_${theme}`]}`}>{text}</p>}

      {buttonText && onButtonClick && (
        <button
          className={`${styles.action_button} ${styles[`action_button_${theme}`]}`}
          onClick={onButtonClick}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}