'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './payment-wallet.module.css';
import { useNav } from "@/lib/NavigationStack";
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendBuyPaymentWalletModel } from '@/models/payment-wallet-model';
import { BackendSellPaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { usePaymentWalletModel } from '@/lib/stacks/payment-wallet-stack';

interface PaymentWalletProps {
  profileType: string;
  onWalletData: (walletModel: PaymentWalletModel) => void;
  onWalletAmount?: (walletAmount: number) => void;
  entryMode?: boolean;
  paymentWalletId?: string | null;
  modify?: boolean;
}

interface WalletItemProps {
  onClick: () => void;
  wallet: PaymentWalletModel;
  isSelected?: boolean;
}

const WalletItem = ({ onClick, wallet, isSelected }: WalletItemProps) => {
  const { theme } = useTheme();

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div
      className={`${styles.walletItem} ${styles[`walletItem_${theme}`]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      aria-label={`Select ${wallet.paymentWalletIdentity}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.walletItemImage}>
        {wallet.paymentWalletImage ? (
          <img src={wallet.paymentWalletImage} alt={wallet.paymentWalletIdentity} />
        ) : (
          <div className={styles.walletInitials}>{getInitials(wallet.paymentWalletIdentity)}</div>
        )}
      </div>
      <div className={styles.walletItemInfo}>
        <div className={styles.walletItemCurrency}>{wallet.paymentWalletCurrency}</div>
        <div className={styles.walletItemName}>{wallet.paymentWalletIdentity}</div>
      </div>
      {isSelected && (
        <div className={styles.walletItemCheckmark}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default function PaymentWallet({ profileType, onWalletData, onWalletAmount, entryMode = false, paymentWalletId, modify = true }: PaymentWalletProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const isTop = nav.isTop();
  const { userData } = useUserData();
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [walletAmount, setWalletAmount] = useState('');
  const [academixAmount, setAcademixAmount] = useState('');
  const [paymentSwitch, setPaymentSwitch] = useState<'wallet' | 'academix'>('wallet');
  const [isFocused, setIsFocused] = useState(false);
  const walletInputRef = useRef<HTMLInputElement>(null);
  const academixInputRef = useRef<HTMLInputElement>(null);

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [walletData, setWalletData] = useState<PaymentWalletModel | null>(null);
  const [userWalletState, setUserWalletState] = useState<'initial' | 'loading' | 'data' | 'error'>('initial');

  const academixPaymentWallet = new PaymentWalletModel(
    'PaymentType.buy',
    {
      payment_wallet_id: "",
      sort_created_id: "",
      payment_wallet_buy_min: 0,
      payment_wallet_buy_rate: 0,
      payment_wallet_currency: "ADC",
      payment_wallet_identity: "Academix Coin",
      payment_wallet_buy_rate_type: "",
      payment_wallet_buy_fee: 0,
      payment_wallet_image: "",
    }
  );

  const [walletSelectId, walletSelectController, walletSelectIsOpen, walletSelectionState] = useSelectionController();
  const [searchWalletQuery, setWalletQuery] = useState('');

  const [walletsModel, demandPaymentWalletModel, setPaymentWalletModel, { isHydrated }] = usePaymentWalletModel(lang);

  useEffect(() => {
    if(!walletData)return;
     onWalletData(walletData);
     if(onWalletAmount)onWalletAmount(Number(walletAmount) || 0);
  }, [walletAmount, walletData]);

  useEffect(() => {
    if(!isHydrated)return;
    if(walletsModel.length === 0 && paymentWalletId){loadWallets(); return;}
    const getWallet = walletsModel.find((e) => e.paymentWalletId === paymentWalletId);
    if (getWallet) {
      setWalletData(getWallet);
      setUserWalletState('data');
    }
  }, [walletsModel, paymentWalletId, isHydrated]);

  const handleUserTopUpWallet = useCallback(async () => {
    if (!userData || userWalletState === 'loading' || !!walletData) return;

    try {
      setUserWalletState('loading');
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setUserWalletState('error');
        return;
      }

      const { data, error } = await supabaseBrowser.rpc(profileType === 'ProfileType.buy' ? "fetch_user_top_up_wallet" : "fetch_user_withdraw_wallets", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_country_id: userData.countryId
      });

      if (error) {
        console.error("[UserTopUpWallet] error:", error);
        setUserWalletState('error');
        return;
      }

      if (data) {
        const wallet = new PaymentWalletModel(profileType === 'ProfileType.buy' ? 'PaymentType.buy' : 'PaymentType.sell', data);
        if((paymentWalletId && paymentWalletId === wallet.paymentWalletId) || !paymentWalletId)setWalletData(wallet);
        setUserWalletState('data');
      } else {
        setUserWalletState('error');
      }
    } catch (err) {
      console.error("[UserTopUpWallet] error:", err);
      setUserWalletState('error');
    }
  }, [userData, lang, walletData, userWalletState]);

  useEffect(() => {
    handleUserTopUpWallet();
  }, [handleUserTopUpWallet, paymentWalletId]);


  const fetchPaymentWalletModel = useCallback(async (
    userData: UserData,
    limitBy: number,
    paginateModel: PaginateModel
  ): Promise<PaymentWalletModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc(profileType === 'ProfileType.buy' ? "fetch_top_up_wallets" : "fetch_withdraw_wallets", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_after_wallets: paginateModel.toJson(),
      });

      if (error) {
        console.error("[PaymentWalletModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendBuyPaymentWalletModel | BackendSellPaymentWalletModel) => new PaymentWalletModel(profileType === 'ProfileType.buy' ? 'PaymentType.buy' : 'PaymentType.sell',row));
    } catch (err) {
      console.error("[PaymentWalletModel] error:", err);
      return [];
    }
  }, [lang]);

  const extractLatest = useCallback((userPaymentWalletModel: PaymentWalletModel[]) => {
    if (userPaymentWalletModel.length > 0) {
      const lastItem = userPaymentWalletModel[userPaymentWalletModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  }, []);

  const processPaymentWalletModelPaginate = useCallback((userPaymentWalletModel: PaymentWalletModel[]) => {
    const oldPaymentWalletModelIds = walletsModel.map((e) => e.paymentWalletId);
    const newPaymentWalletModel = [...walletsModel];

    for (const wallet of userPaymentWalletModel) {
      if (!oldPaymentWalletModelIds.includes(wallet.paymentWalletId)) {
        newPaymentWalletModel.push(wallet);
      }
    }

    setPaymentWalletModel(newPaymentWalletModel);
  }, [walletsModel, setPaymentWalletModel]);

  const callPaginate = useCallback(async (): Promise<boolean> => {
    if (!userData || walletsModel.length <= 0) return false;

    const wallets = await fetchPaymentWalletModel(userData, 20, paginateModel);
    if (wallets.length > 0) {
      extractLatest(wallets);
      processPaymentWalletModelPaginate(wallets);
      return true;
    }
    return false;
  }, [userData, walletsModel, paginateModel, fetchPaymentWalletModel, extractLatest, processPaymentWalletModelPaginate]);

  const refreshData = useCallback(async () => {
    if (!userData || walletsModel.length > 0) return;

    const wallets = await fetchPaymentWalletModel(userData, 100, paginateModel);
    if (wallets.length > 0) {
      extractLatest(wallets);
      setPaymentWalletModel(wallets);
    }
  }, [userData, walletsModel, paginateModel, fetchPaymentWalletModel, extractLatest, setPaymentWalletModel]);

  // Handle wallet amount change
  const handleWalletAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setWalletAmount(value);
      if (paymentSwitch === 'wallet' && walletData?.paymentWalletRate) {
        const numValue = parseFloat(value) || 0;
        setPaymentAmount(numValue);
        setAcademixAmount(parseFloat((numValue * walletData.paymentWalletRate).toFixed(2)).toString());
      }
    }
  }, [paymentSwitch, walletData?.paymentWalletRate]);

  // Handle academix amount change
  const handleAcademixAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAcademixAmount(value);
      if (paymentSwitch === 'academix' && walletData?.paymentWalletRate) {
        const numValue = parseFloat(value) || 0;
        setPaymentAmount(numValue);
        if(numValue > 0)setWalletAmount((numValue / walletData.paymentWalletRate).toString());
        if(numValue <= 0)setWalletAmount('');
      }
    }
  }, [paymentSwitch, walletData?.paymentWalletRate]);

  // Switch between wallet and academix
  const switchPaymentMode = useCallback(() => {
    setPaymentSwitch(prev => prev === 'wallet' ? 'academix' : 'wallet');
  }, []);

  // Calculate fee
  const calculateFee = useCallback((type:string, value: number) => {
      let feeValue = 0;
      if(walletData?.paymentWalletRateType === 'RateType.PERCENT'){
          feeValue = (walletData.paymentWalletFee / 100) * value;
      }
      if(walletData?.paymentWalletRateType === 'RateType.FEE'){
          feeValue = walletData.paymentWalletFee;
      }

     if(type === 'PaymentType.sell'){
         feeValue = ((walletData?.paymentWalletRate || 0) * feeValue);
     }

    return parseFloat(feeValue.toFixed(2)).toString();
  }, [walletData?.paymentWalletRateType, walletData?.paymentWalletFee, walletData?.paymentWalletRate]);

  // Format number with commas
  const formatNumber = useCallback((num: number) => {
    return parseFloat(num.toFixed(2)).toString();
  }, []);

  useEffect(() => {
    setIsFocused(paymentSwitch === 'academix');
  }, [paymentSwitch]);

  const loadWallets = useCallback(() => {
    if(!userData)  return;
    demandPaymentWalletModel(async ({ get, set }) => {
      walletSelectController.setSelectionState("loading");
      const wallets = await fetchPaymentWalletModel(userData!, 100, new PaginateModel());

      if (!wallets) {
        walletSelectController.setSelectionState("error");
        return;
      }

      extractLatest(wallets);
      if (wallets.length > 0) {
        set(wallets);
        walletSelectController.setSelectionState("data");
      } else {
        walletSelectController.setSelectionState("empty");
      }
    });
  }, [demandPaymentWalletModel, fetchPaymentWalletModel, userData, extractLatest, walletSelectController]);

  const openWallet = useCallback(() => {
    if (!userData || !modify) return;
    walletSelectController.toggle();
    loadWallets();
  }, [isFocused, userData, walletSelectController, loadWallets]);

  const handleWalletSearch = useCallback((query: string) => {
    setWalletQuery(query);
  }, []);

  // Reset amounts when wallet changes
  useEffect(() => {
    if (walletData) {
      setWalletAmount('');
      setAcademixAmount('');
      setPaymentAmount(0);
    }
  }, [walletData?.paymentWalletId]);

  const filteredWallets = useMemo(() => {
    if (!searchWalletQuery) return walletsModel;

    const filters = walletsModel.filter(item =>
      item.paymentWalletIdentity.toLowerCase().includes(searchWalletQuery.toLowerCase()) ||
      item.paymentWalletCurrency.toLowerCase().includes(searchWalletQuery.toLowerCase())
    );

    if (filters.length <= 0 && walletsModel.length > 0) {
      walletSelectController.setSelectionState("empty");
    }

    return filters;
  }, [walletsModel, searchWalletQuery]);

  const handleWalletSelect = useCallback((wallet: PaymentWalletModel) => {
    setWalletData(wallet);
    walletSelectController.close();
  }, [walletSelectController]);

  const getInitials = useCallback((text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, []);

  if (!walletData) {
    if (userWalletState === 'loading') return <LoadingView />;
    if (userWalletState === 'error') return (
      <ErrorView
        text="Error occurred."
        buttonText="Try Again"
        onButtonClick={handleUserTopUpWallet}
      />
    );
    return null;
  }

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('payment_wallet_text')}
      </h2>

      {
       entryMode
      ?<div className={`${styles.paymentWalletContainer} ${styles[`paymentWalletContainer_${theme}`]}`}>
        <div className={styles.walletHeader}>
          <div className={styles.walletImageContainer} onClick={switchPaymentMode}>
            {isFocused ? (
              <div className={styles.swapIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 17V10l-4 4 4 4v-7h2v7h-2zm-8-7V7H6v7h2v-3l4 4-4 4v-3H6c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h2v2H6v10h2v-3z"/>
                </svg>
              </div>
            ) : (
              <div className={styles.walletImage}>
                {walletData.paymentWalletImage ? (
                  <img src={walletData.paymentWalletImage} alt={walletData.paymentWalletIdentity} />
                ) : (
                  <div className={styles.walletInitials}>{getInitials(walletData.paymentWalletIdentity)}</div>
                )}
              </div>
            )}
          </div>

          <div role='button' onClick={openWallet} className={styles.walletInfo}>
            <div className={styles.walletCurrency}>
              {paymentSwitch === 'academix' && isFocused ? academixPaymentWallet.paymentWalletCurrency : walletData.paymentWalletCurrency}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
            </div>
            <div className={styles.walletName}>
              {paymentSwitch === 'academix' && isFocused ? academixPaymentWallet.paymentWalletIdentity : walletData.paymentWalletIdentity}
            </div>
          </div>

          <div className={styles.rateInfo}>
            <div className={styles.rateLabel}>{t('rate_text')}</div>
            <div className={styles.rateValue}>{walletData.paymentWalletRate}</div>
          </div>
        </div>

        <div className={styles.amountInputContainer}>
          <input
            ref={paymentSwitch === 'wallet' ? walletInputRef : academixInputRef}
            type="text"
            className={styles.amountInput}
            value={paymentSwitch === 'wallet' ? walletAmount : academixAmount}
            onChange={paymentSwitch === 'wallet' ? handleWalletAmountChange : handleAcademixAmountChange}
            placeholder="0.00"
            inputMode="decimal"
            pattern="^\d+(\.\d*)?$"
          />
        </div>

        <div className={styles.infoContainer}>
          <div className={styles.feeInfo}>
            <div className={styles.feeLabel}>
              {paymentSwitch === 'wallet' ? (
                `${t('min_text')}: ${walletData.paymentWalletCurrency}${walletData.paymentWalletMin} `
              ) : (
                <div className={styles.feeContainer}>
                  {t('fee_text')}:{' '}
                  {walletData.paymentWalletType === 'PaymentType.buy' ? (
                    walletData.paymentWalletCurrency
                  ) : (
                    <svg
                      className={styles.academixIconLarge}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                  )}
                  {calculateFee(
                    walletData.paymentWalletType, (Number(walletAmount) || 0)
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={styles.feeValue}>
            {paymentSwitch === 'academix' ? (
              `${t('min_text')}: ${walletData.paymentWalletCurrency}${walletData.paymentWalletMin} `
            ) : (
              <div className={styles.valueContainer}>
                {t('fee_text')}:{' '}
                {walletData.paymentWalletType === 'PaymentType.buy' ? (
                  walletData.paymentWalletCurrency
                ) : (
                  <svg
                    className={styles.academixIconLarge}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                )}
                {calculateFee(
                  walletData.paymentWalletType, (Number(walletAmount) || 0)
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.convertedAmount}>
          <div className={styles.currencySymbol}>
            {paymentSwitch === 'academix' && isFocused ? (
              walletData.paymentWalletCurrency
            ) : (
              <svg className={styles.academixIconLarge} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
            )}
          </div>
          <div className={styles.convertedValue}>
            {formatNumber(
              paymentSwitch === 'wallet' ?
              (parseFloat(academixAmount) || 0) :
              (parseFloat(walletAmount) || 0)
            )}
          </div>
        </div>
      </div>
       : <button onClick={openWallet} className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`}>
          {walletData ? (
            <div className={styles.selectedMethod}>
              <div className={styles.methodImage}>
                {walletData.paymentWalletImage ? (
                  <img src={walletData.paymentWalletImage} alt={walletData.paymentWalletIdentity} />
                ) : (
                  <div className={styles.methodInitials}>{getInitials(walletData.paymentWalletIdentity)}</div>
                )}
              </div>
              <div className={`${styles.methodInfo} ${styles[`methodInfo_${theme}`]}`}>
                <div className={styles.methodName}>{walletData.paymentWalletIdentity}</div>
                <div className={styles.methodCountry}>{walletData.paymentWalletCurrency}</div>
              </div>
            </div>
          ) : (
            <div className={styles.placeholder}>
              {t('select_payment_wallet')}
            </div>
          )}
          <svg className={styles.chevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      }

      <SelectionViewer
        id={walletSelectId}
        isOpen={walletSelectIsOpen}
        onClose={walletSelectController.close}
        onPaginate={callPaginate}
        titleProp={{
          text: t('select_wallet'),
          textColor: theme === 'light' ?  "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: walletSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleWalletSearch,
          background: theme === 'light' ?  "#f5f5f5" : "#272727",
          textColor: theme === 'light' ?  "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')}/>,
        }}
        noResultProp={{
          view: <NoResultsView text="No results found." buttonText="Try Again" onButtonClick={loadWallets} />,
        }}
        errorProp={{
          view: <ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={loadWallets} />,
        }}
        layoutProp={{
          gapBetweenHandleAndTitle: "16px",
          gapBetweenTitleAndSearch: "8px",
          gapBetweenSearchAndContent: "16px",
          backgroundColor:  theme === 'light' ?  "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        snapPoints={[1]}
        initialSnap={1}
        minHeight="65vh"
        maxHeight="90vh"
        closeThreshold={0.2}
        selectionState={walletSelectionState}
        zIndex={1000}
      >
        {filteredWallets.map((item) => (
          <WalletItem
            key={item.paymentWalletId}
            onClick={() => handleWalletSelect(item)}
            wallet={item}
            isSelected={item.paymentWalletId === walletData.paymentWalletId}
          />
        ))}
      </SelectionViewer>
    </div>
  );
}