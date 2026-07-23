'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './rewards-info.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import { capitalize } from '@/utils/textUtils';
import Rewards from '@/app/(public)/rewards/page';
import { Header } from '@academix-admin/header';

interface RewardsInfoProps {
  sectionId?: string | null;
}

export default function RewardsInfo(props: RewardsInfoProps) {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { sectionId } = props;

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>


      <Header title={t('reward_text')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Rewards searchParams={Promise.resolve({ req: 'reward', to: sectionId })} />
      </CachedSuspense>
    </main>
  );
}