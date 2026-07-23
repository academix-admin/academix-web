'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './ErrorView.module.css';
import CachedLottie from '@/components/CachedLottie';

export default function ErrorView({
  text = null,
  buttonText = null,
  onButtonClick = null
}: {
  text: string | null;
  buttonText?: string | null;
  onButtonClick?: (() => void) | null;
}) {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.l_span}>
        <CachedLottie
          id="no-results"
          src="/assets/lottie/error_lottie_1.json"
          className={styles.error_lottie}
          restoreProgress
        />
      </div>

      {text && <p className={`${applyTheme(styles, 'error_text')}`}>{text}</p>}

      {buttonText && onButtonClick && (
        <button
          className={`${applyTheme(styles, 'action_button')}`}
          onClick={onButtonClick}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}