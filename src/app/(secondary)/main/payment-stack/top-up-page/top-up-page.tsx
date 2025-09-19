'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './top-up-page.module.css';
import { useNav } from "@/lib/NavigationStack";
import { StateStack } from '@/lib/state-stack';

import PaymentWallet from './payment-wallet/payment-wallet';
import PaymentMethod from './payment-method/payment-method';
import PaymentProfile from './payment-profile/payment-profile';

import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { PaymentProfileModel } from '@/models/payment-profile-model';

import { usePaymentWalletModel } from '@/lib/stacks/payment-wallet-stack';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';
import { usePaymentProfileModel } from '@/lib/stacks/payment-profile-stack';

export default function TopUpPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();

  const [ , , , { clear: clearWallet } ] = usePaymentWalletModel(lang);
  const [ , , , { clear: clearMethod } ] = usePaymentMethodModel(lang);
  const [ , , , { clear: clearProfile } ] = usePaymentProfileModel(lang);

  const [amount, setAmount] = useState(0);
  const [selectedWalletData, setSelectedWalletData] = useState<PaymentWalletModel | null>(null);
  const [selectedMethodData, setSelectedMethodData] = useState<PaymentMethodModel | null>(null);
  const [selectedProfileData, setSelectedProfileData] = useState<PaymentProfileModel | null>(null);

  /** amount handler */
  const handleAmount = useCallback((newAmount: number) => {
    setAmount(newAmount);
    if (
      !selectedWalletData ||
      newAmount <= 0 ||
      newAmount < selectedWalletData.paymentWalletMin
    ) {
      // reset if amount is invalid for current wallet
      setSelectedMethodData(null);
      setSelectedProfileData(null);
    }
  }, [selectedWalletData, clearMethod, clearProfile]);

  /** wallet handler */
  const handleWalletData = useCallback((wallet: PaymentWalletModel) => {
    if (selectedWalletData?.paymentWalletId !== wallet.paymentWalletId) {
      clearMethod();
      clearProfile();
      setSelectedMethodData(null);
      setSelectedProfileData(null);
      setSelectedWalletData(wallet);
    }
  }, [selectedWalletData, clearMethod, clearProfile]);

  /** method handler */
  const handleMethodData = useCallback((method: PaymentMethodModel) => {
    if (selectedMethodData?.paymentMethodId !== method.paymentMethodId) {
      clearProfile();
      setSelectedProfileData(null);
      setSelectedMethodData(method);
    }
  }, [selectedMethodData, clearProfile]);

  /** profile handler */
  const handleProfileData = useCallback((profile: PaymentProfileModel) => {
    if (selectedProfileData?.paymentProfileId !== profile.paymentProfileId) {
      setSelectedProfileData(profile);
    }
  }, [selectedProfileData]);

  /** back nav */
  const goBack = async () => {
    await nav.pop();
    StateStack.core.clearScope('payment_flow');
  };

  /** New profile */
  const createProfile = async () => {
    nav.push('new_profile');
  };

  const [continueLoading, setContinueLoading] = useState(false);

  const handleSubmit = async () => {
    setContinueLoading(true);

    try {
      // Here you would handle the top-up submission
      // This would typically involve making an API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // After successful submission, navigate to success page
      nav.push('top_up_success');
    } catch (error) {
      console.error('Error processing top-up:', error);
    } finally {
      setContinueLoading(false);
    }
  };

  // derived booleans
  const showMethods = !!selectedWalletData && amount > 0 && amount >= selectedWalletData.paymentWalletMin;
  const showProfile = !!selectedMethodData && showMethods;
  const showTopUp = !!selectedProfileData && showProfile;

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
          <h1 className={styles.title}>{t('top_up_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>

      <PaymentWallet
        onWalletData={handleWalletData}
        onWalletAmount={handleAmount}
      />


      { showMethods && (<PaymentMethod walletId={selectedWalletData.paymentWalletId} onMethodSelect={handleMethodData} />)}


      {showProfile && (
          <>
            <PaymentProfile
              methodId={selectedMethodData.paymentMethodId}
              methodType={selectedMethodData.paymentMethodChecker}
              onProfileSelect={handleProfileData}
              onCreateProfile={createProfile}
            />

            {selectedMethodData.paymentMethodBuyMultiple && (
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

      {showTopUp && (
        <button
          type="button"
          className={styles.continueButton}
          disabled={continueLoading}
          aria-disabled={continueLoading}
          onClick={handleSubmit}
        >
          {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
        </button>
      )}

      </div>
    </main>
  );
}
