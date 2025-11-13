'use client';

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
import Payout from './(public)/payout/page';

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
      <LandingMoreAbout />
      <LandingFeatures />
      <Payout searchParams={Promise.resolve({ req: 'landing' })} />
      <LandingFooter />
    </div>
  );
}


