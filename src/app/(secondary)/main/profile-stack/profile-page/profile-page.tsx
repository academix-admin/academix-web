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
import ProfileLinks from './profile-links/profile-links'
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


    // we have an error but not all loaded yet
    const error = loadedCount < 4 && errorCount > 0;

    // we can show loading
    const loading = loadedCount < 4 && errorCount === 0 && loadingCount > 0;

    // show ui
    const show = !error && !loading;

  return (
    <div className={styles.mainContainer}>

      {show && (<ProfileTitle onStateChange={(state) => handleStateChange('profileTitle', state)}/>)}
      {show && (<ProfileOverview onStateChange={(state) => handleStateChange('profileOverview', state)}/>)}
      {show && (<ProfileAccounts onStateChange={(state) => handleStateChange('profileAccounts', state)}/>)}
      {show && (<ProfileLinks onStateChange={(state) => handleStateChange('profileLinks', state)}/>)}
      {show && (<ProfileContacts onStateChange={(state) => handleStateChange('profileContacts', state)}/>)}

                 <div>
                 {error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={()=> console.log('error')} />)}
                       {loading && (<LoadingView />)}
                 </div>

    </div>
  );
}