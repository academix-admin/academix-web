'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz_payout-acceptance.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import Payout from '@/app/(public)/payout/page';
import DialogCancel from '@/components/DialogCancel';

interface QuizPayoutAcceptanceProps {
  initialValue?: boolean;
  canChange?: boolean;
  challengeId: string;
  onAcceptanceChange: (acceptance: boolean) => void;
}

export default function QuizPayoutAcceptance({ onAcceptanceChange, initialValue = false, canChange = true, challengeId }: QuizPayoutAcceptanceProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const [acceptance, setAcceptance] = useState(initialValue);

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

    if (newAcceptance && !bottomIsOpen) {
      setBottomIsOpen(true);
    }

    }, [acceptance, canChange, onAcceptanceChange]);

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
        {tNode('review_expected_payout', {
          expected_payout: <strong>{t('expected_payout')}</strong>
        })}
      </div>

      <BottomViewer
        id={bottomViewerId}
        isOpen={bottomIsOpen}
        onClose={handleClose}
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
          maxHeight: '92dvh'
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <Payout searchParams={Promise.resolve({ req: 'quiz', challengeId })} />
      </BottomViewer>

    </div>
  );
}