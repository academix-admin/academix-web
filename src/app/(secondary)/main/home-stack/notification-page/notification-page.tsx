'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './notification-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@academix-admin/navigation-stack";
import { capitalize } from '@/utils/textUtils';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { useDemandState } from '@academix-admin/state-stack';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { PaginateModel } from '@/models/paginate-model';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { StateStack } from '@academix-admin/state-stack';
import { Header } from '@academix-admin/header';



export default function NotificationPage() {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();



  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>


      <Header title={t('notification_text')} theme={theme} onBack={goBack} />

      <div className={styles.innerBody}>
      </div>
    </main>
  );
}