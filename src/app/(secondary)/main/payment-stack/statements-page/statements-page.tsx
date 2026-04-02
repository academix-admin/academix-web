'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './statements-page.module.css';
import { useNav } from "@/lib/NavigationStack";
import { StateStack } from '@/lib/state-stack';
import { getParamatical } from '@/utils/checkers';
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import PaymentWallet from '../../payment-stack/payment-wallet/payment-wallet';
import PaymentMethod from '../../payment-stack/payment-method/payment-method';
import PaymentProfile from '../../payment-stack/payment-profile/payment-profile';
import PaymentType from '../../payment-stack/payment-type/payment-type';
import PaymentNetwork from '../../payment-stack/payment-network/payment-network';
import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { BackendPaymentProfileModel } from '@/models/payment-profile-model';
import { PaymentProfileModel } from '@/models/payment-profile-model';
import { PaymentNetworkModel } from '@/models/payment-method-model';
import { PaginateModel } from '@/models/paginate-model';
import { ProfileModel } from '@/models/profile-model';
import { usePaymentWalletModel } from '@/lib/stacks/payment-wallet-stack';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';
import { usePaymentProfileModel } from '@/lib/stacks/payment-profile-stack';
import DialogCancel from '@/components/DialogCancel';
import LoadingView from '@/components/LoadingView/LoadingView';
import ErrorView from '@/components/ErrorView/ErrorView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import { useDemandState } from '@/lib/state-stack';
import { useDialog } from '@/lib/DialogViewer';



export default function StatementsPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();
  const [walletsModel, , , { clear: clearWallet, isHydrated: walletHydrated }] = usePaymentWalletModel(lang, 'scopeKey');
  const [profilesModel, demandPaymentProfileModel, setPaymentProfileModel] = usePaymentProfileModel(lang);

  const [selectedWalletData, setSelectedWalletData] = useState<PaymentWalletModel | null>(null);
  const [selectedMethodData, setSelectedMethodData] = useState<PaymentMethodModel | null>(null);

  const [selectedTopUpValue, setSelectedTopUpValue] = useState(false);
  const [selectedWithdrawValue, setSelectedWithdrawValue] = useState(false);

  const [selectedNetworkData, setSelectedNetworkData] = useState<PaymentNetworkModel | null>(null);

  const [selectedPaymentData, setSelectedPaymentData] = useState<ProfileModel>(new ProfileModel());

  const [error, setError] = useState('');
  const [continueState, setContinueState] = useState('initial');
  const errorDialog = useDialog();
  const successDialog = useDialog();

  /** back nav */
  const goBack = async () => {
    await nav.pop();
  };


  const handleSubmit = async () => {
    if (!userData || !selectedMethodData || continueState === 'loading') return;

    setError('');
    setContinueState('loading');

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setContinueState('initial');
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('error_occurred')}</p>
          </div>
        );
        return;
      }

    } catch (err: any) {
      console.error("[NewProfile] error:", err);
      setContinueState('initial');
      errorDialog.open(
        <div style={{ textAlign: 'center' }}>
          <p>{t('error_saving_profile')}</p>
          {err?.message && (
            <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
              {err.message}
            </p>
          )}
        </div>
      );
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
          <h1 className={styles.title}>{t('statements_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>

      
      </div>

      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[
          {
            text: t('ok_text'),
            variant: 'primary',
            onClick: () => errorDialog.close()
          }
        ]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff'
        }}
      />

      <successDialog.DialogViewer
        title={t('success_text')}
        buttons={[
          {
            text: t('ok_text'),
            variant: 'primary',
            onClick: async () => {
              successDialog.close();
              await nav.pop();
            }
          }
        ]}
        showCancel={false}
        closeOnBackdrop={false}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff'
        }}
      />
    </main>
  );
}