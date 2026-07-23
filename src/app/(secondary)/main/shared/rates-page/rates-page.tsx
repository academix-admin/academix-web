'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './rates-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import { capitalize } from '@/utils/textUtils';
import Rates from '@/app/(public)/rates/page';
import { Header } from '@academix-admin/header';



export default function RatesPage() {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>


      <Header title={t('rates_text')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Rates searchParams={Promise.resolve({ req: 'payment' })} />
      </CachedSuspense>
    </main>
  );
}