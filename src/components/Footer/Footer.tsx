'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.footerLayout}>

    </div>
  );
}
