'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './payout-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import { capitalize } from '@/utils/textUtils';
import Payout from '@/app/(public)/payout/page';
import { Header } from '@academix-admin/header';



export default function PayoutPage() {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>


      <Header title={t('payout_text')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Payout searchParams={Promise.resolve({ req: 'profile' })} />
      </CachedSuspense>
    </main>
  );
}