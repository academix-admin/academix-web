'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './payment-redirect.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface PaymentRedirectProps {
  link: string;
  onClose: () => void;
}

const PaymentRedirect: React.FC<PaymentRedirectProps> = ({ link, onClose }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Attempt to open link and handle popup blocked
  const handleOpenLink = useCallback(() => {
    const popup = window.open(link, '_blank');
    if (!popup) {
      alert(t('popup_blocked'));
    }
  }, [link, t]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className={`${styles.overlay} ${styles[`overlay_${theme}`]}`}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className={`${styles.dialog} ${styles[`dialog_${theme}`]}`}>
        <h2 className={styles.title}>{t('payment_redirect_title')}</h2>
        <p className={styles.text}>{t('payment_redirect_text')}</p>

        <div className={styles.buttonGroup}>
          <button
            className={`${styles.openButton} ${styles[`button_${theme}`]}`}
            onClick={handleOpenLink}
          >
            {t('open_payment_link')}
          </button>

          <button
            className={`${styles.exitButton} ${styles[`button_${theme}`]}`}
            onClick={onClose}
          >
            {t('exit_text')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentRedirect;
