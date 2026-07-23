'use client';

import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './terms-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import Terms from '@/app/(public)/terms/page';
import { Header } from '@academix-admin/header';

export default function TermsPage() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('terms_of_service')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Terms searchParams={Promise.resolve({ req: 'profile' })} />
      </CachedSuspense>
    </main>
  );
}
