'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './withdraw-page.module.css';
import { useNav } from "@/lib/NavigationStack";
import { StateStack } from '@/lib/state-stack';
import { getParamatical } from '@/utils/checkers';
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import PaymentWallet from '../payment-wallet/payment-wallet';
import PaymentMethod from '../payment-method/payment-method';
import PaymentProfile from '../payment-profile/payment-profile';
import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { PaymentProfileModel } from '@/models/payment-profile-model';
import { usePaymentWalletModel } from '@/lib/stacks/payment-wallet-stack';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';
import { usePaymentProfileModel } from '@/lib/stacks/payment-profile-stack';
import { useUserBalance } from '@/lib/stacks/user-balance-stack';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import DialogCancel from '@/components/DialogCancel';
import LoadingView from '@/components/LoadingView/LoadingView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { TransactionModel } from '@/models/transaction-model';
import { useTransactionModel } from '@/lib/stacks/transactions-stack';
import { PaymentCompletionData } from '@/models/completion-data';


interface PaymentResponse {
  status: string;
  transaction_details: any;
  payment_completion_mode?: string;
  payment_completion_data?: PaymentCompletionData;
}

export default function WithdrawPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();
  const isTop = nav.isTop();

  const [, , , { clear: clearWallet }] = usePaymentWalletModel(lang);
  const [, , , { clear: clearMethod }] = usePaymentMethodModel(lang);
  const [, , , { clear: clearProfile }] = usePaymentProfileModel(lang);
  const [userBalance] = useUserBalance(lang);
  const [transactionModels, demandTransactionModels, setTransactionModels] = useTransactionModel(lang);

  const [amount, setAmount] = useState(0);
  const [selectedWalletData, setSelectedWalletData] = useState<PaymentWalletModel | null>(null);
  const [selectedMethodData, setSelectedMethodData] = useState<PaymentMethodModel | null>(null);
  const [selectedWalletProfileData, setSelectedWalletProfileData] = useState<PaymentProfileModel | null>(null);
  const [academixProfileData, setAcademixProfileData] = useState<PaymentProfileModel | null>(null);

  const [withdrawBottomViewerId, withdrawBottomController, withdrawBottomIsOpen] = useBottomController();

  const [error, setError] = useState('');
  const [continueState, setContinueState] = useState('initial');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  /** amount handler */
  const handleAmount = useCallback((newAmount: number) => {
    setAmount(newAmount);
    if (
      (!selectedWalletData ||
      newAmount <= 0 ||
      newAmount < selectedWalletData.paymentWalletMin)
      && isTop
    ) {
      // reset if amount is invalid for current wallet
      setSelectedMethodData(null);
      setSelectedWalletProfileData(null);
      setError('');
    }
  }, [selectedWalletData, isTop]);

  /** wallet handler */
  const handleWalletData = useCallback((wallet: PaymentWalletModel) => {
    if (wallet && selectedWalletData?.paymentWalletId !== wallet.paymentWalletId && isTop) {
      clearMethod();
      clearProfile();
      setSelectedMethodData(null);
      setSelectedWalletProfileData(null);
      withdrawBottomController.close();
      setSelectedWalletData(wallet);
      setError('');
    }
  }, [selectedWalletData, clearMethod, clearProfile, isTop]);

  /** method handler */
  const handleMethodData = useCallback((method: PaymentMethodModel) => {
    if (method && selectedMethodData?.paymentMethodId !== method.paymentMethodId && isTop) {
      clearProfile();
      setSelectedWalletProfileData(null);
      setError('');
      withdrawBottomController.close();
      setSelectedMethodData(method);
    }
  }, [selectedMethodData, clearProfile, isTop]);

  /** profile handler */
  const handleProfileData = useCallback((profile: PaymentProfileModel) => {
    if (profile && selectedWalletProfileData?.paymentProfileId !== profile.paymentProfileId) {
      setError('');
      withdrawBottomController.close();
      setSelectedWalletProfileData(profile);
    }
  }, [selectedWalletProfileData]);

  /** back nav */
  const goBack = async () => {
    await nav.pop();
    StateStack.core.clearScope('payment_flow');
  };

  /** New profile */
  const createProfile = async () => {
    if(!selectedWalletData || !selectedMethodData)return;
    nav.push('new_profile', {  walletId: selectedWalletData.paymentWalletId, methodId: selectedMethodData.paymentMethodId, profileType: 'ProfileType.sell'});
  };

  const handleSubmit = async () => {
    if (!userData) return;

    try {
      setContinueState('loading');
      withdrawBottomController.open();

      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return;

      const { data, error } = await supabaseBrowser.rpc("create_or_get_academix_profile", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
      });

      if (error || (data as any)?.error) throw error || (data as any).error;

      const academixProfile = new PaymentProfileModel(data, paramatical.usersId);
      setContinueState('data');
      setAcademixProfileData(academixProfile);
    } catch (err) {
      console.error("[TopUP] error:", err);
      setContinueState('error_occurred');
    }
  };

  // Function to make payment API call
  const makePayment = async (jwt: string, data: any): Promise<PaymentResponse> => {
    // Use the App Router API endpoint
    const proxyUrl = '/api/payment';

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("Payment API error:", error);
      throw error;
    }
  };

  // Function to handle payment completion
  const handlePaymentCompletion = async (
    paymentCompletionMode: string | undefined,
    paymentCompletionData: PaymentCompletionData | undefined,
    transactionModel: TransactionModel
  ) => {
    if (paymentCompletionMode === 'PaymentCompletion.redirect') {
      const link = paymentCompletionData?.link;
      if (link) {
        window.open(link, '_blank');
      }
    }

    if (paymentCompletionMode === 'PaymentCompletion.ussd') {
      const code = paymentCompletionData?.code;
      if (code) {
        // For USSD, we can't directly dial from web, so we show the code to user
        alert(`Please dial this USSD code: ${code}`);
      }
    }

    if (paymentCompletionMode === 'PaymentCompletion.banktransfer') {
      const bank = paymentCompletionData?.bank;
      const account = paymentCompletionData?.account;
      const amount = paymentCompletionData?.amount;
      const reference = paymentCompletionData?.reference;
      const note = paymentCompletionData?.note;
      const expire = paymentCompletionData?.expire;

      // Show bank transfer details to user
      alert(`Bank Transfer Details:
Bank: ${bank}
Account: ${account}
Amount: ${amount}
Reference: ${reference}
Note: ${note}
Expires: ${expire}`);
    }
  };

  const handleWithdraw = async () => {
    if (!userData || !selectedWalletProfileData || !academixProfileData) return;

    try {
        setWithdrawLoading(true);
        setError('');
      const location = await checkLocation();
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setWithdrawLoading(false);
        setError(t('error_occurred'));
        return;
      }

      const feature = await checkFeatures(
        'Features.withdraw',
        lang,
        paramatical.country,
        userData.usersSex,
        userData.usersDob
      );

      if (!feature) {
        setWithdrawLoading(false);
        console.log('feature not available');
        setError(t('feature_unavailable'));
        return;
      }

      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.log('no JWT token');
        setWithdrawLoading(false);
        setError(t('error_occurred') );
        return;
      }

      const requestData = {
        userId: userData.usersId,
        senderProfileId: academixProfileData.paymentProfileId,
        receiverProfileId: selectedWalletProfileData.paymentProfileId,
        amount: amount,
        type: 'TransactionType.withdraw',
        paymentSessionId: 'sessionId',
        locale: paramatical.locale,
        country: paramatical.country,
        gender: paramatical.gender,
        age: paramatical.age
      };

      const payment = await makePayment(jwt, requestData);
      const status = payment.status;

      const transaction = new TransactionModel(payment.transaction_details);
      const completionMode = payment.payment_completion_mode;
      const completionData = new PaymentCompletionData(payment.payment_completion_data);
      console.log(payment);
      if (transaction && status === 'Payment.success') {
        setTransactionModels([transaction,...transactionModels]);

        await nav.pushAndPopUntil('view_transaction',(entry) => entry.key === 'payment_page', {transactionId: transaction.transactionId})

        if (completionMode) {
          await handlePaymentCompletion(completionMode, completionData, transaction);
        }
      }
     setWithdrawLoading(false);

    } catch (error: any) {
      console.error("Withdraw error:", error);
      setWithdrawLoading(false);
      setError(t('error_occurred') || 'An error occurred');
    }
  };

  // Format number with commas
  const formatNumber = useCallback((num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace('.00', '');
  }, []);

  const buildProfileView = () => {
    if (!selectedMethodData) return null;

    switch (selectedMethodData.paymentMethodChecker) {
      case 'PaymentMethod.mobile_money':
        return (
          <span className={styles.infoValue}>
            {selectedWalletProfileData?.paymentDetails?.phone || t('error_text')}
          </span>
        );

      case 'PaymentMethod.bank_transfer':
        return (
          <span className={styles.infoValue}>
            <div>
            {selectedWalletProfileData?.paymentDetails?.fullname || t('error_text')}
            </div>
            <div>
                        {selectedWalletProfileData?.paymentDetails?.accountNumber || t('error_text')}
            </div>
            <div>
                        {selectedWalletProfileData?.paymentDetails?.bankName || t('error_text')}
            </div>
          </span>
        );

      case 'PaymentMethod.private_account':
        return (
          <span className={styles.infoValue}>
            {t('private_account')}
          </span>
        );

      case 'PaymentMethod.e_naira':
        return (
          <span className={styles.infoValue}>
            {t('e_naira_text')}
          </span>
        );

      case 'PaymentMethod.direct_debit':
        return (
          <span className={styles.infoValue}>
            {t('direct_debit_text')}
          </span>
        );

      case 'PaymentMethod.ussd':
        return (
          <span className={styles.infoValue}>
            {selectedWalletProfileData?.paymentDetails?.bankName || t('error_text')}
          </span>
        );

      case 'PaymentMethod.opay':
        return (
          <span className={styles.infoValue}>
            {t('opay_text')}
          </span>
        );

      default:
        return (
          <span className={styles.infoValue}>
                      {t('error_text')}
          </span>
        );
    }
  };

  // derived booleans
  const showMethods = !!selectedWalletData && amount > 0 && amount >= (selectedWalletData.paymentWalletMin || 0);
  const showProfile = !!selectedMethodData && showMethods;
  const showWithdraw = !!selectedWalletProfileData && showProfile;
  const showConfirm = !!selectedWalletProfileData && !!selectedMethodData && !!academixProfileData;

  const rate = selectedWalletData?.paymentWalletRate ?? 0;
  const fee = (selectedWalletData ?
    (selectedWalletData.paymentWalletRateType === 'RateType.PERCENT'
      ? amount * (selectedWalletData.paymentWalletFee ?? 0) / 100
      : selectedWalletData.paymentWalletFee ?? 0
    ) : 0) * (selectedWalletData?.paymentWalletRate || 0);

  const currency = selectedWalletData?.paymentWalletCurrency ?? "!";
  const balance = userBalance?.usersBalanceAmount ?? 0;
  const balanceCheck = balance >= (amount  * rate) + fee;

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
          <h1 className={styles.title}>{t('withdraw_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>

        <PaymentWallet
          profileType={'ProfileType.sell'}
          onWalletData={handleWalletData}
          onWalletAmount={handleAmount}
          entryMode
        />

        {showMethods && (
          <PaymentMethod
            profileType={'ProfileType.sell'}
            walletId={selectedWalletData.paymentWalletId}
            onMethodSelect={handleMethodData}
          />
        )}

        {showProfile && (
          <>
            <PaymentProfile
              profileType={'ProfileType.sell'}
              methodId={selectedMethodData.paymentMethodId}
              methodType={selectedMethodData.paymentMethodChecker}
              onProfileSelect={handleProfileData}
              onCreateProfile={createProfile}
            />

            {selectedMethodData.paymentMethodSellMultiple && (
              <div className={styles.profileContainer}>
                <button
                  className={styles.newProfileButton}
                  onClick={createProfile}
                >
                  + {t('new_profile')}
                </button>
              </div>
            )}
          </>
        )}

        {showWithdraw && (
          <button
            type="button"
            className={styles.continueButton}
            onClick={handleSubmit}
          >
            {t('continue')}
          </button>
        )}

      </div>

      <BottomViewer
        id={withdrawBottomViewerId}
        isOpen={withdrawBottomIsOpen}
        onClose={withdrawBottomController.close}
        backDrop={false}
        cancelButton={{
          position: "right",
          onClick: withdrawBottomController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          {(!academixProfileData && continueState === 'error_occurred') && (
            <ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={handleSubmit} />
          )}

          {!academixProfileData && continueState === 'loading' && (
            <LoadingView />
          )}

          {/* Payment Confirmation UI */}
          {showConfirm && (
            <div className={styles.paymentConfirmation}>
              {/* Amounts */}
              <div className={styles.amountSection}>
                <div className={styles.academixAmount}>
                  <span className={styles.academixIcon}>A</span>
                  {formatNumber(amount * rate)}
                </div>
                <div className={styles.currencyAmount}>
                  {currency} {formatNumber(amount)}
                </div>
              </div>

              {/* Profile */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('profile_text')}:</span>
                {buildProfileView()}
              </div>

              {/* Method */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('method_text')}:</span>
                <span className={styles.infoValue}>
                  {selectedMethodData?.paymentMethodIdentity || t('error_text')}
                </span>
              </div>

              {/* Rate */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('rate_text')}:</span>
                <span className={styles.infoValue}>{rate.toFixed(4)}</span>
              </div>

              {/* Fee */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('fee_text')}:</span>
                <span className={styles.infoValue}>
                  A {fee.toFixed(2)}
                </span>
              </div>

              <div className={styles.divider} />

              {/* Payment Method */}
              <div className={styles.paymentMethodSection}>
                <h3 className={styles.paymentMethodTitle}>{t('payment_method')}</h3>

                <div className={styles.walletCard}>
                  <div className={styles.walletIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 14a2 2 0 11-4 0 2 2 0 014 0z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>

                  <div className={styles.walletInfo}>
                    <div className={styles.walletName}>
                      {t('wallet_text')} (
                      <span className={styles.academixBalance}>
                        A {formatNumber(balance)}
                      </span>
                      )
                    </div>
                    {!balanceCheck && <span> {t('insufficient_balance')} </span>}
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleWithdraw}
                type="button"
                className={styles.continueButton}
                disabled={withdrawLoading || !balanceCheck}
                aria-disabled={withdrawLoading}
              >
                { withdrawLoading ?  <span className={styles.spinner}></span> : t('pay_text')}
              </button>
            </div>
          )}
        </div>
      </BottomViewer>
    </main>
  );
}