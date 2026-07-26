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
import { useNav } from "@academix-admin/navigation-stack";
import PaymentTitle from './payment-title/payment-title'
import UserBalance from './user-balance/user-balance'
import PaymentAction from './payment-action/payment-action'
import PaymentTransactions from './payment-transactions/payment-transactions'
import { useComponentState, ComponentStateProps, getComponentStatus, useSettledReveal } from '@/hooks/use-component-state';
import LoadingView from '@/components/LoadingView/LoadingView'
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';

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

    // Title/balance/action show immediately; the transactions list stays mounted (fetching)
    // but hidden until loads settle, then reveals — no empty-then-fill on a cold start.
    const revealed = useSettledReveal(loadedCount);

  return (
    <div className={styles.mainContainer}>

     <PaymentTitle onStateChange={(state) => handleStateChange('paymentTitle', state)}/>
     <UserBalance onStateChange={(state) => handleStateChange('userBalance', state)}/>
     <PaymentAction onStateChange={(state) => handleStateChange('paymentAction', state)}/>
     <div style={{ display: revealed ? 'contents' : 'none' }}>
       <PaymentTransactions onStateChange={(state) => handleStateChange('paymentTransactions', state)}/>
     </div>

           <div>
           {revealed && error && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={()=> console.log('error')} />)}
                 {!revealed && (<LoadingView />)}
           </div>

    </div>
  );
}