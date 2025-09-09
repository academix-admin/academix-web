'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile-contacts.module.css';
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
      { id: 1, label: t('help_text'), icon: 'help' },
      { id: 2, label: t('about_us_text'), icon: 'about' }
    ]);

  const handleItemClick = (itemId: number) => {
    console.log(`Clicked on item ${itemId}`);
    // Add your click handling logic here
          switch(itemId) {
            case 1:
              break;
            case 2:
              break;
            case 3:
              break;
            case 4:
              break;
            default:
              break;
          }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'help':
        return (
          <svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M9 0C7.21997 0 5.47991 0.527841 3.99987 1.51677C2.51983 2.50571 1.36628 3.91131 0.685088 5.55585C0.00389957 7.20038 -0.17433 9.00998 0.172936 10.7558C0.520203 12.5016 1.37737 14.1053 2.63604 15.364C3.89472 16.6226 5.49836 17.4798 7.24419 17.8271C8.99002 18.1743 10.7996 17.9961 12.4442 17.3149C14.0887 16.6337 15.4943 15.4802 16.4832 14.0001C17.4722 12.5201 18 10.78 18 9C18 6.61305 17.0518 4.32387 15.364 2.63604C13.6761 0.948212 11.3869 0 9 0ZM7.5 3.8625C7.5 3.56583 7.58798 3.27582 7.7528 3.02914C7.91762 2.78247 8.15189 2.59021 8.42598 2.47668C8.70007 2.36315 9.00167 2.33344 9.29264 2.39132C9.58361 2.4492 9.85088 2.59206 10.0607 2.80184C10.2704 3.01162 10.4133 3.27889 10.4712 3.56986C10.5291 3.86084 10.4994 4.16244 10.3858 4.43652C10.2723 4.71061 10.08 4.94488 9.83336 5.1097C9.58668 5.27453 9.29667 5.3625 9 5.3625C8.7968 5.37267 8.59365 5.3414 8.40292 5.27059C8.21218 5.19977 8.03785 5.0909 7.89052 4.95058C7.74319 4.81027 7.62594 4.64145 7.54591 4.45439C7.46589 4.26734 7.42475 4.06596 7.425 3.8625H7.5ZM12.75 13.5C12.75 13.6989 12.671 13.8897 12.5303 14.0303C12.3897 14.171 12.1989 14.25 12 14.25H6.75C6.55109 14.25 6.36033 14.171 6.21967 14.0303C6.07902 13.8897 6 13.6989 6 13.5C6 13.3011 6.07902 13.1103 6.21967 12.9697C6.36033 12.829 6.55109 12.75 6.75 12.75H8.25V8.25H7.5C7.30109 8.25 7.11032 8.17098 6.96967 8.03033C6.82902 7.88968 6.75 7.69891 6.75 7.5C6.75 7.30109 6.82902 7.11032 6.96967 6.96967C7.11032 6.82902 7.30109 6.75 7.5 6.75H10.5V12.75H12C12.1989 12.75 12.3897 12.829 12.5303 12.9697C12.671 13.1103 12.75 13.3011 12.75 13.5Z"
                  fill="currentColor" />
          </svg>
        );
      case 'about':
        return (
          <svg fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M6.11111 4.88889C6.11111 3.59227 6.62619 2.34877 7.54303 1.43192C8.45988 0.515078 9.70339 0 11 0C12.2966 0 13.5401 0.515078 14.457 1.43192C15.3738 2.34877 15.8889 3.59227 15.8889 4.88889C15.8889 6.1855 15.3738 7.42901 14.457 8.34586C13.5401 9.2627 12.2966 9.77778 11 9.77778C9.70339 9.77778 8.45988 9.2627 7.54303 8.34586C6.62619 7.42901 6.11111 6.1855 6.11111 4.88889ZM6.11111 12.2222C4.49034 12.2222 2.93596 12.8661 1.7899 14.0121C0.643847 15.1582 0 16.7126 0 18.3333C0 19.3058 0.386309 20.2384 1.07394 20.9261C1.76158 21.6137 2.69421 22 3.66667 22H18.3333C19.3058 22 20.2384 21.6137 20.9261 20.9261C21.6137 20.2384 22 19.3058 22 18.3333C22 16.7126 21.3562 15.1582 20.2101 14.0121C19.064 12.8661 17.5097 12.2222 15.8889 12.2222H6.11111Z"
                  fill="currentColor"
                  fillRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {t('contacts_text')}
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