'use client';

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './rewards-info.module.css';
import { useNav } from "@/lib/NavigationStack";
import { capitalize } from '@/utils/textUtils';
import Rewards from '@/app/(public)/rewards/page';

interface RewardsInfoProps {
  sectionId?: string | null;
}

export default function RewardsInfo(props: RewardsInfoProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { sectionId } = props;

  const goBack = async () => {
    await nav.pop();
  };

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
          <h1 className={styles.title}>{t('reward_text')}</h1>
        </div>
      </header>

      <Suspense>
        <Rewards searchParams={Promise.resolve({ req: 'reward', to: sectionId })} />
      </Suspense>
    </main>
  );
}