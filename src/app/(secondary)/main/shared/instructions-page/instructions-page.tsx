'use client';

import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './instructions-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import Instructions from '@/app/(public)/instructions/page';
import { Header } from '@academix-admin/header';

export default function InstructionsPage() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('instructions_text')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Instructions searchParams={Promise.resolve({ req: 'profile' })} />
      </CachedSuspense>
    </main>
  );
}
