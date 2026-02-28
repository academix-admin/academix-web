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
      { id: 4, label: t('reward_text'), icon: 'reward' },
      { id: 5, label: t('instructions_text'), icon: 'instructions' }
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
            case 5:
                nav.push('instructions_page');
              break;
            default:
              break;
          }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'rules':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="currentColor" opacity="0.2"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'payout':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor" opacity="0.2"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M2 10H7M17 10H22M2 14H7M17 14H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'rates':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17V21M9 13V21M15 9V21M21 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="3" cy="17" r="2" fill="currentColor"/>
            <circle cx="9" cy="13" r="2" fill="currentColor"/>
            <circle cx="15" cy="9" r="2" fill="currentColor"/>
            <circle cx="21" cy="5" r="2" fill="currentColor"/>
          </svg>
        );

      case 'reward':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
        );

      case "instructions":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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