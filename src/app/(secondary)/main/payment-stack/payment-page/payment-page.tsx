'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './payment-page.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";


// Define TypeScript interfaces for our data models
class PaymentDetails {
  email?: string;
  phone?: string;
  country?: string;
  network?: string;
  fullname?: string;
  privateAccount?: boolean;
  eNaira?: boolean;
  directDebit?: boolean;
  opay?: boolean;
  bankName?: string;
  accountNumber?: string;

  constructor(data: Partial<PaymentDetails> = {}) {
    this.email = data.email;
    this.phone = data.phone;
    this.country = data.country;
    this.network = data.network;
    this.fullname = data.fullname;
    this.privateAccount = data.privateAccount;
    this.eNaira = data.eNaira;
    this.directDebit = data.directDebit;
    this.opay = data.opay;
    this.bankName = data.bankName;
    this.accountNumber = data.accountNumber;
  }
}

class UserDetails {
  usersId?: string;
  usersNames: string;
  paymentDetails?: PaymentDetails;

  constructor(data: Partial<UserDetails> = {}) {
    this.usersId = data.usersId;
    this.usersNames = data.usersNames || '';
    this.paymentDetails = data.paymentDetails;
  }
}

class PaymentMethodDetails {
  paymentMethodId: string;
  paymentMethodIdentity: string;
  paymentMethodChecker: string;

  constructor(data: Partial<PaymentMethodDetails> = {}) {
    this.paymentMethodId = data.paymentMethodId || '';
    this.paymentMethodIdentity = data.paymentMethodIdentity || '';
    this.paymentMethodChecker = data.paymentMethodChecker || '';
  }
}

class PaymentWalletDetails {
  paymentWalletId: string;
  paymentWalletIdentity: string;
  paymentWalletCurrency: string;

  constructor(data: Partial<PaymentWalletDetails> = {}) {
    this.paymentWalletId = data.paymentWalletId || '';
    this.paymentWalletIdentity = data.paymentWalletIdentity || '';
    this.paymentWalletCurrency = data.paymentWalletCurrency || '';
  }
}

class PaymentProfileDetails {
  userDetails: UserDetails;
  paymentMethodDetails: PaymentMethodDetails;
  paymentWalletDetails: PaymentWalletDetails;

  constructor(data: Partial<PaymentProfileDetails> = {}) {
    this.userDetails = data.userDetails || new UserDetails();
    this.paymentMethodDetails = data.paymentMethodDetails || new PaymentMethodDetails();
    this.paymentWalletDetails = data.paymentWalletDetails || new PaymentWalletDetails();
  }
}

class TransactionModel {
  transactionFee: number;
  transactionSenderRate: number;
  transactionReceiverRate: number;
  transactionSenderAmount: number;
  transactionReceiverAmount: number;
  transactionId: string;
  poolsId?: string;
  transactionCreatedAt: string;
  sortCreatedId: string;
  transactionType: string;
  transactionSenderStatus: string;
  transactionReceiverStatus: string;
  transactionSenderReference: string;
  paymentProfileSenderDetails?: PaymentProfileDetails;
  paymentProfileReceiverDetails?: PaymentProfileDetails;

  constructor(data: Partial<TransactionModel> = {}) {
    this.transactionFee = data.transactionFee || 0;
    this.transactionSenderRate = data.transactionSenderRate || 0;
    this.transactionReceiverRate = data.transactionReceiverRate || 0;
    this.transactionSenderAmount = data.transactionSenderAmount || 0;
    this.transactionReceiverAmount = data.transactionReceiverAmount || 0;
    this.transactionId = data.transactionId || '';
    this.poolsId = data.poolsId;
    this.transactionCreatedAt = data.transactionCreatedAt || '';
    this.sortCreatedId = data.sortCreatedId || '';
    this.transactionType = data.transactionType || '';
    this.transactionSenderStatus = data.transactionSenderStatus || '';
    this.transactionReceiverStatus = data.transactionReceiverStatus || '';
    this.transactionSenderReference = data.transactionSenderReference || '';
    this.paymentProfileSenderDetails = data.paymentProfileSenderDetails;
    this.paymentProfileReceiverDetails = data.paymentProfileReceiverDetails;
  }
}

class UserBalanceModel {
  usersId: string;
  usersBalanceAmount: number;
  usersBalanceUpdatedAt: string;

  constructor(data: Partial<UserBalanceModel> = {}) {
    this.usersId = data.usersId || '';
    this.usersBalanceAmount = data.usersBalanceAmount || 0;
    this.usersBalanceUpdatedAt = data.usersBalanceUpdatedAt || '';
  }
}

export default function PaymentPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // State for data with dummy data
  const [userBalance, setUserBalance] = useState<UserBalanceModel | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);

  // Initialize data
  useEffect(() => {
    // User balance data
    const balanceData = new UserBalanceModel({
      usersBalanceAmount: 10017.2,
      usersBalanceUpdatedAt: new Date().toISOString()
    });
    setUserBalance(balanceData);

    // User details data
    const userDetailsData = new UserDetails({
      usersNames: "JIBEWA IREKANMI JOHNSON",
      paymentDetails: new PaymentDetails({
        fullname: "JIBEWA IREKANMI JOHNSON"
      })
    });
    setUserDetails(userDetailsData);

    // Transactions data
    const transactionsData = [
      new TransactionModel({
        transactionType: "Mobile Money Top-up",
        transactionCreatedAt: "2023-08-15T17:20:00",
        transactionSenderAmount: 1962.6,
        transactionSenderStatus: "Completed"
      }),
      new TransactionModel({
        transactionType: "E Naira Account Top-up",
        transactionCreatedAt: "2023-07-23T01:33:00",
        transactionSenderAmount: 78.46,
        transactionSenderStatus: "Pending"
      })
    ];
    setTransactions(transactionsData);
  }, []);

  // Format date to match the screenshot (e.g., "Aug 15 at 5:20PM")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Format currency with commas
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get current date in format "4 September"
  const getCurrentDate = (): string => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long'
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className={styles.mainContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <h1>Today {getCurrentDate()}</h1>
      </div>

      {/* Payment Details Section */}
      <div className={styles.paymentDetailsSection}>
        <h2>Payment details</h2>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>Current balance</div>
          <div className={styles.detailValue}>
            {userBalance ? formatCurrency(userBalance.usersBalanceAmount) : '0.00'}
          </div>
        </div>

        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>FULGNAME</div>
          <div className={styles.detailValue}>
            {userDetails ? userDetails.usersNames : 'Loading...'}
          </div>
        </div>

        <div className={styles.divider}></div>
      </div>

      {/* Actions Section */}
      <div className={styles.actionsSection}>
        <h2>Actions</h2>

        <div className={styles.actionsGrid}>
          <div className={styles.actionItem}>
            <div className={styles.actionIcon}>💳</div>
            <div className={styles.actionText}>Top up</div>
          </div>

          <div className={styles.actionItem}>
            <div className={styles.actionIcon}>📤</div>
            <div className={styles.actionText}>Withdraw</div>
          </div>

          <div className={styles.actionItem}>
            <div className={styles.actionIcon}>💰</div>
            <div className={styles.actionText}>Payments</div>
          </div>

          <div className={styles.actionItem}>
            <div className={styles.actionIcon}>📊</div>
            <div className={styles.actionText}>Statements</div>
          </div>
        </div>

        <div className={styles.divider}></div>
      </div>

      {/* Transactions Section */}
      <div className={styles.transactionsSection}>
        <div className={styles.sectionHeader}>
          <h2>Transactions</h2>
          <span className={styles.seeAll}>{'>'}</span>
        </div>

        <div className={styles.transactionsList}>
          {transactions.map((transaction, index) => (
            <div key={index} className={styles.transactionItem}>
              <div className={styles.transactionMain}>
                <div className={styles.transactionType}>{transaction.transactionType}</div>
                <div className={styles.transactionDate}>
                  {formatDate(transaction.transactionCreatedAt)}
                </div>
                <div className={styles.transactionDescription}>
                  {transaction.transactionType}
                </div>
                <div className={styles.transactionStatus}>
                  {transaction.transactionSenderStatus}
                </div>
              </div>
              <div className={styles.transactionAmount}>
                {formatCurrency(transaction.transactionSenderAmount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}