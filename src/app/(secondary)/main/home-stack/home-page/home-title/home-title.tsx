'use client';

import { useTheme } from '@/context/ThemeContext';
import styles from './home-title.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/lib/stacks/user-stack';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';

export default function HomeTitle() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { userData } = useUserData();

  if(!userData)return null;

  return (
    <div className={`${styles.mainSection} ${styles[`mainSection_${theme}`]}`}>
      <div className={`${styles.titleSection} ${styles[`titleSection_${theme}`]}`}>
        <h1 className={`${styles.titleTop} ${styles[`titleTop_${theme}`]}`}>
          {capitalize(getLastNameOrSingle(userData.usersNames))}
        </h1>
        <p className={`${styles.titleBot} ${styles[`titleBot_${theme}`]}`}>
          {t('welcome_back')}
        </p>
      </div>

      <div className={styles.notificationIcon}>
        <svg
          className={`${styles.svgSection} ${styles[`svgSection_${theme}`]}`}
          fill="none"
          viewBox="0 0 22 30"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Notifications"
        >
          <path
            d="M11 0.366089C8.71523 0.366089 6.52403 1.47804 4.90845 3.45732C3.29288 5.4366 2.38525 8.12109 2.38525 10.9202V16.2395C2.38543 16.4734 2.34119 16.7041 2.25603 16.9135L0.142959 22.0895C0.0397376 22.3424 -0.00900258 22.6234 0.00136764 22.9058C0.0117379 23.1883 0.0808741 23.4628 0.20221 23.7033C0.323546 23.9438 0.493053 24.1423 0.694631 24.28C0.89621 24.4176 1.12317 24.4899 1.35395 24.4898H20.6461C20.8768 24.4899 21.1038 24.4176 21.3054 24.28C21.5069 24.1423 21.6765 23.9438 21.7978 23.7033C21.9191 23.4628 21.9883 23.1883 21.9986 22.9058C22.009 22.6234 21.9603 22.3424 21.857 22.0895L19.7452 16.9135C19.6596 16.7042 19.615 16.4735 19.6147 16.2395V10.9202C19.6147 8.12109 18.7071 5.4366 17.0915 3.45732C15.476 1.47804 13.2848 0.366089 11 0.366089ZM11 29.013C10.2362 29.0135 9.49103 28.7237 8.86726 28.1837C8.24348 27.6436 7.77179 26.8798 7.51718 25.9975H14.4828C14.2282 26.8798 13.7565 27.6436 13.1327 28.1837C12.509 28.7237 11.7638 29.0135 11 29.013Z"
            fill="currentColor"
          />
        </svg>
        <span className={styles.notificationBadge}>3</span>
      </div>
    </div>
  );
}