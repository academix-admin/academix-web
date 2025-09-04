'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './profile-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";


export default function ProfilePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // State for user profile data
  const [userProfile, setUserProfile] = useState({
    fullName: 'Ajibewa Irekanmi Johnson',
    username: '@creator2',
    creatorTier: 'Tier 2'
  });

  // Menu items data
  const [accountItems, setAccountItems] = useState([
    { id: 1, label: 'Edit profile', icon: '✏️' },
    { id: 2, label: 'Parental', icon: '👪' },
    { id: 3, label: 'Security', icon: '🔒' },
    { id: 4, label: 'Redeem codes', icon: '🎟️' }
  ]);

  const [contactItems, setContactItems] = useState([
    { id: 1, label: 'Help', icon: '❓' },
    { id: 2, label: 'About us', icon: 'ℹ️' }
  ]);

  return (
    <div className={styles.mainContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <h1>Profile</h1>
      </div>

      {/* Overview Section */}
      <div className={styles.overviewSection}>
        <h2>Overview</h2>

        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {userProfile.fullName.split(' ').map(name => name[0]).join('')}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{userProfile.fullName}</div>
            <div className={styles.userUsername}>{userProfile.username}</div>
          </div>
        </div>

        <div className={styles.creatorRole}>
          <div className={styles.roleLabel}>Creator role</div>
          <div className={styles.roleValue}>{userProfile.creatorTier}</div>
        </div>

        <div className={styles.divider}></div>
      </div>

      {/* Accounts Section */}
      <div className={styles.accountsSection}>
        <h2>Accounts</h2>

        <div className={styles.menuList}>
          {accountItems.map((item) => (
            <div key={item.id} className={styles.menuItem}>
              <div className={styles.menuIcon}>{item.icon}</div>
              <div className={styles.menuLabel}>{item.label}</div>
              <div className={styles.menuArrow}>{'>'}</div>
            </div>
          ))}
        </div>

        <div className={styles.divider}></div>
      </div>

      {/* Contacts Section */}
      <div className={styles.contactsSection}>
        <h2>Contacts</h2>

        <div className={styles.menuList}>
          {contactItems.map((item) => (
            <div key={item.id} className={styles.menuItem}>
              <div className={styles.menuIcon}>{item.icon}</div>
              <div className={styles.menuLabel}>{item.label}</div>
              <div className={styles.menuArrow}>{'>'}</div>
            </div>
          ))}
        </div>

        <div className={styles.divider}></div>
      </div>
    </div>
  );
}