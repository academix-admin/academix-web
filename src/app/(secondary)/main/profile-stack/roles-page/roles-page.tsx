'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './roles-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav, useProvideObject } from "@/lib/NavigationStack";
import { useUserData } from '@/lib/stacks/user-stack';
import LoadingView from '@/components/LoadingView/LoadingView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { checkFeatures, getParamatical } from '@/utils/checkers';
import { Role } from '@/lib/stacks/signup-stack';
import { RolesActivation } from '@/models/roles-activation';
import { PinData } from '@/models/pin-data';
import { useDialog } from '@/lib/DialogViewer';
import React from 'react';
import PaymentWallet from '../../payment-stack/payment-wallet/payment-wallet';
import PaymentMethod from '../../payment-stack/payment-method/payment-method';
import PaymentProfile from '../../payment-stack/payment-profile/payment-profile';
import PaymentRedirect, { useRedirectController } from '../../payment-stack/payment-redirect/payment-redirect';
import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { PaymentProfileModel } from '@/models/payment-profile-model';
import { PaymentCompletionData } from '@/models/completion-data';
import { usePaymentWalletModel } from '@/lib/stacks/payment-wallet-stack';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';
import { usePaymentProfileModel } from '@/lib/stacks/payment-profile-stack';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import DialogCancel from '@/components/DialogCancel';
import CurrencySymbol from '@/components/CurrencySymbol/CurrencySymbol';
import { useUserBalance } from '@/lib/stacks/user-balance-stack';
import { TransactionModel } from '@/models/transaction-model';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';
import { transactionSubscriptionManager } from '@/lib/managers/TransactionSubscriptionManager';
import { TransactionChangeEvent } from '@/lib/managers/TransactionSubscriptionManager';

function getRoleIcon(checker: string): React.JSX.Element {
  switch (checker) {
    case 'Roles.creator':
    case 'Roles.academix_creator':
      return (
        <svg fill="#FE9C36" viewBox="0 0 2048 2048" xmlns="http://www.w3.org/2000/svg" className={styles.roleIconSvg}>
          <path d="m0 0h27l21 2 22 4 24 7 24 10 20 11 19 13 13 11 12 11 13 14 12 16 10 16 10 18 15 29 10 19 12 23 10 19 12 23 10 19 12 23 10 19 12 23 10 19 13 25 10 19 18 34 17 33 10 19 6 10 8 2 395 67 27 6 18 6 21 9 19 10 19 13 17 14 17 17 9 11 11 15 10 17 8 15 8 20 6 18 5 24 2 13 1 12v27l-2 20-5 25-6 20-9 21-11 21-8 12-8 11-12 14-5 6h-2l-2 4-37 37-7 8-33 33-5 6-46 46-5 6h-2l-2 4-32 32-1 2h-2v2h-2l-2 4h-2l-2 4-33 33-2 3h-2l-2 4-38 38-5 6-18 18h-2l-1 3 1 16 24 164 18 124 15 102 2 16v42l-4 27-7 26-8 20-8 16-6 11-11 16-10 13-14 15-8 8-11 9-13 10-20 12-15 8-20 8-23 7-26 5-17 2h-28l-24-3-23-5-21-7-25-11-50-25-23-11-50-25-23-11-58-29-23-11-72-36-23-11-40-20h-6l-62 31-23 11-66 33-19 9-72 36-21 10-98 49-23 10-24 8-22 5-22 3h-37l-27-4-26-7-16-6-16-7-18-10-16-11-14-11-16-15-14-15-14-19-8-13-12-23-8-21-6-23-4-24-1-12v-25l4-34 12-82 10-67 11-76 12-82 12-83v-6l-7-8-12-12v-2h-2l-7-8-38-38v-2h-2l-7-8-34-34v-2h-2l-7-8-26-26v-2l-3-1-7-8-33-33v-2h-2l-7-8-40-40-7-8-38-38v-2h-2l-7-8-10-11-10-13-10-15-10-18-9-21-6-18-5-22-3-23v-35l3-24 6-26 8-23 13-27 10-16 10-14 18-21 8-7 11-10 18-13 15-9 15-8 20-8 24-7 31-6 384-65 8-3 15-29 13-25 10-19 13-25 9-16 8-16 16-31 10-19 12-23 11-20 8-16 14-27 10-19 13-25 12-22 17-33 9-15 11-16 11-14h2l2-4 16-16 14-11 14-10 21-12 17-8 27-9 23-5z" transform="translate(1009,61)" />
        </svg>
      );
    case 'Roles.reviewer':
    case 'Roles.academix_reviewer':
    case 'Roles.student':
    default:
      return (
        <svg fill="#F9C744" viewBox="0 0 2048 2048" xmlns="http://www.w3.org/2000/svg" className={styles.roleIconSvg}>
          <path d="m0 0h27l21 2 22 4 24 7 24 10 20 11 19 13 13 11 12 11 13 14 12 16 10 16 10 18 15 29 10 19 12 23 10 19 12 23 10 19 12 23 10 19 12 23 10 19 13 25 10 19 12 22 8 16 15 29 10 19 6 10 8 2 395 67 27 6 18 6 21 9 19 10 19 13 17 14 17 17 9 11 11 15 10 17 8 15 8 20 6 18 5 24 2 13 1 12v27l-2 20-5 25-6 20-9 21-11 21-8 12-8 11-13 15-4 5h-2l-2 4-38 38-1 2h-2l-2 4-38 38-7 8-40 40-5 6h-2l-2 4-34 34-1 2h-2v2h-2v2h-2l-2 4-37 37-2 3h-2l-2 4-38 38-7 8-12 12h-2l-1 3 1 16 24 164 18 124 15 102 2 16v42l-4 27-7 26-8 20-8 16-6 11-11 16-10 13-14 15-8 8-11 9-13 10-20 12-15 8-20 8-23 7-26 5-17 2h-28l-24-3-23-5-21-7-25-11-50-25-23-11-50-25-23-11-58-29-23-11-70-35-23-11-42-21h-6l-62 31-23 11-66 33-19 9-72 36-21 10-98 49-23 10-24 8-22 5-22 3h-37l-27-4-26-7-16-6-16-7-18-10-16-11-14-11-16-15-14-15-14-19-8-13-12-23-8-21-6-23-4-24-1-12v-25l4-34 12-82 10-67 11-76 18-123 6-42v-6l-7-8-12-12v-2l-4-2v-2h-2l-7-8-37-37-7-8-37-37v-2h-2l-7-8-25-25-7-8-33-33v-2h-2v-2h-2v-2h-2l-7-8-37-37-7-8-37-37v-2h-2l-7-8-11-12-14-19-9-15-8-15-8-20-6-19-5-24-2-17v-35l3-24 6-26 8-23 13-27 10-16 10-14 18-21 8-7 11-10 18-13 15-9 15-8 20-8 24-7 31-6 384-65 8-3 15-29 13-25 10-19 13-25 9-16 8-16 16-31 10-19 12-23 11-20 8-16 14-27 10-19 13-25 12-22 17-33 9-15 11-16 11-14h2l2-4 16-16 14-11 14-10 21-12 17-8 27-9 23-5z" transform="translate(1009,61)" />
        </svg>
      );
  }
}

export default function RolesPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();

  const [pageState, setPageState] = useState<'loading' | 'data' | 'error'>('loading');
  const [role, setRole] = useState<Role | null>(null);
  const [activation, setActivation] = useState<RolesActivation | null>(null);
  const [buyInLoading, setBuyInLoading] = useState(false);

  const pinErrorDialog = useDialog();
  const errorDialog = useDialog();
  const ussdDialog = useDialog();
  const bankTransferDialog = useDialog();
  const redirectController = useRedirectController();
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [pinErrorType, setPinErrorType] = useState<'not_set' | 'incorrect' | 'locked' | null>(null);
  const [transactionModels, , setTransactionModels] = useTransactionModel(lang);

  const [selectedWalletData, setSelectedWalletData] = useState<PaymentWalletModel | null>(null);
  const [selectedMethodData, setSelectedMethodData] = useState<PaymentMethodModel | null>(null);
  const [selectedProfileData, setSelectedProfileData] = useState<PaymentProfileModel | null>(null);
  const [academixProfileData, setAcademixProfileData] = useState<PaymentProfileModel | null>(null);
  const [continueState, setContinueState] = useState('initial');
  const [paymentActionMade, setPaymentActionMade] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);

  const [, , , { clear: clearWallet }] = usePaymentWalletModel(lang);
  const [, , , { clear: clearMethod }] = usePaymentMethodModel(lang);
  const [, , , { clear: clearProfile }] = usePaymentProfileModel(lang);

  const [buyInBottomViewerId, buyInBottomController, buyInBottomIsOpen] = useBottomController();
  const [userBalance] = useUserBalance(lang);

  const formatNumber = useCallback((num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace('.00', '');
  }, []);

  const buildProfileView = () => {
    if (!selectedMethodData || !selectedProfileData) return null;
    switch (selectedMethodData.paymentMethodChecker) {
      case 'PaymentMethod.mobile_money':
        return <span className={styles.infoValue}>{selectedProfileData.paymentDetails?.phone || t('error_text')}</span>;
      case 'PaymentMethod.bank_transfer':
        return <span className={styles.infoValue}>{t('error_text')}</span>;
      case 'PaymentMethod.private_account':
        return <span className={styles.infoValue}>{t('private_account')}</span>;
      case 'PaymentMethod.e_naira':
        return <span className={styles.infoValue}>{t('e_naira_text')}</span>;
      case 'PaymentMethod.direct_debit':
        return <span className={styles.infoValue}>{t('direct_debit_text')}</span>;
      case 'PaymentMethod.ussd':
        return <span className={styles.infoValue}>{selectedProfileData.paymentDetails?.bankName || t('error_text')}</span>;
      case 'PaymentMethod.opay':
        return <span className={styles.infoValue}>{t('opay_text')}</span>;
      default:
        return <span className={styles.infoValue}>{t('error_text')}</span>;
    }
  };

  const rate = selectedWalletData?.paymentWalletRate ?? 0;
  const fee = selectedWalletData
    ? selectedWalletData.paymentWalletRateType === 'RateType.PERCENT'
      ? (role?.roles_buy_in ?? 0) / rate * (selectedWalletData.paymentWalletFee ?? 0) / 100
      : selectedWalletData.paymentWalletRateType === 'RateType.FEE'
      ? selectedWalletData.paymentWalletFee ?? 0
      : selectedWalletData.paymentWalletRateType === 'RateType.FUNCTION'
      ? Math.max(selectedWalletData.paymentWalletFeeFlat ?? 0, ((role?.roles_buy_in ?? 0) / rate * (selectedWalletData.paymentWalletFee ?? 0)) / 100)
      : 0
    : 0;
  const currency = selectedWalletData?.paymentWalletCurrency ?? '!';
  const balance = userBalance?.usersBalanceAmount ?? 0;
  const walletAmount = rate > 0 ? (role?.roles_buy_in ?? 0) / rate : 0;

  const needsPayment = !!role && (role.roles_buy_in ?? 0) > 0;
  const showMethods = needsPayment && !!selectedWalletData;
  const showProfile = showMethods && !!selectedMethodData;
  const showActivate = showProfile && !!selectedProfileData;
  const showConfirm = showActivate && !!academixProfileData;

  const canActivate = !!role && !!activation && !activation.rolesActivationActivated && (!needsPayment || showConfirm);

  useProvideObject<PinData>('pin_controller', () => ({
    inUse: canActivate,
    action: async (pin: string) => {
      buyInBottomController.open();
      await handleBuyIn(pin);
    },
  }), { scope: 'pin_scope', dependencies: [canActivate, activation, selectedProfileData, academixProfileData] });

  const load = useCallback(async () => {
    if (!userData) return;
    setPageState('loading');
    try {
      const { data, error } = await supabaseBrowser.rpc('fetch_user_activation_role', {
        p_user_id: userData.usersId,
        p_locale: lang,
      });
      if (error) throw error;
      if (!data) { setPageState('error'); return; }

      const roleData: Role = {
        roles_id: data.roles_details.roles_id,
        roles_checker: data.roles_details.roles_checker,
        roles_level: data.roles_details.roles_level,
        roles_created_at: data.roles_details.roles_created_at,
        roles_buy_in: data.roles_details.roles_buy_in,
        roles_identity: data.roles_details.roles_identity,
        roles_perks: data.roles_details.roles_perks ?? [],
      };
      setRole(roleData);
      setActivation(new RolesActivation(data.roles_activation_details));
      setPageState('data');
      const isFresh = data.roles_activation_details?.roles_activation_is_fresh === true;
      const pendingTxId = data.roles_activation_details?.transaction_id ?? null;
      setPaymentActionMade(!isFresh);
      setPendingTransactionId(pendingTxId);
    } catch(error) {
      console.log(error);
      setPageState('error');
    }
  }, [userData, lang]);

  useEffect(() => { load(); }, [load]);

  const handleWalletData = useCallback((wallet: PaymentWalletModel) => {
    if (wallet && selectedWalletData?.paymentWalletId !== wallet.paymentWalletId) {
      clearMethod();
      clearProfile();
      setSelectedMethodData(null);
      setSelectedProfileData(null);
      setAcademixProfileData(null);
      buyInBottomController.close();
      setSelectedWalletData(wallet);
    }
  }, [selectedWalletData, clearMethod, clearProfile]);

  const handleMethodData = useCallback((method: PaymentMethodModel) => {
    if (method && selectedMethodData?.paymentMethodId !== method.paymentMethodId) {
      clearProfile();
      setSelectedProfileData(null);
      setAcademixProfileData(null);
      buyInBottomController.close();
      setSelectedMethodData(method);
    }
  }, [selectedMethodData, clearProfile]);

  const handleProfileData = useCallback((profile: PaymentProfileModel) => {
    if (profile && selectedProfileData?.paymentProfileId !== profile.paymentProfileId) {
      setAcademixProfileData(null);
      buyInBottomController.close();
      setSelectedProfileData(profile);
    }
  }, [selectedProfileData]);

  const createProfile = () => {
    if (!selectedWalletData || !selectedMethodData) return;
    nav.push('new_profile', { walletId: selectedWalletData.paymentWalletId, methodId: selectedMethodData.paymentMethodId, profileType: 'ProfileType.buy', scopeKey: 'roles-flow' });
  };

  const handleSubmit = async () => {
    if (!userData) return;
    try {
      setContinueState('loading');
      buyInBottomController.open();
      const paramatical = await getParamatical(userData.usersId, lang, userData.usersSex, userData.usersDob);
      if (!paramatical) return;
      const { data, error } = await supabaseBrowser.rpc('create_or_get_academix_profile', {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
      });
      if (error || (data as any)?.error) throw error || (data as any).error;
      setAcademixProfileData(new PaymentProfileModel(data, paramatical.usersId));
      setContinueState('data');
    } catch {
      setContinueState('error_occurred');
    }
  };

  const handlePaymentCompletion = async (
    paymentCompletionMode: string | undefined,
    paymentCompletionData: PaymentCompletionData | undefined,
    transactionModel: TransactionModel
  ): Promise<boolean> => {
    if (paymentCompletionMode === 'PaymentCompletion.redirect') {
      const link = paymentCompletionData?.link;
      if (link) await redirectController.open(link);
      return false;
    }

    if (paymentCompletionMode === 'PaymentCompletion.ussd') {
      const code = paymentCompletionData?.code;
      if (code) {
        setCurrentTransactionId(transactionModel.transactionId);
        ussdDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('ussd_code_message')}</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '16px 0', color: theme === 'light' ? '#000' : '#fff' }}>
              {code}
            </p>
          </div>
        );
      }
      return true;
    }

    if (paymentCompletionMode === 'PaymentCompletion.banktransfer') {
      const bank = paymentCompletionData?.bank;
      const account = paymentCompletionData?.account;
      const amount = paymentCompletionData?.amount;
      const reference = paymentCompletionData?.reference;
      const note = paymentCompletionData?.note;
      const expire = paymentCompletionData?.expire;
      setCurrentTransactionId(transactionModel.transactionId);
      bankTransferDialog.open(
        <div style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '12px' }}><strong>{t('bank_text')}:</strong> {bank}</div>
          <div style={{ marginBottom: '12px' }}><strong>{t('account_text')}:</strong> {account}</div>
          <div style={{ marginBottom: '12px' }}><strong>{t('amount_text')}:</strong> {amount}</div>
          <div style={{ marginBottom: '12px' }}><strong>{t('reference_text')}:</strong> {reference}</div>
          {note && <div style={{ marginBottom: '12px' }}><strong>{t('note_text')}:</strong> {note}</div>}
          {expire && <div style={{ marginBottom: '12px', color: '#FF3B30' }}><strong>{t('expires_text', { date: new Date(expire).toLocaleString() })}:</strong></div>}
        </div>
      );
      return true;
    }
    return false;
  };

  const handleBuyIn = async (userPin: string) => {
    if (!userData || !activation) return;
    try {
      setBuyInLoading(true);
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );
      if (!paramatical) { setBuyInLoading(false); return; }

      const feature = await checkFeatures(
        'Features.buy_in',
        lang,
        paramatical.country,
        userData.usersSex,
        userData.usersDob
      );
      if (!feature) {
        setBuyInLoading(false);
        errorDialog.open(<p style={{ textAlign: 'center' }}>{t('feature_unavailable')}</p>);
        return;
      }

      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;
      if (!jwt) { setBuyInLoading(false); return; }

      const requestData = needsPayment && selectedProfileData && academixProfileData ? {
        userId: userData.usersId,
        senderProfileId: selectedProfileData.paymentProfileId,
        receiverProfileId: academixProfileData.paymentProfileId,
        amount: walletAmount,
        type: 'TransactionType.buy_in',
        paymentSessionId: 'sessionId',
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age,
        userPin,
      } : {
        userId: userData.usersId,
        type: 'TransactionType.buy_in',
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age,
        userPin,
      };

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      const payment = await response.json();

      if (payment.status === 'Payment.pinError') {
        buyInBottomController.close();
        setBuyInLoading(false);

        if (payment.not_set) {
          setPinErrorType('not_set');
          pinErrorDialog.open(
            <div style={{ textAlign: 'center' }}>
              <p>{t('pin_not_set_message')}</p>
            </div>
          );
        } else if ((payment.attempts_left ?? 0) > 0) {
          setPinErrorType('incorrect');
          pinErrorDialog.open(
            <div style={{ textAlign: 'center' }}>
              <p>{t('incorrect_pin_message')}</p>
              <p style={{ color: '#FF3B30', fontWeight: 600, marginTop: '8px' }}>
                {payment.attempts_left} {t('attempts_remaining')}
              </p>
            </div>
          );
        } else if (payment.locked_until) {
          setPinErrorType('locked');
          pinErrorDialog.open(
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#FF3B30' }}>{t('pin_locked_message')}</p>
              <p style={{ marginTop: '8px' }}>{t('locked_until')}: {new Date(payment.locked_until).toLocaleString()}</p>
            </div>
          );
        }
        return;
      } else if (payment.status === 'Payment.failed') {
        buyInBottomController.close();
        setBuyInLoading(false);
        throw new Error(payment.error ?? payment.status);
      }

      const transaction = new TransactionModel(payment.transaction_details);
      const completionMode = payment.payment_completion_mode;
      const completionData = new PaymentCompletionData(payment.payment_completion_data);

      if (payment.transaction_details) {
        setTransactionModels([transaction, ...transactionModels]);

        if (completionMode) {
          buyInBottomController.close();
          setBuyInLoading(false);
          const shouldWaitForDialog = await handlePaymentCompletion(completionMode, completionData, transaction);
          if (!shouldWaitForDialog) {
            await load();
            await nav.push('view_transaction', { transactionId: transaction.transactionId });
          }
        } else {
          setBuyInLoading(false);
          buyInBottomController.close();
          await load();
          await nav.push('view_transaction', { transactionId: transaction.transactionId });
        }
      }
    } catch {
      setBuyInLoading(false);
      buyInBottomController.close();
      errorDialog.open(
        <div style={{ textAlign: 'center' }}>
          <p>{t('error_occurred')}</p>
        </div>
      );
    }
  };

  const getUserPin = () => {
    buyInBottomController.close();
    nav.pushWith('pin', { requireObjects: ['pin_controller'] });
  };

  const handleTransactionChange = useCallback((event: TransactionChangeEvent) => {
    const { eventType, newRecord: transaction } = event;
    if (eventType !== 'UPDATE' || !transaction || transaction.transactionId !== pendingTransactionId) return;

    const senderDone = transaction.transactionSenderStatus === 'TransactionStatus.success';
    const receiverDone = transaction.transactionReceiverStatus === 'TransactionStatus.success';

    if (senderDone && receiverDone) {
      transactionSubscriptionManager.removeTransactionId(transaction.transactionId);
      setPendingTransactionId(null);
      load();
    }
  }, [pendingTransactionId, load]);

  useEffect(() => {
    if (!pendingTransactionId) return;

    const added = transactionSubscriptionManager.addTransactionId(pendingTransactionId, { override: false, update: true });
    if (added) transactionSubscriptionManager.updateSubscription();

    transactionSubscriptionManager.attachListener(handleTransactionChange);
    return () => {
      transactionSubscriptionManager.removeListener(handleTransactionChange);
    };
  }, [pendingTransactionId, handleTransactionChange]);

  const goBack = async () => { await nav.pop(); };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button className={styles.backButton} onClick={goBack} aria-label="Go back">
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('my_role')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        {pageState === 'loading' && <LoadingView text={t('loading')} />}
        {pageState === 'error' && (
          <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={load} />
        )}

        {pageState === 'data' && role && activation && (
          <div className={`${styles.roleCard} ${styles[`roleCard_${theme}`]}`}>
            {/* Icon + Identity */}
            <div className={styles.roleHeader}>
              <div className={styles.roleIconWrapper}>
                {getRoleIcon(role.roles_checker)}
              </div>
              <div className={styles.roleHeaderInfo}>
                <span className={styles.roleIdentity}>{role.roles_identity}</span>
                <span className={styles.roleLevel}>{t('tier_text', { value: role.roles_level })}</span>
              </div>
              {activation.rolesActivationActivated && (
                <div className={styles.activeBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                  </svg>
                  {t('active_text')}
                </div>
              )}
            </div>

            {/* Buy In */}
            <div className={styles.buyInRow}>
              <span className={styles.buyInLabel}>{t('buy_in')}</span>
              <span className={styles.buyInValue}>
                {role.roles_buy_in && role.roles_buy_in > 0
                  ? `${role.roles_buy_in.toLocaleString()} ADC`
                  : t('free_text')}
              </span>
            </div>

            <div className={`${styles.divider} ${styles[`divider_${theme}`]}`} />

            {/* Perks */}
            {role.roles_perks.length > 0 && (
              <ul className={styles.perksList}>
                {role.roles_perks.map((perk, i) => (
                  <li key={i} className={styles.perkItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.perkCheck}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#1C6B1E" />
                    </svg>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            )}

          </div>
        )}

        {pageState === 'data' && role && activation && (
          <>
            {/* Payment selection for paid roles */}
            {!activation.rolesActivationActivated && needsPayment && (
              <div style={{ marginTop: '24px' }}>
                {!paymentActionMade && (
                  <>
                    <PaymentWallet
                      profileType={'ProfileType.buy'}
                      onWalletData={handleWalletData}
                      scopeKey="roles-flow"
                    />

                    {showMethods && (
                      <PaymentMethod
                        profileType={'ProfileType.buy'}
                        walletId={selectedWalletData!.paymentWalletId}
                        onMethodSelect={handleMethodData}
                        scopeKey="roles-flow"
                      />
                    )}

                    {showProfile && (
                      <>
                        <PaymentProfile
                          profileType={'ProfileType.buy'}
                          methodId={selectedMethodData!.paymentMethodId}
                          methodType={selectedMethodData!.paymentMethodChecker}
                          onProfileSelect={handleProfileData}
                          onCreateProfile={createProfile}
                          scopeKey="roles-flow"
                        />
                        {selectedMethodData!.paymentMethodBuyMultiple && (
                          <button className={styles.newProfileButton} onClick={createProfile}>
                            + {t('new_profile')}
                          </button>
                        )}
                      </>
                    )}

                    {showActivate && (
                      <div className={styles.continueButtonWrapper}>
                        <button className={styles.continueButton} onClick={handleSubmit}>
                          {t('continue')}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {paymentActionMade && (
                  <div className={styles.continueButtonWrapper}>
                    <button className={styles.continueButton} onClick={load}>
                      {t('payment_completed_text')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomViewer
        id={buyInBottomViewerId}
        isOpen={buyInBottomIsOpen}
        onClose={buyInBottomController.close}
        backDrop={false}
        cancelButton={{
          position: 'right',
          onClick: buyInBottomController.close,
          view: <DialogCancel />,
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          handleColor: '#888',
          handleWidth: '48px',
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          {!academixProfileData && continueState === 'error_occurred' && (
            <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={handleSubmit} />
          )}
          {!academixProfileData && continueState === 'loading' && <LoadingView />}
          {showConfirm && (
            <div className={styles.paymentConfirmation}>
              <div className={styles.buyInAmountSection}>
                <div className={styles.buyInCurrencyAmount}>
                  {currency} {formatNumber(walletAmount)}
                </div>
                <div className={styles.buyInAcademixAmount}>
                  <CurrencySymbol className={styles.academixIcon} />
                  {formatNumber(role!.roles_buy_in ?? 0)}
                </div>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('profile_text')}:</span>
                {buildProfileView()}
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('method_text')}:</span>
                <span className={styles.infoValue}>{selectedMethodData?.paymentMethodIdentity || t('error_text')}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('rate_text')}:</span>
                <span className={styles.infoValue}>{rate.toFixed(4)}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('fee_text')}:</span>
                <span className={styles.infoValue}>{currency} {fee.toFixed(2)}</span>
              </div>

              <div className={styles.divider} />
              {/* Total amount */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('total')}:</span>
                <span className={styles.infoValue}>
                  {currency} {formatNumber(walletAmount + fee)}
                </span>
              </div>
              <div className={styles.divider} />


              <button
                onClick={getUserPin}
                type="button"
                className={styles.continueButton}
                disabled={buyInLoading}
                aria-disabled={buyInLoading}
              >
                {buyInLoading ? <span className={styles.spinner} /> : t('pay_text')}
              </button>
            </div>
          )}
        </div>
      </BottomViewer>

      <PaymentRedirect controller={redirectController} />

      <pinErrorDialog.DialogViewer
        title={t('pin_error')}
        buttons={[{
          text: t('ok_text'),
          variant: 'primary',
          onClick: async () => {
            pinErrorDialog.close();
            if (pinErrorType === 'not_set') {
              setPinErrorType(null);
              await (await nav.goToGroupId('profile-stack')).push('security_verification', {
                request: 'Pin',
                isNew: true,
                returnGroup: 'profile-stack'
              });
            }
          }
        }]}
        showCancel={true}
        cancelText={t('cancel_text')}
        closeOnBackdrop={false}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
        }}
      />

      <ussdDialog.DialogViewer
        title={t('ussd_code')}
        buttons={[{
          text: t('ok_text'),
          variant: 'primary',
          onClick: async () => {
            ussdDialog.close();
            if (currentTransactionId) {
              await load();
              await nav.push('view_transaction', { transactionId: currentTransactionId });
            }
          }
        }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
        }}
      />

      <bankTransferDialog.DialogViewer
        title={t('bank_transfer_details')}
        buttons={[{
          text: t('ok_text'),
          variant: 'primary',
          onClick: async () => {
            bankTransferDialog.close();
            if (currentTransactionId) {
              await load();
              await nav.push('view_transaction', { transactionId: currentTransactionId });
            }
          }
        }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
        }}
      />

      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
        }}
      />
    </main>
  );
}
