'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './home-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import HomeTitle from "./home-title/home-title";
import HomeExperience from "./home-experience/home-experience";
import HomePerformance from "./home-performance/home-performance";
import HomeStatistics from "./home-statistics/home-statistics";
import HomeQuizHistory from "./home-quiz-history/home-quiz-history";




export default function HomePage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`${styles.mainContainer} ${styles[`mainContainer_${theme}`]}`}>

      <HomeTitle />
      <HomeExperience />
      <HomePerformance />
      <HomeStatistics />
      <HomeQuizHistory />
    </div>
  );
}