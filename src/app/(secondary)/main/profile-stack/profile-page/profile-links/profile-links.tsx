'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile-links.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { useNav } from "@/lib/NavigationStack";

export default function ProfileLinks({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
    const nav = useNav();
    const isTop = nav.isTop();

  useEffect(() => {
    onStateChange?.('data');
  }, [onStateChange]);

  // Menu items data
    const [linksItems, setLinksItems] = useState([
      { id: 1, label: t('rules_text'), icon: 'rules' },
      { id: 2, label: t('payout_text'), icon: 'payout' },
      { id: 3, label: t('rates_text'), icon: 'rates' },
      { id: 4, label: t('reward_text'), icon: 'reward' }
    ]);

  const handleItemClick = (itemId: number) => {
    // Add your click handling logic here
          switch(itemId) {
            case 1:
              nav.push('rules_page');
              break;
            case 2:
              nav.push('payout_page');
              break;
            case 3:
               nav.push('rates_page');
              break;
            case 4:
                nav.push('rewards_info');
              break;
            default:
              break;
          }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'rules':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* clipboard + list */}
            <path d="M9 2h6a1 1 0 0 1 1 1v2h-8V3a1 1 0 0 1 1-1z" fill="currentColor" />
            <path
              d="M7 7h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"
              fill="currentColor"
              opacity="0.12"
            />
            <path d="M8 11h8v1H8zM8 14h8v1H8zM8 17h5v1H8z" fill="currentColor" />
          </svg>
        );

      case 'payout':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* wallet + coin */}
            <path d="M2 7c0-1.1.9-2 2-2h12v12H4a2 2 0 0 1-2-2V7z" fill="currentColor" opacity="0.12" />
            <path d="M20 8h-2v8h2a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z" fill="currentColor" />
            <path d="M17 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" stroke="currentColor" strokeWidth="0" fill="currentColor" />
            <circle cx="17" cy="13" r="1" fill="#fff" opacity="0.15" />
          </svg>
        );

      case 'rates':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* bar chart */}
            <rect x="3" y="12" width="3.5" height="8" rx="0.5" fill="currentColor" />
            <rect x="9" y="8" width="3.5" height="12" rx="0.5" fill="currentColor" opacity="0.9" />
            <rect x="15" y="4" width="3.5" height="16" rx="0.5" fill="currentColor" opacity="0.7" />
            <path d="M2 21h20v1H2z" fill="currentColor" opacity="0.12" />
          </svg>
        );

      case 'reward':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* star (reward / achievement) */}
            <path
              d="M12 2.5l2.6 5.27L20.8 8.6l-4 3.9.95 6.2L12 17.9l-5.75 1.8L7.2 12.5 3.2 8.6l6.2-.83L12 2.5z"
              fill="currentColor"
            />
          </svg>
        );

      default:
        return null;
    }
  };



  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {t('links_text')}
      </h2>

      <div className={`${styles.accountsSection} ${styles[`accountsSection_${theme}`]}`}>
        <div className={styles.menuList}>
          {linksItems.map((item, index) => (
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

              {index < linksItems.length - 1 && (
                <div className={`${styles.divider} ${styles[`divider_${theme}`]}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}