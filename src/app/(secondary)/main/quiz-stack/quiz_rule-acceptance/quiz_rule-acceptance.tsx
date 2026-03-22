'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz_rule-acceptance.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import Rules from '@/app/(public)/rules/page';
import DialogCancel from '@/components/DialogCancel';


interface QuizRuleAcceptanceProps {}

export default function QuizRuleAcceptance({ }: QuizRuleAcceptanceProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();

  // Correctly destructure all values from useBottomController
  const [bottomViewerId, bottomController, bottomIsOpen, setBottomIsOpen, bottomRef] = useBottomController();

  // Handle acceptance click
  const handleAcceptanceClick = useCallback((e: React.MouseEvent) => {
    if (bottomController.isEventFromSheet(e)) {
      return; // Ignore clicks from the sheet
    }

    if (!bottomIsOpen) {
      setBottomIsOpen(true);
    }
  }, [bottomIsOpen, setBottomIsOpen]);

  const handleClose = useCallback(() => {
    setBottomIsOpen(false); // Use setBottomIsOpen to close
  }, [setBottomIsOpen]);

  return (
    <div
      tabIndex={0}
      onClick={handleAcceptanceClick}
      className={`${styles.historyContainer} ${styles[`historyContainer_${theme}`]}`}>
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