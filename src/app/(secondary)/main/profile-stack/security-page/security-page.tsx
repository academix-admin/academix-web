'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './security-page.module.css';
import { useNav } from "@/lib/NavigationStack";

interface SecurityMenuItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  theme: string;
  showDivider?: boolean;
}

function SecurityMenuItem({
  label,
  icon,
  onClick,
  theme,
  showDivider = false,
}: SecurityMenuItemProps) {
  return (
    <>
      <div
        className={`${styles.menuItem} ${styles[`menuItem_${theme}`]}`}
        onClick={onClick}
      >
        <div className={styles.iconContainer}>
          <div className={styles.iconBackground}>{icon}</div>
        </div>

        <div className={`${styles.menuLabel} ${styles[`menuLabel_${theme}`]}`}>
          {label}
        </div>

        <div className={styles.menuArrow}>
          <svg
            className={`${styles.arrow} ${styles[`arrow_${theme}`]}`}
            xmlns="http://www.w3.org/2000/svg"
            width="9"
            height="15"
            viewBox="0 0 9 15"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.21663 6.07858C8.49753 6.35983 8.65531 6.74108 8.65531 7.13858C8.65531 7.53608 8.49753 7.91733 8.21663 8.19858L2.56063 13.8566C2.27923 14.1378 1.89763 14.2958 1.49977 14.2957C1.10192 14.2956 0.72039 14.1375 0.439127 13.8561C0.157865 13.5747 -9.37265e-05 13.1931 4.17234e-08 12.7952C9.38099e-05 12.3974 0.158233 12.0158 0.439627 11.7346L5.03563 7.13858L0.439627 2.54258C0.166254 2.25981 0.0148813 1.88098 0.0181122 1.48768C0.0213432 1.09438 0.178919 0.718084 0.456901 0.43984C0.734883 0.161595 1.11103 0.00366479 1.50432 6.29798e-05C1.89762 -0.00353884 2.2766 0.147477 2.55963 0.420583L8.21763 6.07758L8.21663 6.07858Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      {showDivider && (
        <div className={`${styles.divider} ${styles[`divider_${theme}`]}`}></div>
      )}
    </>
  );
}


export default function SecurityPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const goBack = () => nav.pop();

  const handleChangePin = () => { 
    // Logic to change PIN
    nav.push('security_verification', {request: 'Pin', isNew: false});
  }

  const handleChangePassword = () => { 
    // Logic to change Password
    nav.push('security_verification', {request: 'Password'});
  }

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('security_page_title')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.container}>
          <div className={`${styles.securitySection} ${styles[`securitySection_${theme}`]}`}>
            <div className={styles.menuList}>
              <SecurityMenuItem
                label={t('change_pin')}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
                      fill="currentColor"
                      opacity="0.5"
                    />
                    <path
                      d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
                      fill="currentColor"
                    />
                  </svg>
                }
                onClick={handleChangePin}
                theme={theme}
                showDivider
              />
              <SecurityMenuItem
                label={t('change_password')}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 8h-1V6c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                      fill="currentColor"
                    />
                  </svg>
                }
                onClick={handleChangePassword}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}