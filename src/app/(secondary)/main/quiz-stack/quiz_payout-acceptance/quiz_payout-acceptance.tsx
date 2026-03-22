'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz_payout-acceptance.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import Payout from '@/app/(public)/payout/page';
import DialogCancel from '@/components/DialogCancel';

interface QuizPayoutAcceptanceProps {
  challengeId: string;
}

export default function QuizPayoutAcceptance({ challengeId }: QuizPayoutAcceptanceProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();

  const [bottomViewerId, bottomController, bottomIsOpen, setBottomIsOpen, bottomRef] = useBottomController();

  // Handle acceptance click
  const handleAcceptanceClick = useCallback((e: React.MouseEvent) => {
    if (bottomController.isEventFromSheet(e)) {
      return; // Ignore clicks from the sheet
    }

    if (!bottomIsOpen) {
      setBottomIsOpen(true);
    }

  }, []);

  const handleClose = useCallback(() => {
    setBottomIsOpen(false); // Use setBottomIsOpen to close
  }, [setBottomIsOpen]);


  return (
    <div 
      tabIndex={0}
      onClick={handleAcceptanceClick}
      className={`${styles.historyContainer} ${styles[`historyContainer_${theme}`]}`}>
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
          maxHeight: '88dvh'
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <Payout searchParams={Promise.resolve({ req: 'quiz', challengeId })} />
      </BottomViewer>

    </div>
  );
}