'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './new-profile-page.module.css';
import { useNav } from "@/lib/NavigationStack";
import { StateStack } from '@/lib/state-stack';
import { getParamatical } from '@/utils/checkers';
import { checkLocation, checkFeatures } from '@/utils/checkers';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUserData } from '@/lib/stacks/user-stack';
import PaymentWallet from '../payment-wallet/payment-wallet';
import PaymentMethod from '../payment-method/payment-method';
import PaymentProfile from '../payment-profile/payment-profile';
import PaymentType from '../payment-type/payment-type';
import PaymentNetwork from '../payment-network/payment-network';
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

interface NewProfileProps {
  walletId: string;
  methodId: string;
  profileType: string;
}

interface MobileMoneyProps {
  onSubmit: (phoneNumber: string | null) => void;
  prefix: string;
  length: number;
}

const MobileMoney = ({ onSubmit, prefix, length }: MobileMoneyProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const [phoneInputValue, setPhoneInputValue] = useState('');
  const [phoneNumberState, setPhoneNumberState] = useState('initial');

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (value.length === 0) {
      setPhoneInputValue('');
      onSubmit(null);
      setPhoneNumberState('initial');
      return;
    }

    const regex = /^\d+$/;
    const valid = regex.test(value);
    if (value.length <= length) {
      setPhoneInputValue(value);
      setPhoneNumberState(valid ? 'valid' : 'invalid');
    }
    if(valid && value.length === length){
       onSubmit(`${prefix}${value}`.replace('+',''));
    }else{
       onSubmit(null);
    }

  };

  return (
    <div className={styles.formGroup}>
                <label htmlFor="phoneNumber" className={styles.label}>{t('phone_number_label')}</label>
                <div className={styles.phoneInputContainer}>
                  <span className={styles.prefix}>{`${prefix} - `}</span>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={phoneInputValue}
                    maxLength={length}
                    onChange={handlePhoneNumberChange}
                    placeholder={t('phone_number_placeholder')}
                    className={styles.input}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                  />
                </div>
                            {phoneNumberState === 'invalid' && (
                              <p className={styles.errorText}>{t('phone_number_invalid')}</p>
                            )}
                            {phoneNumberState === 'valid' && (
                              <p className={styles.validText}>{t('phone_number_valid')}</p>
                            )}
              </div>
  );
};


export default function NewProfilePage(props: NewProfileProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();
  const { walletId, methodId, profileType } = props;

  const [walletsModel, , , { clear: clearWallet, isHydrated: walletHydrated }] = usePaymentWalletModel(lang);
  const [methodsModel, , , { clear: clearMethod, isHydrated: methodHydrated  }] = usePaymentMethodModel(lang);
  const [profilesModel, demandPaymentProfileModel, setPaymentProfileModel] = usePaymentProfileModel(lang);

  const [selectedWalletData, setSelectedWalletData] = useState<PaymentWalletModel | null>(null);
  const [selectedMethodData, setSelectedMethodData] = useState<PaymentMethodModel | null>(null);

  const [selectedTopUpValue, setSelectedTopUpValue] = useState(false);
  const [selectedWithdrawValue, setSelectedWithdrawValue] = useState(false);

  const [selectedNetworkData, setSelectedNetworkData] = useState<PaymentNetworkModel | null>(null);

  const [selectedPaymentData, setSelectedPaymentData] = useState<ProfileModel>(new ProfileModel());

  const [topUpModify, setTopUpModify] = useState(false);
  const [withdrawModify, setWithdrawModify] = useState(false);

  const [walletModify, setWalletModify] = useState(false);
  const [methodModify, setMethodModify] = useState(false);

  const [topUp, setTopUp] = useState(false);
  const [withdraw, setWithdraw] = useState(false);

  const [error, setError] = useState('');
  const [continueState, setContinueState] = useState('initial');

//   useEffect(() => {
//     console.log(selectedPaymentData);
//   }, [selectedPaymentData]);

  useEffect(() => {
    setWalletModify(selectedWalletData === null);
  }, [selectedWalletData]);

  useEffect(() => {
    setMethodModify(selectedMethodData === null);
  }, [selectedMethodData]);

  /** back nav */
  const goBack = async () => {
    await nav.pop();
  };

  /** wallet handler */
  const handleWalletData = useCallback((wallet: PaymentWalletModel) => {
    if (selectedWalletData?.paymentWalletId !== wallet.paymentWalletId) {
      if(!methodId)setSelectedMethodData(null);
      setSelectedWalletData(wallet);
      setError('');
    }
  }, [selectedWalletData, clearMethod]);

  /** method handler */
  const handleMethodData = useCallback((method: PaymentMethodModel) => {
    if (selectedMethodData?.paymentMethodId !== method.paymentMethodId) {
      setError('');
      if (profileType === 'ProfileType.buy') {
          setTopUpModify(false);
          setTopUp(method.paymentMethodBuyActive ?? false);
          const getWithdrawModify = method.paymentMethodSellActive ?? true;
          setWithdrawModify(getWithdrawModify)
          if (!getWithdrawModify) setWithdraw(getWithdrawModify);
      }
      if (profileType === 'ProfileType.sell') {
          setWithdrawModify(false);
          setWithdraw(method.paymentMethodSellActive ?? false);
          const getTopUpModify = method.paymentMethodBuyActive ?? true;
          if (!getTopUpModify) setTopUp(getTopUpModify);
      }
        setSelectedMethodData(method);
    }
  }, [selectedMethodData]);

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
        setError(t('error_occurred'));
        setContinueState('error');
        return;
      }

      const both = topUp && withdraw;
      const { data, error } = await supabaseBrowser.rpc("submit_or_update_user_profile", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_method_id: selectedMethodData.paymentMethodId,
        p_profile_type: !both ? profileType : 'ProfileType.both',
        p_profile_data: selectedPaymentData.toJson(),
        ...(topUp && { p_buy_status: topUp }),
        ...(withdraw && { p_sell_status: withdraw }),
      });

      if (error) {
        console.error("[NewProfile] error:", error);
        setError(t('error_saving_profile'));
        setContinueState('error');
        return;
      }

      console.log(data);
      if (data?.status === 'PaymentProfile.success') {
        const paymentProfile = new PaymentProfileModel(data.payment_profile_details);

        if (profilesModel.length <= 0) {
          const profiles = await fetchPaymentProfileModel(selectedMethodData.paymentMethodId);
          setPaymentProfileModel([paymentProfile, ...profiles]);
        } else {
          setPaymentProfileModel([paymentProfile, ...profilesModel]);
        }

        await nav.pop();
      } else {
        setError(t('error_saving_profile'));
        setContinueState('error');
      }

    } catch (err) {
      console.error("[NewProfile] error:", err);
      setError(t('error_saving_profile'));
      setContinueState('error');
    }
  };

  const fetchPaymentProfileModel = useCallback(async (methodId: string): Promise<PaymentProfileModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc(
        profileType === 'ProfileType.buy' ? "fetch_top_up_profiles" : "fetch_withdraw_profiles",
        {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
          p_limit_by: 100,
          p_method_id: methodId,
          p_after_profiles: (new PaginateModel()).toJson(),
        }
      );

      if (error) {
        console.error("[PaymentProfileModel] error:", error);
        return [];
      }

      return (data || []).map((row: BackendPaymentProfileModel) => new PaymentProfileModel(row));
    } catch (err) {
      console.error("[PaymentProfileModel] error:", err);
      return [];
    }
  }, [lang, profileType, userData]);

  const getPaymentMethodView = (paymentMethod: PaymentMethodModel | null): React.JSX.Element => {
    if(!paymentMethod)return (<></>);
    switch (paymentMethod.paymentMethodChecker) {
      case 'PaymentMethod.mobile_money':
        return (<MobileMoney onSubmit={(phoneNumber) => setSelectedPaymentData(selectedPaymentData.copyWith({phone: phoneNumber, network: selectedNetworkData?.identity}))} prefix={paymentMethod.countryPhoneCode} length={paymentMethod.countryPhoneDigits} />);
      case 'PaymentMethod.e_naira':
        return (<></>);
      case 'PaymentMethod.private_account':
        return (<></>);
      case 'PaymentMethod.opay':
        return (<></>);
      case 'PaymentMethod.bank_transfer':
        return (<></>);
      case 'PaymentMethod.ussd':
        return (<></>);
      default:
        return (<></>);
    }
  };

  const getPaymentVerified = (paymentMethod: PaymentMethodModel | null, selectedPaymentData: ProfileModel | null): boolean => {
    if(!selectedPaymentData || !paymentMethod)return false;
    switch (paymentMethod.paymentMethodChecker) {
      case 'PaymentMethod.mobile_money':
        return !!selectedPaymentData.phone;
      case 'PaymentMethod.e_naira':
        return !!selectedPaymentData.eNaira;
      case 'PaymentMethod.private_account':
        return !!selectedPaymentData.privateAccount;
      case 'PaymentMethod.opay':
        return !!selectedPaymentData.opay;
      case 'PaymentMethod.bank_transfer':
        return !!selectedPaymentData.bankCode && !!selectedPaymentData.bankName && !!selectedPaymentData.accountNumber && !!selectedPaymentData.fullname ;
      case 'PaymentMethod.ussd':
        return !!selectedPaymentData.bankCode && !!selectedPaymentData.bankName;
      default:
        return false;
    }
  };

  // derived booleans
  const showMethods = !!selectedWalletData;
  const showType = !!selectedMethodData;
  const showNetwork = showType && (selectedTopUpValue || selectedWithdrawValue);
  const showInput = !!selectedNetworkData || (selectedMethodData && selectedMethodData.paymentMethodNetwork.length <= 0);

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
          <h1 className={styles.title}>{t('new_profile_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>

        <PaymentWallet
          profileType={profileType}
          onWalletData={handleWalletData}
          paymentWalletId={walletId}
          modify={walletModify}
        />

        {showMethods && (
          <PaymentMethod
            profileType={profileType}
            walletId={selectedWalletData.paymentWalletId}
            onMethodSelect={handleMethodData}
            paymentMethodId={methodId}
            modify={methodModify}
          />
        )}

        {showType && (
          <PaymentType
            onTopUp={setSelectedTopUpValue}
            onWithdraw={setSelectedWithdrawValue}
            initialTopUp={topUp}
            initialWithdraw={withdraw}
            modifyTopUp={topUpModify}
            modifyWithdraw={withdrawModify}
          />
        )}

        {showNetwork && (
          <PaymentNetwork
            paymentMethodId={selectedMethodData.paymentMethodId}
            onNetworkSelect={setSelectedNetworkData}
          />
        )}

        {showInput && (<div className={styles.experienceContainer} > {getPaymentMethodView(selectedMethodData)} </div>)}


        {getPaymentVerified(selectedMethodData, selectedPaymentData) && <button
            type="button"
            className={styles.continueButton}
            onClick={handleSubmit}
            disabled={continueState === 'loading'}
          >
            {continueState === 'loading' ? <span className={styles.spinner}></span> : t('continue')}
          </button>}

      </div>
    </main>
  );
}