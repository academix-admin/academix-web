'use client';

import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './help-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import Help from '@/app/(public)/help/page';
import { Header } from '@academix-admin/header';

export default function HelpPage() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('help_text')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Help searchParams={Promise.resolve({ req: 'profile' })} />
      </CachedSuspense>
    </main>
  );
}
