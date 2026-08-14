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
import { useNav } from "@academix-admin/navigation-stack";
import { useComponentState, ComponentStateProps, getComponentStatus, useSettledReveal } from '@/hooks/use-component-state';
import ProfileTitle from './profile-title/profile-title'
import ProfileOverview from './profile-overview/profile-overview'
import ProfileAccounts from './profile-accounts/profile-accounts'
import ProfileContacts from './profile-contacts/profile-contacts'
import ProfileLegal from './profile-legal/profile-legal'
import ProfileLinks from './profile-links/profile-links'
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';


export default function ProfilePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

      const { compState, handleStateChange, getComponentState, resetComponentState, retryToken, retry } = useComponentState();

      const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
        () => getComponentStatus(compState),
        [compState]
      );


    // we have an error but not all loaded yet
    // Page-level error ONLY on total failure (nothing loaded) — never stack an error over loaded content.
    const error = loadedCount === 0 && errorCount > 0;

    // Reveal the body sections together once loads settle. Sections stay mounted (fetching)
    // while hidden — the previous `{show && ...}` gating UNMOUNTED them, so they never
    // fetched while hidden.
    const revealed = useSettledReveal(loadedCount);

  return (
    <div className={styles.mainContainer}>

      <ProfileTitle onStateChange={(state) => handleStateChange('profileTitle', state)}/>

      <div key={retryToken} style={{ display: revealed ? 'contents' : 'none' }}>
        <ProfileOverview onStateChange={(state) => handleStateChange('profileOverview', state)}/>
        <ProfileAccounts onStateChange={(state) => handleStateChange('profileAccounts', state)}/>
        <ProfileLinks onStateChange={(state) => handleStateChange('profileLinks', state)}/>
        <ProfileContacts onStateChange={(state) => handleStateChange('profileContacts', state)}/>
        <ProfileLegal onStateChange={(state) => handleStateChange('profileLegal', state)}/>
      </div>

                 <div>
                 {revealed && error && (<ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={retry} />)}
                       {!revealed && (<LoadingView />)}
                 </div>

    </div>
  );
}