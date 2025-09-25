'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './redeem-codes.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalizeWords } from '@/utils/textUtils';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';

export default function RedeemCodes() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();
  const { userData, userData$ } = useUserData();

  const [fetchedUserData, setFetchedUserData] = useState<UserData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => nav.pop();

  const fetchUserData = useCallback(async (): Promise<void> => {
    if (fetchedUserData || !userData) return;

    try {
      setFetchLoading(true);
      setError('');

      const { data, error } = await supabaseBrowser.rpc("get_user_record", {
        p_user_id: userData.usersId
      });

      if (error) {
        console.error("[UserFetch] error:", error);
        setError(t('error_occurred'));
        return;
      }

      const getUserData = new UserData(data);
      setFetchedUserData(getUserData);
      setFetchLoading(false);
      userData$.set(getUserData);
    } catch (err) {
      console.error("[UserFetch] error:", err);
      setFetchLoading(false);
      setError(t('error_occurred'));
    }
  }, [userData, fetchedUserData, t]);

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('redeem_codes')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        {fetchLoading && !error && !fetchedUserData && <LoadingView />}

        {!fetchLoading && !error && !fetchedUserData && (
          <ErrorView
            text={error}
            buttonText="Try Again"
            onButtonClick={fetchUserData}
          />
        )}

        {!fetchLoading && !fetchedUserData && !error && (
          <NoResultsView
            text="No result"
            buttonText="Try Again"
            onButtonClick={fetchUserData}
          />
        )}

        {fetchedUserData && (
          <>
          </>
        )}
      </div>
    </main>
  );
}