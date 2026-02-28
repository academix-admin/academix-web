'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile-legal.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { useNav } from "@/lib/NavigationStack";

export default function ProfileAccounts({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
    const nav = useNav();
    const isTop = nav.isTop();

  useEffect(() => {
    onStateChange?.('data');
  }, [onStateChange]);

  // Menu items data
    const [contactItems, setContactItems] = useState([
      { id: 1, label: t('privacy_policy'), icon: 'privacy' },
      { id: 2, label: t('terms_of_service'), icon: 'terms' }
    ]);

  const handleItemClick = (itemId: number) => {
    // Add your click handling logic here
          switch(itemId) {
            case 1:
              nav.push('privacy_page');
              break;
            case 2:
                nav.push('terms_page');
              break;
            default:
              break;
          }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'privacy':
        return (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 0L2 3V9C2 13.55 5.84 17.74 10 19C14.16 17.74 18 13.55 18 9V3L10 0ZM10 10H16C15.53 13.25 13.42 16.1 10 17.41V10H4V4.3L10 2.19V10Z" fill="currentColor" />
          </svg>
        );
      case 'terms':
        return (
          <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2H6C4.9 2 4 2.9 4 4V16C4 17.1 4.9 18 6 18H14C15.1 18 16 17.1 16 16V7L13 2ZM14 16H6V4H12V8H14V16ZM8 13H12V15H8V13ZM8 10H12V12H8V10Z" fill="currentColor" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {t('legal')}
      </h2>

      <div className={`${styles.accountsSection} ${styles[`accountsSection_${theme}`]}`}>
        <div className={styles.menuList}>
          {contactItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <div
                className={`${styles.menuItem} ${styles[`menuItem_${theme}`]}`}
                onClick={() => handleItemClick(item.id)}
              >
                <div className={styles.iconContainer}>
                  <div className={styles.iconBackground}>
                    {getIcon(item.icon)}
                  </div>
                </div>

                <div className={`${styles.menuLabel} ${styles[`menuLabel_${theme}`]}`}>{item.label}</div>

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

              {index < contactItems.length - 1 && (
                <div className={`${styles.divider} ${styles[`divider_${theme}`]}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}