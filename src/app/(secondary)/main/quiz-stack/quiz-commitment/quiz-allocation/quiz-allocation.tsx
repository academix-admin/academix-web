'use client';

import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-allocation.module.css';
import { useLanguage } from '@/context/LanguageContext';

export default function QuizAllocation() {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();


  return (
    <div className={styles.historyContainer}>

      <div className={`${styles.rewardInfo} ${styles[`rewardInfo_${theme}`]}`}>
          {tNode('quiz_challenge_allocation',{
                dwa: <strong>{t('dwa_text')}</strong>,
                top: <strong>{t('top_text')}</strong>,
                mid: <strong>{t('mid_text')}</strong>,
                bot: <strong>{t('bot_text')}</strong>,
                rank: <strong>{t('rank_text')}</strong>,
                participants: <strong>{t('participants_text')}</strong>
              })}
      </div>
    </div>
  );
}
