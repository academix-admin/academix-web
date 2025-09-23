// 'use client';
//
// import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useTheme } from '@/context/ThemeContext';
// import { useLanguage } from '@/context/LanguageContext';
// import styles from './payment-type.module.css';
// import { useNav } from "@/lib/NavigationStack";
//
//
// interface PaymentTypeProps {
//   onTopUp: (value: boolean) => void;
//   onWithdraw: (value: boolean) => void;
//   initialTopUp?: boolean;
//   initialWithdraw?: boolean;
//   modifyTopUp?: boolean;
//   modifyWithdraw?: boolean;
// }
//
// export default function PaymentType({ onTopUp, onWithdraw, initialTopUp = false, initialWithdraw = false, modifyTopUp = true, modifyWithdraw = true }: PaymentTypeProps) {
//   const { theme } = useTheme();
//   const { t, lang } = useLanguage();
//
//   const [ topUp , setTopUp ] = useState(initialTopUp);
//   const [ withdraw , setWithdraw ] = useState(initialWithdraw);
//
//   useEffect(() => {
//     if(!topUp)return;
//      onTopUp(topUp);
//   }, [topUp]);
//
//   useEffect(() => {
//     if(!withdraw)return;
//      onWithdraw(withdraw);
//   }, [withdraw]);
//
//   const changeTopUp = () =>{
//     if(!modifyTopUp) return;
//     setTopUp(prev => !prev);
//   }
//
//   const changeWithdraw = () =>{
//     if(!modifyWithdraw) return;
//     setWithdraw(prev => !prev);
//   }
//
//   return (
//     <div className={styles.experienceContainer}>
//       <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
//         {t('payment_type_text')}
//       </h2>
//
//       <div className={styles.formGroup}>
//         <div className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`}>
//
//         </div>
//       </div>
//     </div>
//   );
// }
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './payment-type.module.css';
import { useNav } from "@/lib/NavigationStack";

interface PaymentTypeProps {
  onTopUp: (value: boolean) => void;
  onWithdraw: (value: boolean) => void;
  initialTopUp?: boolean;
  initialWithdraw?: boolean;
  modifyTopUp?: boolean;
  modifyWithdraw?: boolean;
}

export default function PaymentType({ onTopUp, onWithdraw, initialTopUp = false, initialWithdraw = false, modifyTopUp = true, modifyWithdraw = true }: PaymentTypeProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();

  const [ topUp , setTopUp ] = useState(initialTopUp);
  const [ withdraw , setWithdraw ] = useState(initialWithdraw);

  useEffect(() => {
    if(!topUp)return;
     onTopUp(topUp);
  }, [topUp]);

  useEffect(() => {
    if(!withdraw)return;
     onWithdraw(withdraw);
  }, [withdraw]);

  const changeTopUp = () =>{
    if(!modifyTopUp) return;
    setTopUp(prev => !prev);
  }

  const changeWithdraw = () =>{
    if(!modifyWithdraw) return;
    setWithdraw(prev => !prev);
  }

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('payment_type_text')}
      </h2>

      <div className={styles.formGroup}>
        {/* Top Up Option */}
        <div
          className={`${styles.selectButton} ${styles[`selectButton_${theme}`]} ${topUp ? styles.selectButton_active : ''}`}
          onClick={changeTopUp}
        >
          <div className={`${styles.switch} ${topUp ? styles.switch_active : ''} ${styles[`switch_${theme}`]}`}>
             <div className={`${styles.switchHandle} ${topUp ? styles.switchHandle_active : ''} ${styles[`switchHandle_${theme}`]}`} />
          </div>
          <span className={`${styles.optionText} ${styles[`optionText_${theme}`]}`}>
            {t('top_up_text')}
          </span>

        </div>

        {/* Withdraw Option */}
        <div
          className={`${styles.selectButton} ${styles[`selectButton_${theme}`]} ${withdraw ? styles.selectButton_active : ''}`}
          onClick={changeWithdraw}
        >
          <div className={`${styles.switch} ${withdraw ? styles.switch_active : ''} ${styles[`switch_${theme}`]}`}>
            <div className={`${styles.switchHandle} ${withdraw ? styles.switchHandle_active : ''} ${styles[`switchHandle_${theme}`]}`} />
          </div>
          <span className={`${styles.optionText} ${styles[`optionText_${theme}`]}`}>
            {t('withdraw_text')}
          </span>
        </div>
      </div>
    </div>
  );
}