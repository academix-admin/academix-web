'use client';

import CachedSuspense from '@/components/CachedSuspense';
import styles from './page.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import LandingHeader from '@/components/LandingHeader/LandingHeader';
import LandingFooter from '@/components/LandingFooter/LandingFooter';
import HeroLanding from '@/components/HeroLanding/HeroLanding';
import LandingAccounting from '@/components/LandingAccounting/LandingAccounting';
import LandingShortAbout from '@/components/LandingShortAbout/LandingShortAbout';
import LandingRoles from '@/components/LandingRoles/LandingRoles';
import LandingMoreAbout from '@/components/LandingMoreAbout/LandingMoreAbout';
import LandingFeatures from '@/components/LandingFeatures/LandingFeatures';
import LandingAcademixCalculator from '@/components/LandingAcademixCalculator/LandingAcademixCalculator';
import Instructions from './(public)/instructions/page';
import Payout from './(public)/payout/page';
import Rates from './(public)/rates/page';

export default function LandingPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`${styles.landingContainer} ${styles[`landingContainer_${theme}`]}`}>
      <LandingHeader />
      <HeroLanding />
      <LandingAccounting />
      <LandingShortAbout />
      <LandingRoles />
      {/* <LandingMoreAbout /> */}
      <CachedSuspense cached={true}>
        <Instructions searchParams={Promise.resolve({ req: 'landing' })} />
      </CachedSuspense>
      <LandingFeatures />
      <CachedSuspense cached={true}>
        <Payout searchParams={Promise.resolve({ req: 'landing' })} />
        <Rates searchParams={Promise.resolve({ req: 'landing'})} />
      </CachedSuspense>
      <LandingFooter />
    </div>
  );
}


