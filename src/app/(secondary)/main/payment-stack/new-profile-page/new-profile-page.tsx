'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import { useDemandState } from '@/lib/state-stack';


interface BankModel {
  id: number;
  code: string;
  name: string;
}

interface Account {
  account_number: string;
  account_name: string;
}

interface AccountSearchResponse {
  status: string;
  details?: Account;
}

interface BankResponse {
  status: string;
  banks: BankModel[];
}

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

interface AccountActivateProps {
  onSubmit: (value: boolean) => void;
  purpose: string;
}

interface BankViewProps {
  onSubmit: (bank: BankModel) => void;
  methodId: string;
}

interface BankItemProps {
  onClick: () => void;
  bank: BankModel;
  isSelected?: boolean;
}

interface BankTransferProps {
  onSubmit: (bank: BankModel | null, account: Account | null) => void;
  methodId: string;
}

const BankTransfer = ({ onSubmit, methodId }: BankTransferProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();

  const [bankData, setBankData] = useState<BankModel | null>(null);
  const [accountNumberInputValue, setAccountNumberInputValue] = useState('');
  const [accountNumberState, setAccountNumberState] = useState('initial');
  const [accountData, setAccountData] = useState<Account | null>(null);

  const [error, setError] = useState('');
  const [searchLoading, setSearchingLoading] = useState(false);

  useEffect(() => {
    if(!bankData || !accountData){
        onSubmit(null, null);
        return;
    }
     onSubmit(bankData, accountData);
  }, [bankData, accountData]);

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setAccountData(null);
    setError('');
    if (value.length === 0) {
      setAccountNumberInputValue('');
      onSubmit(null, null);
      setAccountNumberState('initial');
      return;
    }

    const regex = /^\d+$/;
    const valid = regex.test(value);
      setAccountNumberInputValue(value);
      setAccountNumberState(valid ? 'valid' : 'invalid');
  };

  // Function to find account API call
  const findAccount = async (jwt: string, data: any): Promise<AccountSearchResponse> => {
    // Use the App Router API endpoint
    const proxyUrl = '/api/account-verification';

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
      console.error("Account search error:", error);
      throw error;
    }
  };

  
  const handleSearch = async () => {
    if (!bankData || !accountNumberInputValue) return;

    try {
        setSearchingLoading(true);
        setError('');
      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.log('no JWT token');
        setSearchingLoading(false);
        setError(t('error_occurred') );
        return;
      }

      const requestData = {
        accountNumber: accountNumberInputValue,
        bankCode: bankData.code,
      };

      const search = await findAccount(jwt, requestData);
      const status = search.status;

      const account = search.details as Account | null;

      if (account && status === 'AccountStatus.success') {
        setAccountData(account);
      }
  
     setSearchingLoading(false);

    } catch (error: any) {
      console.error("Account Search error:", error);
      setSearchingLoading(false);
      setError(t('error_occurred'));
    }
  };  

  return (
    <div className={styles.container}>
       <BankView onSubmit={(bank) => {setAccountData(null); setError(''); setBankData(bank);}} methodId={methodId}/>
          {bankData && <div className={styles.accountNumberGroup}>
                       <label htmlFor="accountNumber" className={styles.label}>{t('account_number_label')}</label>
                       <div className={styles.accountNumberContainer}>
                         <input
                           type="text"
                           id="accountNumber"
                           name="accountNumber"
                           value={accountNumberInputValue}
                           onChange={handleAccountNumberChange}
                           placeholder={t('account_number_placeholder')}
                           className={styles.input}
                           inputMode="numeric"
                           pattern="[0-9]*"
                           required
                         />
                       </div>
                                   {accountNumberState === 'invalid' && !accountData && (
                                     <p className={styles.errorText}>{t('number_invalid')}</p>
                                   )}
                                   {accountNumberState === 'valid' && !accountData && (
                                     <p className={styles.validText}>{t('number_valid')}</p>
                                   )}
                                   {accountData && (
                                     <p className={styles.validText}>{accountData.account_name}</p>
                                   )}
                                   {error && !accountData && (
                                     <p className={styles.errorText}>{error}</p>
                                   )}

                     </div>}

                             {bankData && accountNumberState === 'valid' && !accountData  && <button
                               onClick={handleSearch}
                               type="button"
                               className={styles.continueButton}
                               disabled={searchLoading}
                               aria-disabled={searchLoading}
                             >
                               { searchLoading ?  <span className={styles.spinner}></span> : t('search')}
                             </button>  }


    </div>
  );
};



const BankItem = ({ onClick, bank, isSelected }: BankItemProps) => {
  const { theme } = useTheme();
  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };
  return (
    <div
      className={`${styles.bankItem} ${styles[`bankItem_${theme}`]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      aria-label={`Select ${bank.name}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.bankItemInfo}>
        <div className={styles.bankItemName}>{bank.name}</div>
        <div className={styles.bankItemCode}>{bank.code}</div>
      </div>
      {isSelected && (
        <div className={styles.bankItemCheckmark}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

const BankView = ({ onSubmit, methodId }: BankViewProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();

  const [bankData, setBankData] = useState<BankModel | null>(null);
  const [error, setError] = useState('');

  const [bankSelectId, bankSelectController, bankSelectIsOpen, bankSelectionState] = useSelectionController();
  const [searchBankQuery, setBankQuery] = useState('');

  const [banksModel, demandBankModel, setBankModel, { isHydrated }] = useDemandState<BankModel[]>(
                                                                                                       [],
                                                                                                       {
                                                                                                         key: "banksModel",
                                                                                                         persist: true,
                                                                                                         ttl: 3600,
                                                                                                         scope: "payment_flow",
                                                                                                         deps: [lang],
                                                                                                       }
                                                                                                     );
  useEffect(() => {
    if(!bankData)return;
     onSubmit(bankData);
  }, [bankData]);

  // Function to fetch banks API call
  const fetchBanks = async (jwt: string, data: any): Promise<BankResponse> => {
    // Use the App Router API endpoint
    const proxyUrl = '/api/banks';

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
      console.error("Fetch bank error:", error);
      throw error;
    }
  };

  const callFetchBanks = async () => {
    try {
      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.log('no JWT token');
        return [];
      }

      const requestData = {
        methodId: methodId
      };

      const banksModel = await fetchBanks(jwt, requestData);
      const status = banksModel.status;

      if(status === 'BankStatus.success'){
        return (banksModel.banks || []) as BankModel[];
      }else{
          return [];
      }

    } catch (error: any) {
      console.error("Fetch bank error:", error);
      return [];
    }
  };

  const loadBanks = useCallback(() => {
    demandBankModel(async ({ get, set }) => {
      bankSelectController.setSelectionState("loading");
      const banks = await callFetchBanks();

      if (!banks) {
        bankSelectController.setSelectionState("error");
        return;
      }
      if (banks.length > 0) {
        set(banks);
        bankSelectController.setSelectionState("data");
      } else {
        bankSelectController.setSelectionState("empty");
      }
    });
  }, [demandBankModel, callFetchBanks, bankSelectController]);

  const openBank = useCallback(() => {
    bankSelectController.toggle();
    loadBanks();
  }, [ bankSelectController, loadBanks]);

  const handleBankSearch = useCallback((query: string) => {
    setBankQuery(query);
  }, []);

  const filteredBanks = useMemo(() => {
    if (!searchBankQuery) return banksModel;

    const filters = banksModel.filter(item =>
      item.name.toLowerCase().includes(searchBankQuery.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchBankQuery.toLowerCase())
    );

    if (filters.length <= 0 && banksModel.length > 0) {
      bankSelectController.setSelectionState("empty");
    }

    return filters;
  }, [banksModel, searchBankQuery]);

  const handleBankSelect = useCallback((bank: BankModel) => {
    setBankData(bank);
    bankSelectController.close();
  }, [bankSelectController]);

  const getInitials = useCallback((text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, []);

  return (
    <div className={styles.formGroup}>
        <label htmlFor="activate" className={styles.label}>{t('bank_label')}</label>
        <button onClick={openBank} className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`}>
          {bankData ? (
            <div className={styles.selectedBank}>
              <div className={`${styles.bankInfo} ${styles[`methodInfo_${theme}`]}`}>
                <div className={styles.bankName}>{bankData.name}</div>
                <div className={styles.bankCode}>{bankData.code}</div>
              </div>
            </div>
          ) : (
            <div className={styles.placeholder}>
              {t('select_banks')}
            </div>
          )}
          <svg className={styles.chevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>

      <SelectionViewer
        id={bankSelectId}
        isOpen={bankSelectIsOpen}
        onClose={bankSelectController.close}
        titleProp={{
          text: t('select_banks'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: bankSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleBankSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
        }}
        noResultProp={{
          view: <NoResultsView text={t('no_results')} buttonText={t('try_again')} onButtonClick={loadBanks} />,
        }}
        errorProp={{
          view: <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={loadBanks} />,
        }}
        layoutProp={{
          gapBetweenHandleAndTitle: "16px",
          gapBetweenTitleAndSearch: "8px",
          gapBetweenSearchAndContent: "16px",
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        snapPoints={[1]}
        initialSnap={1}
        minHeight="65vh"
        maxHeight="90vh"
        closeThreshold={0.2}
        selectionState={bankSelectionState}
        zIndex={1000}
      >
        {filteredBanks.map((item) => (
          <BankItem
            key={item.id}
            onClick={() => handleBankSelect(item)}
            bank={item}
            isSelected={bankData?.id === item.id}
          />
        ))}
      </SelectionViewer>

    </div>
  );
};


const AccountActivate = ({ onSubmit, purpose }: AccountActivateProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();

  const [ value , setValue ] = useState(false);

  const changeValue = () =>{
      setValue(prev => { return !prev;});
      onSubmit(!value);
  }

  return (
    <div className={styles.formGroup}>
        <label htmlFor="activate" className={styles.label}>{t('activate_label')}</label>
        <div
          className={`${styles.selectButton} ${styles[`selectButton_${theme}`]} ${value ? styles.selectButton_active : ''}`}
          onClick={changeValue}
        >
          <div className={`${styles.switch} ${value ? styles.switch_active : ''} ${styles[`switch_${theme}`]}`}>
             <div className={`${styles.switchHandle} ${value ? styles.switchHandle_active : ''} ${styles[`switchHandle_${theme}`]}`} />
          </div>
          <span className={`${styles.optionText} ${styles[`optionText_${theme}`]}`}>
            {purpose}
          </span>

        </div>
    </div>
  );
};

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
  const [banksModel, , , { clear: clearMethod, isHydrated: methodHydrated  }] = usePaymentMethodModel(lang);
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
          setTopUpModify(getTopUpModify);
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
          setPaymentProfileModel(profiles);
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
    if(!paymentMethod || !userData)return (<></>);
    switch (paymentMethod.paymentMethodChecker) {
      case 'PaymentMethod.mobile_money':
        return (<MobileMoney onSubmit={(phoneNumber) => setSelectedPaymentData(selectedPaymentData.copyWith({phone: phoneNumber, network: selectedNetworkData?.identity}))} prefix={paymentMethod.countryPhoneCode} length={paymentMethod.countryPhoneDigits} />);
      case 'PaymentMethod.e_naira':
        return (<AccountActivate onSubmit={(value)=> setSelectedPaymentData(selectedPaymentData.copyWith({phone: userData.usersPhone, eNaira: value}))} purpose={t('e_naira_text')} />);
      case 'PaymentMethod.private_account':
        return (<AccountActivate onSubmit={(value)=> setSelectedPaymentData(selectedPaymentData.copyWith({phone: userData.usersPhone, privateAccount: value}))} purpose={t('private_account_text')} />);
      case 'PaymentMethod.opay':
        return (<AccountActivate onSubmit={(value)=> setSelectedPaymentData(selectedPaymentData.copyWith({phone: userData.usersPhone, opay: value}))} purpose={t('opay_text')} />);
      case 'PaymentMethod.direct_debit':
        return (<AccountActivate onSubmit={(value)=> setSelectedPaymentData(selectedPaymentData.copyWith({phone: userData.usersPhone, directDebit: value}))} purpose={t('direct_debit_text')} />);
      case 'PaymentMethod.bank_transfer':
        return (<BankTransfer onSubmit={(bank, account) => setSelectedPaymentData(selectedPaymentData.copyWith({phone: userData.usersPhone, bankCode: bank?.code, bankName: bank?.name, accountNumber: account?.account_number, fullname: account?.account_name}))} methodId={paymentMethod.paymentMethodId}/>);
      case 'PaymentMethod.ussd':
        return (<BankView onSubmit={(bank)=> setSelectedPaymentData(selectedPaymentData.copyWith({phone: userData.usersPhone, bankCode: bank.code, bankName: bank.name}))} methodId={paymentMethod.paymentMethodId}/>);
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
      case 'PaymentMethod.direct_debit':
        return !!selectedPaymentData.directDebit;
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