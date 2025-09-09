'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './payment-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import PaymentTitle from './payment-title/payment-title'
import UserBalance from './user-balance/user-balance'
import PaymentAction from './payment-action/payment-action'
import PaymentTransactions from './payment-transactions/payment-transactions'
import { useComponentState, ComponentStateProps, getComponentStatus } from '@/hooks/use-component-state';

export default function PaymentPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

    const { compState, handleStateChange, getComponentState, resetComponentState } = useComponentState();

    const { loadedCount, errorCount, noneCount, loadingCount } = useMemo(
      () => getComponentStatus(compState),
      [compState]
    );

    // we have an error but not all loaded yet
    const error = loadedCount < 4 && errorCount > 0;

    // we can show loading
    const loading = loadedCount < 4 && errorCount === 0 && loadingCount > 0;

    // show ui
    const show = !error && !loading;

  return (
    <div className={styles.mainContainer}>

     {show && (<PaymentTitle onStateChange={(state) => handleStateChange('paymentTitle', state)}/>)}
     {show && (<UserBalance onStateChange={(state) => handleStateChange('userBalance', state)}/>)}
     {show && (<PaymentAction onStateChange={(state) => handleStateChange('paymentAction', state)}/>)}
     {show && (<PaymentTransactions onStateChange={(state) => handleStateChange('paymentTransactions', state)}/>)}

           <div>
           {error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={()=> console.log('error')} />)}
                 {loading && (<LoadingView />)}
           </div>

    </div>
  );
}