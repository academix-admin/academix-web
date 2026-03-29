'use client';

import React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './payment-transactions.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendTransactionModel } from '@/models/transaction-model';
import { TransactionModel } from '@/models/transaction-model';
import { PaginateModel } from '@/models/paginate-model';
import Image from 'next/image';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { usePinnedState } from '@/hooks/pinned-state-hook';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';
import { useNav, usePageLifecycle } from "@/lib/NavigationStack";
import { transactionSubscriptionManager } from '@/lib/managers/TransactionSubscriptionManager';
import { TransactionChangeEvent } from '@/lib/managers/TransactionSubscriptionManager';
import { poolsSubscriptionManager } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import { PoolChangeEvent } from '@/lib/managers/PoolsQuizTopicSubscriptionManager';
import CurrencySymbol from '@/components/CurrencySymbol/CurrencySymbol';


export default function PaymentTransactions({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData } = useUserData();
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const nav = useNav();

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [transactionModels, demandTransactionModels, setTransactionModels, { isHydrated }] = useTransactionModel(lang);

  useEffect(() => {
    // Only provide when hydrated AND we have data (either from storage or from demand)
    if (!isHydrated) return;

    const cleanup = nav.provideObject(
      'getTransactionById',
      () => (transactionId: string) => transactionModels.find(t => t.transactionId === transactionId),
      { global: true, scope: 'payment-transactions' }
    );
    return cleanup;
  }, [isHydrated, transactionModels, nav]);

  const handlePoolChange = (event: PoolChangeEvent) => {
    const { eventType, newRecord: quizPool, oldRecordId: poolsId } = event;
    if (eventType === 'DELETE' && poolsId) {
      const updatedModels = transactionModels.filter(
        (m) => m.poolsId !== poolsId
      );
      setTransactionModels(updatedModels);
    }
  };

  // Subscribe to changes
  const handleTransactionChange = (event: TransactionChangeEvent) => {
    const { eventType, newRecord: transaction, oldRecordId: transactionId } = event;

    if (eventType === 'DELETE' && transactionId) {
      // 🔹 Remove deleted pool
      const updatedModels = transactionModels.filter(
        (m) => m.transactionId !== transactionId
      );
      setTransactionModels(updatedModels);
    } else if (transaction) {

      if (shouldRemoveTransactionSubscription(transaction)) {
        transactionSubscriptionManager.removeTransactionId(transaction.transactionId);
      }

      const updatedModels = transactionModels.map((m) => {
        if (m.transactionId === transaction.transactionId) {
          const transactionModel = TransactionModel.from(m);
          return transactionModel.copyWith({ transactionReceiverStatus: transaction.transactionReceiverStatus, transactionSenderStatus: transaction.transactionSenderStatus });
        }
        return m;
      });

      setTransactionModels(updatedModels);
    }
  };

  function shouldRemoveTransactionSubscription(updatedTransaction?: TransactionModel | null): boolean {
    if (!updatedTransaction) return false;

    const senderStatus = updatedTransaction.transactionSenderStatus;
    const receiverStatus = updatedTransaction.transactionReceiverStatus;

    return senderStatus != 'TransactionStatus.pending' && receiverStatus != 'TransactionStatus.pending';
  }

  useEffect(() => {
    transactionSubscriptionManager.attachListener(handleTransactionChange);

    return () => {
      transactionSubscriptionManager.removeListener(handleTransactionChange);
    };
  }, [handleTransactionChange]);

  useEffect(() => {
    poolsSubscriptionManager.attachListener(handlePoolChange);

    return () => {
      poolsSubscriptionManager.removeListener(handlePoolChange);
    };
  }, [handlePoolChange]);

  useEffect(() => {
    if (!transactionModels?.length) return;

    let shouldUpdate = false;

    for (const transaction of transactionModels) {
      const senderStatus = transaction.transactionSenderStatus;
      const receiverStatus = transaction.transactionReceiverStatus;

      if (senderStatus === 'TransactionStatus.pending' || receiverStatus === 'TransactionStatus.pending') {
        const added = transactionSubscriptionManager.addTransactionId(
          transaction.transactionId,
          {
            override: false,
            update: false
          }
        );
        shouldUpdate = shouldUpdate || added;
      }
    }

    if (shouldUpdate) {
      transactionSubscriptionManager.updateSubscription();
    }
  }, [transactionModels]);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callPaginate();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [transactionModels, paginateModel]);

  const fetchTransactionModels = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<TransactionModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_user_transactions", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_after_transactions: paginateModel.toJson(),
      });

      if (error) {
        console.error("[TransactionModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendTransactionModel) => new TransactionModel(row));
    } catch (err) {
      console.error("[TransactionModel] error:", err);
      onStateChange?.('error');
      setTransactionsLoading(false);
      return [];
    }
  }, [lang]);

  const extractLatest = (newTransactionModels: TransactionModel[]) => {
    if (newTransactionModels.length > 0) {
      const lastItem = newTransactionModels[newTransactionModels.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processTransactionModelsPaginate = (newTransactionModels: TransactionModel[]) => {
    const oldTransactionModelIds = transactionModels.map((e) => e.transactionId);
    const updatedTransactionModels = [...transactionModels];

    for (const transaction of newTransactionModels) {
      if (!oldTransactionModelIds.includes(transaction.transactionId)) {
        updatedTransactionModels.push(transaction);
      }
    }

    setTransactionModels(updatedTransactionModels);
  };

  useEffect(() => {
    if (!userData) return;

    demandTransactionModels(async ({ get, set }) => {
      const models = await fetchTransactionModels(userData, 10, new PaginateModel());
      extractLatest(models);
      set(models);
      setFirstLoaded(true);
      onStateChange?.('data');
    });
  }, [demandTransactionModels, userData]);

  useEffect(() => {
    if (transactionModels.length > 0) {
      onStateChange?.('data');
    }
  }, [transactionModels]);

  const callPaginate = async () => {
    if (!userData || transactionModels.length <= 0 || isRefreshing) return;
    setTransactionsLoading(true);
    const models = await fetchTransactionModels(userData, 20, paginateModel);
    setTransactionsLoading(false);
    if (models.length > 0) {
      extractLatest(models);
      processTransactionModelsPaginate(models);
    }
  };

  const refreshData = async () => {
    if (!userData || isRefreshing) return;
    try {
      setIsRefreshing(true);
      const models = await fetchTransactionModels(userData, 10, new PaginateModel());
      setIsRefreshing(false);
      if (models.length > 0) {
        extractLatest(models);
        setTransactionModels(models);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsRefreshing(false);
    }
  };

  // Format date to match the screenshot (e.g., "Aug 15 at 5:20PM")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    const formattedDate = date.toLocaleDateString('en-US', options);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions)
      .toLowerCase()
      .replace(' ', '');

    return `${formattedDate} at ${formattedTime}`;
  };

  const getTransactionTypeText = (transactionType: string | undefined | null): string => {
    switch (transactionType) {
      case 'TransactionType.top_up':
        return t('top_up_text');
      case 'TransactionType.withdraw':
        return t('withdraw_text');
      case 'TransactionType.payment':
        return t('payment_text');
      case 'TransactionType.quiz':
        return t('quiz_payment_text');
      case 'TransactionType.participation':
        return t('participation_fee_text');
      case 'TransactionType.buy_in':
        return t('buy_in_text');
      default:
        return t('transaction_text');
    }
  };


  const getTransactionStatus = (transaction: TransactionModel): string | null => {
    switch (transaction.transactionType) {
      case 'TransactionType.top_up':
        return transaction.transactionSenderStatus;
      case 'TransactionType.withdraw':
        return transaction.transactionReceiverStatus;
      case 'TransactionType.quiz':
        return transaction.transactionReceiverStatus;
      case 'TransactionType.participation':
        return transaction.transactionReceiverStatus;
      case 'TransactionType.buy_in':
        return transaction.transactionSenderStatus;
      default:
        return null;
    }
  };


  const getTransactionAmount = (transaction: TransactionModel): number => {
    switch (transaction.transactionType) {
      case 'TransactionType.top_up':
        return transaction.transactionReceiverAmount;
      case 'TransactionType.withdraw':
        return transaction.transactionSenderAmount;
      case 'TransactionType.payment':
        return 0;
      case 'TransactionType.quiz':
        return transaction.transactionReceiverAmount;
      case 'TransactionType.participation':
        return transaction.transactionReceiverAmount;
      case 'TransactionType.buy_in':
        return transaction.transactionSenderAmount;
      default:
        return 0;
    }
  };

  const getPaymentMethodName = (paymentMethod: string | undefined | null): string => {
    switch (paymentMethod) {
      case 'PaymentMethod.mobile_money':
        return t('mobile_money_text');
      case 'PaymentMethod.e_naira':
        return t('e_naira_text');
      case 'PaymentMethod.private_account':
        return t('private_account_text');
      case 'PaymentMethod.opay':
        return t('opay_text');
      case 'PaymentMethod.academix_coin':
        return t('academix_coin_text');
      default:
        return t('account_text');
    }
  };

  const getTransactionStatusClass = (status: string | undefined | null): string => {
    switch (status) {
      case 'TransactionStatus.success':
        return t('completed_text');
      case 'TransactionStatus.failed':
        return t('failed_text');
      case 'TransactionStatus.pending':
        return t('processing_text');
      case 'TransactionStatus.cancelled':
        return t('cancelled_text');
      default:
        return t('unknown_status_text');
    }
  };

  const getStatusClass = (status: string | null, type: string | null): string => {
    switch (status) {
      case 'TransactionStatus.success':
        if(type === 'TransactionType.withdraw' || type === 'TransactionType.buy_in' || type === 'TransactionType.payment' || type === 'TransactionType.quiz') {
          return styles.statusDeducted;
        }
        return styles.statusCompleted;
      case 'TransactionStatus.failed':
        return styles.statusFailed;
      case 'TransactionStatus.pending':
        return styles.statusPending;
      case 'TransactionStatus.cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusUnknown;
    }
  };

  const getTransactionIcon = (transactionType: string | undefined | null): React.JSX.Element => {
    switch (transactionType) {
      case 'TransactionType.top_up':
        return <svg className={styles.transactionIcon} fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16.432 6.75L19.637 3.545C20 5.009 20 7.04 20 10C20 14.714 20 17.071 18.535 18.535C17.072 20 14.714 20 10 20C5.286 20 2.929 20 1.464 18.535C0 17.072 0 14.714 0 10C0 5.286 0 2.929 1.464 1.464C2.93 0 5.286 0 10 0C12.96 0 14.991 -8.9407e-08 16.455 0.363L13.25 3.568V3C13.25 2.40326 13.0129 1.83097 12.591 1.40901C12.169 0.987053 11.5967 0.75 11 0.75C10.4033 0.75 9.83097 0.987053 9.40901 1.40901C8.98705 1.83097 8.75 2.40326 8.75 3V9C8.75 9.59674 8.98705 10.169 9.40901 10.591C9.83097 11.0129 10.4033 11.25 11 11.25H17C17.5967 11.25 18.169 11.0129 18.591 10.591C19.0129 10.169 19.25 9.59674 19.25 9C19.25 8.40326 19.0129 7.83097 18.591 7.40901C18.169 6.98705 17.5967 6.75 17 6.75H16.432Z"
            fill="currentColor"
          />
          <path
            d="M17 9.75003C17.1989 9.75003 17.3897 9.67101 17.5303 9.53036C17.671 9.38971 17.75 9.19894 17.75 9.00003C17.75 8.80112 17.671 8.61035 17.5303 8.4697C17.3897 8.32905 17.1989 8.25003 17 8.25003H12.81L19.53 1.53003C19.6625 1.38785 19.7346 1.19981 19.7312 1.00551C19.7277 0.811206 19.649 0.625821 19.5116 0.488408C19.3742 0.350995 19.1888 0.272283 18.9945 0.268855C18.8002 0.265426 18.6122 0.33755 18.47 0.47003L11.75 7.19003V3.00003C11.75 2.80112 11.671 2.61035 11.5303 2.4697C11.3897 2.32905 11.1989 2.25003 11 2.25003C10.8011 2.25003 10.6103 2.32905 10.4697 2.4697C10.329 2.61035 10.25 2.80112 10.25 3.00003V9.00003C10.25 9.41403 10.586 9.75003 11 9.75003H17Z"
            fill="currentColor"
          />
        </svg>;
      default:
        return <svg className={styles.transactionIcon} fill="none" height="14" viewBox="0 0 19 14" width="19" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3.26562 0C2.39953 0 1.5689 0.33802 0.956479 0.939699C0.344056 1.54138 0 2.35743 0 3.20833V4.66667H19V3.20833C19 2.35743 18.6559 1.54138 18.0435 0.939699C17.4311 0.33802 16.6005 0 15.7344 0H3.26562ZM19 5.83333H0V10.7917C0 11.6426 0.344056 12.4586 0.956479 13.0603C1.5689 13.662 2.39953 14 3.26562 14H15.7344C16.6005 14 17.4311 13.662 18.0435 13.0603C18.6559 12.4586 19 11.6426 19 10.7917V5.83333ZM13.6562 10.5H16.0312C16.1887 10.5 16.3397 10.5615 16.4511 10.6709C16.5624 10.7802 16.625 10.9286 16.625 11.0833C16.625 11.238 16.5624 11.3864 16.4511 11.4958C16.3397 11.6052 16.1887 11.6667 16.0312 11.6667H13.6562C13.4988 11.6667 13.3478 11.6052 13.2364 11.4958C13.1251 11.3864 13.0625 11.238 13.0625 11.0833C13.0625 10.9286 13.1251 10.7802 13.2364 10.6709C13.3478 10.5615 13.4988 10.5 13.6562 10.5Z"
            fill="currentColor" />
        </svg>;
    }
  };

  const handleTransactionClick = (transaction: TransactionModel) => {
    nav.push('view_transaction', { transactionId: transaction.transactionId });
  };

  if (!firstLoaded && transactionModels.length <= 0) return null;

  return (
    <div className={styles.historyContainer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className={`${styles.historyTitle} ${styles[`historyTitle_${theme}`]}`} style={{ margin: 0 }}>
          {t('transactions_text')}
        </h2>
        <button
          onClick={() => refreshData()}
          className={`${styles[`refreshIcon_${theme}`]}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: isRefreshing ? 'default' : 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isRefreshing ? 0.6 : 1
          }}
          aria-label="Refresh transactions"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <span className={`${styles.refreshSpinner} ${styles[`refreshSpinner_${theme}`]}`}></span>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          )}
        </button>
      </div>

      <div className={styles.historyList}>
        {transactionModels.map((transaction, index) => (
          <div
            key={index}
            className={`${styles.historyItemContainer}`}
            onClick={() => handleTransactionClick(transaction)}
          >
            <div className={styles.historyLayout}>
              <div className={styles.transactionIcon}>
                {getTransactionIcon(transaction.transactionType)}
              </div>
              <div className={styles.historyItem}>
                <div className={styles.historyMain}>
                  <span className={`${styles.topicName} ${styles[`topicName_${theme}`]}`}>
                    {getPaymentMethodName(transaction.paymentProfileSenderDetails?.paymentMethodDetails.paymentMethodChecker)}
                    {' '}
                    {getTransactionTypeText(transaction.transactionType)}
                  </span>
                  <div className={styles.amountContainer}>
                    <CurrencySymbol className={`${styles.currencyIcon} ${getStatusClass(getTransactionStatus(transaction), transaction.transactionType)}`} size={20} />
                    <span className={`${styles.amount} ${getStatusClass(getTransactionStatus(transaction), transaction.transactionType )}`}>
                      {getTransactionAmount(transaction).toFixed(2).replace('-', '').replace('.00', '')}
                    </span>
                  </div>
                </div>

                <div className={styles.historyContent}>
                  <div className={styles.historyDetails}>
                    <span className={`${styles.historyDetail} ${styles[`historyDetails_${theme}`]}`}>
                      {formatDate(transaction.transactionCreatedAt)}
                    </span>
                    <span className={`${styles.historyDetail} ${styles[`historyDetails_${theme}`]}`}>
                      {getPaymentMethodName(transaction.paymentProfileSenderDetails?.paymentMethodDetails.paymentMethodChecker)}
                      {' '}
                      {getTransactionTypeText(transaction.transactionType)}
                    </span>
                    <span
                      style={{ fontStyle: 'normal', textDecoration: 'none' }}
                      className={`${styles.historyTime} ${getStatusClass(getTransactionStatus(transaction), null)}`}
                    >
                      {capitalize(getTransactionStatusClass(getTransactionStatus(transaction)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {index < transactionModels.length - 1 && (
              <div className={`${styles.divider} ${styles[`divider_${theme}`]}`}></div>
            )}
          </div>
        ))}
      </div>

      {!transactionsLoading && transactionModels.length === 0 &&
        <span className={`${styles.refreshContainer} ${styles[`refreshContainer_${theme}`]}`}>
          {t('transaction_empty')}
          <span role="button" onClick={() => refreshData()} className={`${styles.refreshButton} ${styles[`refreshButton_${theme}`]}`}>
            {t('refresh')}
          </span>
        </span>
      }

      {transactionModels.length > 0 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
      {transactionsLoading && <div className={styles.moreSpinnerContainer}><span className={styles.moreSpinner}></span></div>}
    </div>
  );
}
