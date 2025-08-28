'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import Lottie from 'lottie-react';


export default function Main() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();


  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>


      <div className= {styles.innerBody}>

               <h1 className={styles.title}>{t('created_account_successfully')}</h1>


      </div>
    </main>
  );
}
