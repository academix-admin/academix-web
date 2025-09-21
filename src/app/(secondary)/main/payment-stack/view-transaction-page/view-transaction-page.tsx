'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './view-transaction-page.module.css';
import { useNav } from "@/lib/NavigationStack";
import { TransactionModel } from '@/models/transaction-model';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';
import { PaymentDetails } from '@/models/payment-details';

interface ViewTransactionProps {
  transactionId: string;
}

export default function ViewTransactionPage(props: ViewTransactionProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { transactionId } = props;

  const [currentTransaction, setCurrentTransaction] = useState<TransactionModel | null>(null);
  const [transactionModels,,, { isHydrated }] = useTransactionModel(lang);

  useEffect(() => {
      if(!isHydrated)return;
    const getTransaction = transactionModels.find((e) => e.transactionId === transactionId);

    if (getTransaction) {
      setCurrentTransaction(getTransaction);
    } else {
      goBack();
    }
  }, [transactionModels, transactionId, isHydrated]);

  /** back nav */
  const goBack = async () => {
    await nav.pop();
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
      default:
        return t('transaction_text');
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
      case 'PaymentMethod.bank_transfer':
        return t('bank_transfer_text');
      default:
        return t('account_text');
    }
  };

  const getTransactionStatus = (status: string | undefined | null): string => {
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

  const getStatusClass = (status: string | null): string => {
    switch (status) {
      case 'TransactionStatus.success':
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

  const getIconClass = (status: string | null): string => {
    switch (status) {
      case 'TransactionStatus.success':
        return styles.iconCompleted;
      case 'TransactionStatus.failed':
        return styles.iconFailed;
      case 'TransactionStatus.pending':
        return styles.iconPending;
      case 'TransactionStatus.cancelled':
        return styles.iconCancelled;
      default:
        return styles.iconUnknown;
    }
  };

  const getStatusIcon = (status: string | null): React.JSX.Element => {
      switch (status) {
        case 'TransactionStatus.success':
          return (
            <svg className={`${styles.statusIcon} ${styles.iconSuccess}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          );
        case 'TransactionStatus.failed':
          return (
            <svg className={`${styles.statusIcon} ${styles.statusFailed}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 14L12 12M12 12L14 10M12 12L10 10M12 12L14 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          );
        case 'TransactionStatus.pending':
          return (
            <svg className={`${styles.statusIcon} ${styles.statusPending}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          );
        case 'TransactionStatus.cancelled':
          return (
            <svg className={`${styles.statusIcon} ${styles.statusCancelled}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          );
        default:
          return (
            <svg className={`${styles.statusIcon} ${styles.statusUnknown}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          );
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

  const formatCurrency = (amount: number, currency: string): string => {
    if (currency.toLowerCase() === 'adc') {
      return `ADC ${amount.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.toString().replace('.00', '').replace('-','');
    }
    return `${currency} ${amount.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.toString().replace('.00', '').replace('-','');
  };

  const buildProfileView = (details: PaymentDetails | null, methodType: string | null) => {
      if(!details || !methodType)return null;
      switch (methodType) {
        case 'PaymentMethod.mobile_money':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {details.phone || t('error_text')}
                </span>
                <svg className={styles.chevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </div>
            </div>
          );

        case 'PaymentMethod.private_account':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {t('private_account')}
                </span>
                <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          );

        case 'PaymentMethod.e_naira':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {t('e_naira_text')}
                </span>
                <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          );

        case 'PaymentMethod.direct_debit':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {t('direct_debit_text')}
                </span>
                <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          );

        case 'PaymentMethod.ussd':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {details.bankName || t('error_text')}
                </span>
                <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          );

        case 'PaymentMethod.opay':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {t('opay_text')}
                </span>
                <svg className={styles.infoIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          );

        case 'PaymentMethod.bank_transfer':
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <div className={styles.bankDetails}>
                  <div className={styles.bankDetailRow}>
                    {details.fullname || t('error_text')}
                  </div>
                  <div className={styles.bankDetailRow}>
                    {details.accountNumber || t('error_text')}
                  </div>
                  <div className={styles.bankDetailRow}>
                    {details.bankName || t('error_text')}
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return (
            <div className={styles.profileItem}>
              <div className={styles.profileItemRight}>
                <span className={styles.profileValue}>
                  {t('error_text')}
                </span>
              </div>
            </div>
          );
      }
    };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentTransaction) {
    return (
      <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
        <div className={styles.loading}>Loading transaction details...</div>
      </main>
    );
  }

  const senderCurrency = currentTransaction.paymentProfileSenderDetails?.paymentWalletDetails.paymentWalletCurrency || '';
  const receiverCurrency = currentTransaction.paymentProfileReceiverDetails?.paymentWalletDetails.paymentWalletCurrency || '';

  const senderMethod = currentTransaction.paymentProfileSenderDetails?.paymentMethodDetails.paymentMethodChecker || '';
  const receiverMethod = currentTransaction.paymentProfileReceiverDetails?.paymentMethodDetails.paymentMethodChecker || '';

  const getMethod = (transactionType: string | undefined | null): string | null => {
    switch (transactionType) {
      case 'TransactionType.top_up':
        return senderMethod;
      case 'TransactionType.academix':
        return null;
      case 'TransactionType.airtime':
        return null;
      case 'TransactionType.withdraw':
        return receiverMethod;
      case 'TransactionType.payment':
        return null;
      case 'TransactionType.none':
        return null;
      case 'TransactionType.participation':
        return senderMethod;
      default:
        return null;
    }
  };

  const paymentDetails = (transactionType: string | undefined | null): PaymentDetails | null => {
    switch (transactionType) {
      case 'TransactionType.quiz':
        return null;
      case 'TransactionType.academix':
        return null;
      case 'TransactionType.airtime':
        return null;
      case 'TransactionType.withdraw':
        return currentTransaction.paymentProfileReceiverDetails?.userDetails.paymentDetails ?? null;
      case 'TransactionType.top_up':
        return currentTransaction.paymentProfileSenderDetails?.userDetails.paymentDetails ?? null;
      case 'TransactionType.payment':
        return null;
      case 'TransactionType.none':
        return null;
      case 'TransactionType.participation':
        return null;
      default:
        return null;
    }
  };


  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('transaction_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>

        {/* Transaction Card */}
        <div className={`${styles.transactionCard} ${styles[`transactionCard_${theme}`]}`}>
          <div className={`${styles.transactionTypeIcon} ${styles[`transactionTypeIcon_${theme}`]}`}>
                        {getTransactionIcon(currentTransaction.transactionType)}
          </div>
          <div className={styles.transactionHeader}>
            <h2 className={styles.transactionTitle}>
              {getTransactionTypeText(currentTransaction.transactionType)}
            </h2>
          </div>

          <div className={styles.amountSection}>
            <div className={styles.primaryAmount}>
              {formatCurrency(currentTransaction.transactionSenderAmount, senderCurrency)}
            </div>
            {senderCurrency !== receiverCurrency && (
              <div className={styles.secondaryAmount}>
                {formatCurrency(currentTransaction.transactionReceiverAmount, receiverCurrency)}
              </div>
            )}
          </div>

          <div className={styles.statusSection}>
            <div className={styles.statusRow}>
              <div className={styles.statusItem}>
                {getStatusIcon(currentTransaction.transactionSenderStatus)}
                <span className={styles.statusLabel}>{t('payment_text')}</span>
                <div className={styles.statusIndicator}>
                  <span className={`${styles.statusText} ${getStatusClass(currentTransaction.transactionSenderStatus)}`}>
                    {getTransactionStatus(currentTransaction.transactionSenderStatus)}
                  </span>
                </div>
              </div>

              <div className={styles.statusConnectorContainer}>
               <div className={`${styles.statusConnector} ${getIconClass(currentTransaction.transactionSenderStatus)}`}></div>
               <div className={`${styles.statusConnector} ${getIconClass(currentTransaction.transactionReceiverStatus)}`}></div>
              </div>

              <div className={styles.statusItem}>
                {getStatusIcon(currentTransaction.transactionReceiverStatus)}
                <span className={styles.statusLabel}>{t('received_text')}</span>
                <div className={styles.statusIndicator}>
                  <span className={`${styles.statusText} ${getStatusClass(currentTransaction.transactionReceiverStatus)}`}>
                    {getTransactionStatus(currentTransaction.transactionReceiverStatus)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.detailsSection}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('paid_text')}</span>
              <span className={styles.detailValue}>
                {formatCurrency(currentTransaction.transactionSenderAmount, senderCurrency)}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('received_text')}</span>
              <span className={styles.detailValue}>
                {formatCurrency(currentTransaction.transactionReceiverAmount, receiverCurrency)}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('rate_text')}</span>
              <span className={styles.detailValue}>
                {currentTransaction.transactionSenderRate.toFixed(4)}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('fee_text')}</span>
              <span className={styles.detailValue}>
                {formatCurrency(currentTransaction.transactionFee, senderCurrency)}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className={`${styles.detailsCard} ${styles[`detailsCard_${theme}`]}`}>
          <h3 className={styles.detailsTitle}>{t('details_text')}</h3>

          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailItemLabel}>{t('profile__text')}</span>
              <span className={styles.detailItemValue}>
                {buildProfileView(paymentDetails(currentTransaction.transactionType), getMethod(currentTransaction.transactionType))}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailItemLabel}>{t('method_text')}</span>
              <span className={styles.detailItemValue}>
                {currentTransaction.paymentProfileSenderDetails?.paymentMethodDetails.paymentMethodIdentity || ''}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailItemLabel}>{t('reference_text')}</span>
              <span className={styles.detailItemValue}>
                {currentTransaction.transactionSenderReference}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailItemLabel}>{t('date_text')}</span>
              <span className={styles.detailItemValue}>
                {formatDate(currentTransaction.transactionCreatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}