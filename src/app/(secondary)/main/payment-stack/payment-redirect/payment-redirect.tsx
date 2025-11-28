'use client';

import React, { useEffect, useCallback, useState } from 'react';
import styles from './payment-redirect.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export interface RedirectController {
  open: (link: string) => Promise<void>;
  close: () => void;
  isOpen: boolean;
  link: string;
}

export const useRedirectController = (): RedirectController => {
  const [isOpen, setIsOpen] = useState(false);
  const [link, setLink] = useState('');
  const resolver = React.useRef<((value: void) => void) | null>(null);

  const open = useCallback((paymentLink: string) => {
    setLink(paymentLink);
    setIsOpen(true);

    return new Promise<void>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback(() => {
    if (resolver.current) resolver.current();
    resolver.current = null;
    setIsOpen(false);
    setLink('');
  }, []);

  return {
    open,
    close,
    isOpen,
    link,
  };
};

interface PaymentRedirectProps {
  controller: RedirectController;
}

const PaymentRedirect: React.FC<PaymentRedirectProps> = ({ controller }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleOpenLink = useCallback(() => {
    // OPEN POPUP INSTANTLY — required for popup safety
    window.open(controller.link, '_blank', 'noopener,noreferrer');

    // Optional: close modal after successful open
    controller.close();
  }, [controller, t]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') controller.close();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [controller]);

  if (!controller.isOpen) return null;

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
            onClick={controller.close}
          >
            {t('exit_text')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentRedirect;