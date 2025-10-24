'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-details-viewer.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { UserDisplayQuizTopicModel } from '@/models/user-display-quiz-topic-model';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import DialogCancel from '@/components/DialogCancel';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

interface QuizDetailsViewerProps {
  topicsModel: UserDisplayQuizTopicModel;
}

export default function QuizDetailsViewer({ topicsModel }: QuizDetailsViewerProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [codeBottomViewerId, codeBottomController, codeBottomIsOpen] = useBottomController();
  const [userImageError, setUserImageError] = useState(false);

  const handleCopyCode = async () => {
    if (!topicsModel.quizPool?.poolsCode) return;

    try {
      await navigator.clipboard.writeText(topicsModel.quizPool.poolsCode);
      // Show toast notification (you'll need to implement this)
      console.log('Copied to clipboard');
      codeBottomController.close();
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

   const getInitials = (text: string): string => {
     if (!text) return '?';
     return text.split(' ')
       .map(word => word.charAt(0).toUpperCase())
       .slice(0, 2)
       .join('');
   };

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.details} ${styles[`details_${theme}`]}`}>
        {topicsModel.topicsIdentity}
      </h2>
          <div className={styles.codeContainer} onClick={() => codeBottomController.open()}>
            <div className={styles.codeIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
              </svg>
            </div>
            <span className={styles.codeText}>
              {topicsModel.quizPool?.poolsCode || t('error_occurred')}
            </span>
          </div>

          <div className={`${styles.performanceItem} ${styles[`performanceItem_${theme}`]}`}>
          <button
                      className={styles.joinButton}
                      onClick={()=> console.log('follow')}
                    >
                      {t('follow_text')}
                    </button>
          <h2 className={`${styles.itemTitle} ${styles[`itemTitle_${theme}`]}`}>
                 {t('topic_creator')}
          </h2>
          {/* Creator Info */}
                    <div className={styles.creatorInfo}>
                      <div className={styles.creatorImageContainer}>
                        {topicsModel.userImageUrl && !userImageError ? (
                          <Image
                            src={topicsModel.userImageUrl}
                            alt={topicsModel.fullNameText}
                            width={34}
                            height={34}
                            className={styles.creatorImage}
                            onError={() => setUserImageError(true)}
                          />
                        ) : (
                          <div className={styles.creatorInitials}>
                            {getInitials(topicsModel.fullNameText || topicsModel.usernameText)}
                          </div>
                        )}
                      </div>

                      <div className={styles.creatorDetails}>
                        <span className={`${styles.creatorName} ${styles[`creatorName_${theme}`]}`}>
                          {topicsModel.usernameText}
                        </span>
                      </div>
                    </div>
          </div>


      {/* QR Code Bottom Sheet */}
      {topicsModel.quizPool?.poolsCode && <BottomViewer
        id={codeBottomViewerId}
        isOpen={codeBottomIsOpen}
        onClose={codeBottomController.close}
        cancelButton={{
          position: "right",
          onClick: codeBottomController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>
            {t('scan_quiz_code')}
          </h3>

          {/* QR Code Display */}
          <div className={styles.qrContainer}>
            <QRCodeSVG
              value={topicsModel.quizPool?.poolsCode}
              size={200}
              level="H"
              includeMargin
              fgColor={theme === 'light' ? '#000000' : '#ffffff'}
              bgColor={theme === 'light' ? '#ffffff' : '#121212'}
            />
          </div>

          {/* Code with Copy Functionality */}
          <div
            className={styles.codeCopyContainer}
            onClick={handleCopyCode}
            role="button"
            tabIndex={0}
          >
            <div className={styles.codeCopyIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
              </svg>
            </div>
            <span className={styles.codeCopyText}>
              {topicsModel.quizPool?.poolsCode}
            </span>
            <div className={styles.copyContainer}>
              <div className={styles.copyIcon}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
               </svg>
              </div>
            </div>
          </div>
        </div>
      </BottomViewer>}

    </div>
  );
}