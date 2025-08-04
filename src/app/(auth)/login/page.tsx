'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import Lottie from 'lottie-react';

const LoginLottie = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch('/assets/lottie/login_lottie_1.json')
      .then(res => res.json())
      .then(setAnimationData)
      .catch(err => console.error('Failed to load Lottie JSON:', err));
  }, []);

  if (!animationData) return <p>Loading...</p>;

  return <Lottie className={styles.welcome_wrapper} animationData={animationData} loop autoplay />;
};

export default function Login() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>

     <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
             <div className={styles.headerContent}>
               {canGoBack && (
                 <button
                   className={styles.backButton}
                   onClick={() => router.back()}
                   aria-label="Go back"
                 >
                   <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path
                       d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                       fill="currentColor"
                     />
                   </svg>
                 </button>
               )}

               <h1 className={styles.title}>{t('login')}</h1>

               <Link className={styles.logoContainer} href="/">
                 <Image
                   className={styles.logo}
                   src="/assets/image/academix-logo.png"
                   alt="Academix Logo"
                   width={40}
                   height={40}
                   priority
                 />
               </Link>
             </div>
           </header>


      <div className= {styles.innerBody}>

      <LoginLottie />


      </div>
    </main>
  );
}
