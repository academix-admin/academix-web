'use client';

import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './about-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import About from '@/app/(public)/about/page';
import { Header } from '@academix-admin/header';

export default function AboutPage() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('about_text')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <About searchParams={Promise.resolve({ req: 'profile' })} />
      </CachedSuspense>
    </main>
  );
}
