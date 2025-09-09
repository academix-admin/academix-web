'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './profile-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { useComponentState, ComponentStateProps, getComponentStatus } from '@/hooks/use-component-state';
import ProfileTitle from './profile-title/profile-title'
import ProfileOverview from './profile-overview/profile-overview'
import ProfileAccounts from './profile-accounts/profile-accounts'
import ProfileContacts from './profile-contacts/profile-contacts'
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';


export default function ProfilePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

      const { compState, handleStateChange, getComponentState, resetComponentState } = useComponentState();

      const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
        () => getComponentStatus(compState),
        [compState]
      );




  return (
    <div className={styles.mainContainer}>

      <ProfileTitle onStateChange={(state) => handleStateChange('profileTitle', state)}/>
      <ProfileOverview onStateChange={(state) => handleStateChange('profileOverview', state)}/>
      <ProfileAccounts onStateChange={(state) => handleStateChange('profileAccounts', state)}/>
      <ProfileContacts onStateChange={(state) => handleStateChange('profileContacts', state)}/>

    </div>
  );
}