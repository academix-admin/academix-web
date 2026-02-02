'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz_rule-acceptance.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import Rules from '@/app/(public)/rules/page';
import DialogCancel from '@/components/DialogCancel';


interface QuizRuleAcceptanceProps {
  initialValue?: boolean;
  canChange?: boolean;
  onAcceptanceChange: (acceptance: boolean) => void;
}

export default function QuizRuleAcceptance({ onAcceptanceChange, initialValue = false, canChange = true }: QuizRuleAcceptanceProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const [acceptance, setAcceptance] = useState(initialValue);

  // Correctly destructure all values from useBottomController
  const [bottomViewerId, bottomController, bottomIsOpen, setBottomIsOpen, bottomRef] = useBottomController();

  // Handle acceptance click
  const handleAcceptanceClick = useCallback((e: React.MouseEvent) => {
    if (bottomController.isEventFromSheet(e)) {
        return; // Ignore clicks from the sheet
    }
    if(!canChange){
       if(initialValue)setBottomIsOpen(true);
       return;
    }

    const newAcceptance = !acceptance;
    setAcceptance(newAcceptance);
    onAcceptanceChange(newAcceptance);

    // Open bottom sheet when acceptance becomes true
    if (newAcceptance && !bottomIsOpen) {
      setBottomIsOpen(true);
    }
  }, [acceptance, canChange, onAcceptanceChange, bottomIsOpen, setBottomIsOpen]);

  const handleClose = useCallback(() => {
    setBottomIsOpen(false); // Use setBottomIsOpen to close
  }, [setBottomIsOpen]);

  // Close bottom sheet if acceptance becomes false while it's open
  useEffect(() => {
    if (!acceptance && bottomIsOpen) {
      setBottomIsOpen(false);
    }
  }, [acceptance, bottomIsOpen, setBottomIsOpen]);

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


      <BottomViewer
        id={bottomViewerId}
        isOpen={bottomIsOpen}
        onClose={handleClose}
        // detent='full'
        cancelButton={{
          position: "right",
          onClick: handleClose,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
          maxWidth: '800px',
          maxHeight: '88dvh'
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <Rules searchParams={Promise.resolve({ req: 'quiz' })} />
      </BottomViewer>

    </div>
  );
}