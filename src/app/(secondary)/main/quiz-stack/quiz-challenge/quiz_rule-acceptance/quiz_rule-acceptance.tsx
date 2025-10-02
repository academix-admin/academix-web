'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz_rule-acceptance.module.css';
import { useLanguage } from '@/context/LanguageContext';

interface QuizRuleAcceptanceProps {
  initialValue?: boolean;
  canChange?: boolean;
  onAcceptanceChange: (acceptance: boolean) => void;
}

export default function QuizRuleAcceptance({ onAcceptanceChange, initialValue = false, canChange = true }: QuizRuleAcceptanceProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const [acceptance, setAcceptance] = useState(initialValue);

    // Handle acceptance click
    const handleAcceptanceClick = useCallback(() => {
       if(!canChange)return;
      const newAcceptance = !acceptance;
      setAcceptance(newAcceptance);
      onAcceptanceChange(newAcceptance);
    }, [acceptance, canChange, onAcceptanceChange]);


  return (
    <div role="checkbox"
                 aria-checked={acceptance}
                 tabIndex={0}
                 onClick={handleAcceptanceClick}
                  className={`${styles.historyContainer} ${styles[`historyContainer_${theme}`]}`}>
      <div className={`${styles.checkbox} ${acceptance ? styles.checkbox_checked : ''} ${styles[`checkbox_${theme}`]}`}>
        <div className={styles.checkboxInner}>
          {acceptance && (
            <svg
              className={styles.checkmark}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M13.3334 4.5L6.50002 11.3333L3.33335 8.16667"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      <div className={styles.textContent}>
        {tNode('review_rules_regulation', {
          rules: <strong>{t('rules_text').toLowerCase()}</strong>,
          regulations: <strong>{t('regulations_text')}</strong>
        })}
      </div>
    </div>
  );
}