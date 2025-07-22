'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './page.module.css';
import HeroLanding from '@/components/HeroLanding/HeroLanding';
import LandingAccounting from '@/components/LandingAccounting/LandingAccounting';
import LandingShortAbout from '@/components/LandingShortAbout/LandingShortAbout';
import LandingRoles from '@/components/LandingRoles/LandingRoles';
import LandingMoreAbout from '@/components/LandingMoreAbout/LandingMoreAbout';
import LandingFeatures from '@/components/LandingFeatures/LandingFeatures';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  return (
    <>
    <HeroLanding />
    <LandingAccounting />
    <LandingShortAbout />
    <LandingRoles />
    <LandingMoreAbout />
    <LandingFeatures />
    </>
  );
}

