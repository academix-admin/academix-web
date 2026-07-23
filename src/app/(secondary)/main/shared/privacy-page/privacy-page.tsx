'use client';

import CachedSuspense from '@/components/CachedSuspense';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './privacy-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import Privacy from '@/app/(public)/privacy/page';
import { Header } from '@academix-admin/header';

export default function PrivacyPage() {
  const { theme, applyTheme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();

  const goBack = async () => {
    await nav.pop();
  };

  return (
    <main className={`${applyTheme(styles, 'container')}`}>
      <Header title={t('privacy_policy')} theme={theme} onBack={goBack} />

      <CachedSuspense cached={true}>
        <Privacy searchParams={Promise.resolve({ req: 'profile' })} />
      </CachedSuspense>
    </main>
  );
}
