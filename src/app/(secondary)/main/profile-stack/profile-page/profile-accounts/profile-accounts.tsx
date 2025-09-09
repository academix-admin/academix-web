'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile-accounts.module.css';
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
  const [accountItems, setAccountItems] = useState([
    { id: 1, label: t('edit_profile'), icon: 'edit' },
    { id: 2, label: t('parental'), icon: 'family' },
    { id: 3, label: t('security'), icon: 'security' },
    { id: 4, label: t('redeem_codes'), icon: 'redeem' }
  ]);

  const handleItemClick = (itemId: number) => {
    console.log(`Clicked on item ${itemId}`);
    // Add your click handling logic here
          switch(itemId) {
            case 1:
              nav.push('edit_profile');
              break;
            case 2:
              break;
            case 3:
              break;
            case 4:
              nav.push('redeem_codes');
              break;
            default:
              break;
          }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'edit':
        return (
          <svg fill="none" height="16" viewBox="0 0 20 16" width="20" xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M1.66667 0H18.3333C19.2083 0 20 0.844444 20 1.77778V14.2222C20 15.1556 19.2083 16 18.3333 16H1.66667C0.791667 16 0 15.1556 0 14.2222V1.77778C0 0.844444 0.791667 0 1.66667 0ZM11.6667 2.66667V3.55556H18.3333V2.66667H11.6667ZM11.6667 4.44444V5.33333H18.3333V4.44444H11.6667ZM11.6667 6.22222V7.11111H17.5V6.22222H11.6667ZM6.66667 9.69778C5 9.69778 1.66667 10.6667 1.66667 12.4444V13.3333H11.6667V12.4444C11.6667 10.6667 8.33333 9.69778 6.66667 9.69778ZM6.66667 2.66667C6.00363 2.66667 5.36774 2.94762 4.8989 3.44772C4.43006 3.94781 4.16667 4.62609 4.16667 5.33333C4.16667 6.04058 4.43006 6.71885 4.8989 7.21895C5.36774 7.71905 6.00363 8 6.66667 8C7.32971 8 7.96559 7.71905 8.43443 7.21895C8.90327 6.71885 9.16667 6.04058 9.16667 5.33333C9.16667 4.62609 8.90327 3.94781 8.43443 3.44772C7.96559 2.94762 7.32971 2.66667 6.66667 2.66667Z"
                  fill="white" />
          </svg>
        );
      case 'family':
        return (
          <svg fill="none" height="14" viewBox="0 0 20 14" width="20" xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M6 7C7.93438 7 9.5 5.43438 9.5 3.5C9.5 1.56562 7.93438 0 6 0C4.06562 0 2.5 1.56562 2.5 3.5C2.5 5.43438 4.06562 7 6 7ZM8.4 8H8.14062C7.49063 8.3125 6.76875 8.5 6 8.5C5.23125 8.5 4.5125 8.3125 3.85938 8H3.6C1.6125 8 0 9.6125 0 11.6V12.5C0 13.3281 0.671875 14 1.5 14H10.5C11.3281 14 12 13.3281 12 12.5V11.6C12 9.6125 10.3875 8 8.4 8ZM15 7C16.6562 7 18 5.65625 18 4C18 2.34375 16.6562 1 15 1C13.3438 1 12 2.34375 12 4C12 5.65625 13.3438 7 15 7ZM16.5 8H16.3813C15.9469 8.15 15.4875 8.25 15 8.25C14.5125 8.25 14.0531 8.15 13.6187 8H13.5C12.8625 8 12.275 8.18437 11.7594 8.48125C12.5219 9.30312 13 10.3938 13 11.6V12.8C13 12.8688 12.9844 12.9344 12.9812 13H18.5C19.3281 13 20 12.3281 20 11.5C20 9.56562 18.4344 8 16.5 8Z"
                  fill="white" />
          </svg>
        );
      case 'security':
        return (
          <svg fill="none" height="14" viewBox="0 0 11 14" width="11" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M5.5 2C4.96957 2 4.46086 2.21071 4.08579 2.58579C3.71071 2.96086 3.5 3.46957 3.5 4V5H7.5V4C7.5 3.46957 7.28929 2.96086 6.91421 2.58579C6.53914 2.21071 6.03043 2 5.5 2ZM1.5 4V5C1.10218 5 0.720644 5.15804 0.43934 5.43934C0.158035 5.72064 0 6.10218 0 6.5V12.5C0 12.8978 0.158035 13.2794 0.43934 13.5607C0.720644 13.842 1.10218 14 1.5 14H9.5C9.89782 14 10.2794 13.842 10.5607 13.5607C10.842 13.2794 11 12.8978 11 12.5V6.5C11 6.10218 10.842 5.72064 10.5607 5.43934C10.2794 5.15804 9.89782 5 9.5 5V4C9.5 2.93913 9.07857 1.92172 8.32843 1.17157C7.57828 0.421427 6.56087 0 5.5 0C4.43913 0 3.42172 0.421427 2.67157 1.17157C1.92143 1.92172 1.5 2.93913 1.5 4ZM5.5 10.75C5.66415 10.75 5.8267 10.7177 5.97835 10.6548C6.13001 10.592 6.26781 10.5 6.38388 10.3839C6.49996 10.2678 6.59203 10.13 6.65485 9.97835C6.71767 9.8267 6.75 9.66415 6.75 9.5C6.75 9.33585 6.71767 9.1733 6.65485 9.02165C6.59203 8.86999 6.49996 8.73219 6.38388 8.61612C6.26781 8.50004 6.13001 8.40797 5.97835 8.34515C5.8267 8.28233 5.66415 8.25 5.5 8.25C5.16848 8.25 4.85054 8.3817 4.61612 8.61612C4.3817 8.85054 4.25 9.16848 4.25 9.5C4.25 9.83152 4.3817 10.1495 4.61612 10.3839C4.85054 10.6183 5.16848 10.75 5.5 10.75Z"
                  fill="white"
                  fillRule="evenodd" />
          </svg>
        );
      case 'redeem':
        return (
          <svg fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M2.75 0C1.232 0 0 1.12009 0 2.50021V4.8244C0.00058588 5.35913 0.158347 5.88399 0.456955 6.34467C0.755563 6.80535 1.18417 7.18511 1.6984 7.44462L8.0256 10.6429C6.70031 11.2512 5.63931 12.2479 5.014 13.4721C4.3887 14.6963 4.23562 16.0764 4.5795 17.3894C4.92338 18.7024 5.74413 19.8717 6.90915 20.7083C8.07417 21.5449 9.51541 22 11 22C12.4846 22 13.9258 21.5449 15.0908 20.7083C16.2559 19.8717 17.0766 18.7024 17.4205 17.3894C17.7644 16.0764 17.6113 14.6963 16.986 13.4721C16.3607 12.2479 15.2997 11.2512 13.9744 10.6429L20.3038 7.44662C20.818 7.18668 21.2463 6.8065 21.5445 6.34546C21.8428 5.88441 22 5.35927 22 4.8244V2.50021C22 1.12009 20.768 0 19.25 0H2.75ZM8.8 8.74473V2.00017H13.2V8.74473L11 9.85683L8.8 8.74473ZM15.4 16.0013C15.4 17.0623 14.9364 18.0798 14.1113 18.83C13.2861 19.5802 12.167 20.0017 11 20.0017C9.83305 20.0017 8.71389 19.5802 7.88873 18.83C7.06357 18.0798 6.6 17.0623 6.6 16.0013C6.6 14.9404 7.06357 13.9229 7.88873 13.1727C8.71389 12.4225 9.83305 12.001 11 12.001C12.167 12.001 13.2861 12.4225 14.1113 13.1727C14.9364 13.9229 15.4 14.9404 15.4 16.0013Z"
                  fill="white" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {t('accounts_text')}
      </h2>

      <div className={`${styles.accountsSection} ${styles[`accountsSection_${theme}`]}`}>
        <div className={styles.menuList}>
          {accountItems.map((item, index) => (
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

                <div className={styles.menuLabel}>{item.label}</div>

                <div className={styles.menuArrow}>
                  <svg
                    className={styles.arrow}
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

              {index < accountItems.length - 1 && (
                <div className={styles.divider}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}