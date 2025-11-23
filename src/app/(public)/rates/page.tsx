'use client';

import { use, useEffect, useState, useMemo, useLayoutEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider'
import { supabaseBrowser } from '@/lib/supabase/client';
import { BackendBuyPaymentWalletModel } from '@/models/payment-wallet-model';
import { BackendSellPaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { BackendPaymentMethodModel } from '@/models/payment-method-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';

interface Config {
  showHeader: boolean;
  showTitle: boolean;
  showDescription: boolean;
  backgroundColor: Record<string, string> | null;
}

const iosConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: { 'light': '#fff', 'dark': '#212121' }
};

const androidConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: { 'light': '#fff', 'dark': '#232323' }
};

const landingConfig: Config = {
  showHeader: false,
  showTitle: true,
  showDescription: true,
  backgroundColor: null
};

const paymentConfig: Config = {
  showHeader: false,
  showTitle: false,
  showDescription: false,
  backgroundColor: null
};

const defaultConfig: Config = {
  showHeader: true,
  showTitle: false,
  showDescription: false,
  backgroundColor: null
};

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = {
    'ios': iosConfig,
    'android': androidConfig,
    'payment': paymentConfig,
    'landing': landingConfig
  };
  return configMap[req || ''] || defaultConfig;
};

type StringOrNull = string | null;

interface Params {
  col: StringOrNull;
  lan: StringOrNull;
  req: StringOrNull;
  to: StringOrNull;
  type: StringOrNull;
  [key: string]: string | null;
}

const useAppParams = <T extends Record<string, StringOrNull> = Params>(
  fallbackParams?: Partial<T>
): T => {
  const searchParams = useSearchParams();

  const params: Record<string, StringOrNull> = {};

  if (fallbackParams) {
    for (const key in fallbackParams) {
      const value = fallbackParams[key];
      params[key] = value ?? null;
    }
  }

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (fallbackParams) {
    for (const key of Object.keys(fallbackParams)) {
      if (!(key in params)) params[key] = null;
    }
  }

  return params as T;
};

interface RatesPageProps {
  searchParams: Promise<Partial<Params>>;
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

interface MethodItemProps {
  onClick: () => void;
  method: PaymentMethodModel;
  isSelected?: boolean;
}

const MethodItem = ({ onClick, method, isSelected }: MethodItemProps) => {
  const { theme } = useTheme();
  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div
      className={`${styles.methodItem} ${styles[`methodItem_${theme}`]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      aria-label={`Select ${method.paymentMethodIdentity}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.methodItemImage}>
        {method.paymentMethodImage ? (
          <img src={method.paymentMethodImage} alt={method.paymentMethodIdentity} />
        ) : (
          <div className={styles.methodInitials}>{getInitials(method.paymentMethodIdentity)}</div>
        )}
      </div>
      <div className={styles.methodItemInfo}>
        <div className={styles.methodItemName}>{method.paymentMethodIdentity}</div>
        <div className={styles.methodItemCountry}>{method.countryIdentity}</div>
        {method.paymentMethodNetwork && method.paymentMethodNetwork.length > 0 && (
          <div className={styles.methodNetworks}>
            {method.paymentMethodNetwork.map((network, index) => (
              network.active && (
                <span key={index} className={styles.networkTag}>
                  {network.identity}
                </span>
              )
            ))}
          </div>
        )}
      </div>
      {isSelected && (
        <div className={styles.methodItemCheckmark}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default function Rates({ searchParams }: RatesPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req, to } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { initialized } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [calledFind, setCalledFind] = useState(false);
  const [activeSection, setActiveSection] = useState('academix-ratio');

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;

  // Tab state for switching between buy/top-up and sell/withdraw
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const isBuyMode = activeTab === 'buy';

  // State for conversion
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [walletAmount, setWalletAmount] = useState('');
  const [academixAmount, setAcademixAmount] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const walletInputRef = useRef<HTMLInputElement>(null);
  const academixInputRef = useRef<HTMLInputElement>(null);

  // Wallet state
  const [walletPaginateModel, setWalletPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [walletData, setWalletData] = useState<PaymentWalletModel | null>(null);
  const [walletsModel, setWalletsModel] = useState<PaymentWalletModel[]>([]);

  const [walletSelectId, walletSelectController, walletSelectIsOpen, walletSelectionState] = useSelectionController();
  const [searchWalletQuery, setWalletQuery] = useState('');

  // Method state
  const [methodPaginateModel, setMethodPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [methodData, setMethodData] = useState<PaymentMethodModel | null>(null);
  const [methodsModel, setMethodsModel] = useState<PaymentMethodModel[]>([]);

  const [methodSelectId, methodSelectController, methodSelectIsOpen, methodSelectionState] = useSelectionController();
  const [searchMethodQuery, setMethodQuery] = useState('');

  // Academix wallet (fixed for conversion)
  const academixPaymentWallet = new PaymentWalletModel(
    isBuyMode ? 'PaymentType.buy' : 'PaymentType.sell',
    {
      payment_wallet_id: "academix-coin",
      sort_created_id: "",
      payment_wallet_buy_min: 0,
      payment_wallet_buy_rate: 1,
      payment_wallet_currency: "ADC",
      payment_wallet_identity: "Academix Coin",
      payment_wallet_buy_rate_type: "fixed",
      payment_wallet_buy_fee: 0,
      payment_wallet_image: "",
    }
  );

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor && config.backgroundColor[resolvedTheme]) {
      return {
        background: config.backgroundColor[resolvedTheme],
        color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
      } as React.CSSProperties;
    }
    return {};
  };

  const getContainerClass = () => {
    const baseClass = styles.container;
    if (config.backgroundColor) {
      return `${baseClass} ${styles[`container_${req}`]}`;
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]} ${styles[`container_${req}`]}`;
  };

  const goBack = () => {
    if (initialized) {
      router.replace('/main');
      return;
    }
    if (window.history.length <= 1) {
      router.replace('/main');
    } else {
      router.back();
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  useLayoutEffect(() => {
    if (calledFind) return;

    const targetSection = to || window.location.hash.replace('#', '');

    if (targetSection) {
      setCalledFind(true);
      setActiveSection(targetSection);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = document.getElementById(targetSection);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });
    }
  }, [to, calledFind]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'buy' | 'sell') => {
    setActiveTab(tab);
    // Reset all state when switching tabs
    const oldWallet = walletData;
    setWalletData(null);
    setWalletData(oldWallet);
    setMethodData(null);
    setWalletAmount('');
    setAcademixAmount('');
    setPaymentAmount(0);
    setWalletsModel([]);
    setMethodsModel([]);
  }, []);

  // Fetch payment wallets
  const fetchPaymentWallets = useCallback(async (
    limitBy: number,
    paginateModel: PaginateModel
  ): Promise<PaymentWalletModel[]> => {
    try {
      const { data, error } = await supabaseBrowser.rpc(
        isBuyMode ? "fetch_top_up_wallets" : "fetch_withdraw_wallets",
        {
          p_limit_by: limitBy,
          p_after_wallets: paginateModel.toJson(),
        }
      );

      if (error) {
        console.error("[PaymentWalletModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendBuyPaymentWalletModel | BackendSellPaymentWalletModel) =>
        new PaymentWalletModel(isBuyMode ? 'PaymentType.buy' : 'PaymentType.sell', row)
      );
    } catch (err) {
      console.error("[PaymentWalletModel] error:", err);
      return [];
    }
  }, [isBuyMode, resolvedLang]);

  const extractLatestWallets = useCallback((wallets: PaymentWalletModel[]) => {
    if (wallets.length > 0) {
      const lastItem = wallets[wallets.length - 1];
      setWalletPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  }, []);

  const processWalletsPaginate = useCallback((newWallets: PaymentWalletModel[]) => {
    const oldWalletIds = walletsModel.map((e) => e.paymentWalletId);
    const updatedWallets = [...walletsModel];

    for (const wallet of newWallets) {
      if (!oldWalletIds.includes(wallet.paymentWalletId)) {
        updatedWallets.push(wallet);
      }
    }

    setWalletsModel(updatedWallets);
  }, [walletsModel]);

  const loadMoreWallets = useCallback(async (): Promise<boolean> => {
    if (walletsModel.length <= 0) return false;

    const wallets = await fetchPaymentWallets(20, walletPaginateModel);
    if (wallets.length > 0) {
      extractLatestWallets(wallets);
      processWalletsPaginate(wallets);
      return true;
    }
    return false;
  }, [walletsModel, walletPaginateModel, fetchPaymentWallets, extractLatestWallets, processWalletsPaginate]);

  const refreshWallets = useCallback(async () => {
    if (walletsModel.length > 0) return;

    const wallets = await fetchPaymentWallets(100, new PaginateModel());
    if (wallets.length > 0) {
      extractLatestWallets(wallets);
      setWalletsModel(wallets);
    }
  }, [walletsModel, fetchPaymentWallets, extractLatestWallets]);

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async (
    limitBy: number,
    paginateModel: PaginateModel
  ): Promise<PaymentMethodModel[]> => {

    try {
      const { data, error } = await supabaseBrowser.rpc(
        isBuyMode ? "fetch_top_up_methods" : "fetch_withdraw_methods",
        {
          p_locale: resolvedLang,
          p_limit_by: limitBy,
          p_wallet_id: walletData?.paymentWalletId || '',
          p_after_methods: paginateModel.toJson(),
        }
      );

      if (error) {
        console.error("[PaymentMethodModel] error:", error);
        return [];
      }

      return (data || []).map((row: BackendPaymentMethodModel) => new PaymentMethodModel(row));
    } catch (err) {
      console.error("[PaymentMethodModel] error:", err);
      return [];
    }
  }, [isBuyMode, resolvedLang, walletData?.paymentWalletId]);

  const extractLatestMethods = useCallback((methods: PaymentMethodModel[]) => {
    if (methods.length > 0) {
      const lastItem = methods[methods.length - 1];
      setMethodPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  }, []);

  const processMethodsPaginate = useCallback((newMethods: PaymentMethodModel[]) => {
    const oldMethodIds = methodsModel.map((e) => e.paymentMethodId);
    const updatedMethods = [...methodsModel];

    for (const method of newMethods) {
      if (!oldMethodIds.includes(method.paymentMethodId)) {
        updatedMethods.push(method);
      }
    }

    setMethodsModel(updatedMethods);
  }, [methodsModel]);

  const loadMoreMethods = useCallback(async (): Promise<boolean> => {
    if (methodsModel.length <= 0) return false;

    const methods = await fetchPaymentMethods(20, methodPaginateModel);
    if (methods.length > 0) {
      extractLatestMethods(methods);
      processMethodsPaginate(methods);
      return true;
    }
    return false;
  }, [methodsModel, methodPaginateModel, fetchPaymentMethods, extractLatestMethods, processMethodsPaginate]);

  const refreshMethods = useCallback(async () => {
    if (!walletData?.paymentWalletId) return;

    const methods = await fetchPaymentMethods(100, new PaginateModel());
    if (methods.length > 0) {
      extractLatestMethods(methods);
      setMethodsModel(methods);
    } else {
      setMethodsModel([]);
    }
  }, [walletData?.paymentWalletId, fetchPaymentMethods, extractLatestMethods]);

  // Wallet selection handlers
  const openWalletSelector = useCallback(() => {
    walletSelectController.toggle();
    if (walletsModel.length === 0) {
      loadWallets();
    }
  }, [walletSelectController, walletsModel.length]);

  const loadWallets = useCallback(async () => {
    walletSelectController.setSelectionState("loading");
    const wallets = await fetchPaymentWallets(100, new PaginateModel());

    if (!wallets) {
      walletSelectController.setSelectionState("error");
      return;
    }

    extractLatestWallets(wallets);
    if (wallets.length > 0) {
      setWalletsModel(wallets);
      walletSelectController.setSelectionState("data");
    } else {
      walletSelectController.setSelectionState("empty");
    }
  }, [fetchPaymentWallets, extractLatestWallets, walletSelectController]);

  const handleWalletSearch = useCallback((query: string) => {
    setWalletQuery(query);
  }, []);

  const handleWalletSelect = useCallback((wallet: PaymentWalletModel) => {
    setWalletData(wallet);
    setWalletAmount('');
    setAcademixAmount('');
    setPaymentAmount(0);
    setMethodData(null);
    setMethodsModel([]);
    walletSelectController.close();
  }, [walletSelectController]);

  // Method selection handlers
  const openMethodSelector = useCallback(() => {
    if (!walletData) return;
    methodSelectController.toggle();
    if (methodsModel.length === 0) {
      loadMethods();
    }
  }, [methodSelectController, walletData, methodsModel.length]);

  const loadMethods = useCallback(async () => {
    if (!walletData) return;

    methodSelectController.setSelectionState("loading");
    const methods = await fetchPaymentMethods(100, new PaginateModel());

    if (!methods) {
      methodSelectController.setSelectionState("error");
      return;
    }

    extractLatestMethods(methods);
    if (methods.length > 0) {
      setMethodsModel(methods);
      methodSelectController.setSelectionState("data");
    } else {
      methodSelectController.setSelectionState("empty");
    }
  }, [walletData, fetchPaymentMethods, extractLatestMethods, methodSelectController]);

  const handleMethodSearch = useCallback((query: string) => {
    setMethodQuery(query);
  }, []);

  const handleMethodSelect = useCallback((method: PaymentMethodModel) => {
    setMethodData(method);
    methodSelectController.close();
  }, [methodSelectController]);

  // Conversion logic
  const handleWalletAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setWalletAmount(value);
      if (walletData?.paymentWalletRate) {
        const numValue = parseFloat(value) || 0;
        setPaymentAmount(numValue);
        setAcademixAmount(parseFloat((numValue * walletData.paymentWalletRate).toFixed(2)).toString());
      }
    }
  }, [ walletData?.paymentWalletRate]);

  const handleAcademixAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAcademixAmount(value);
      if (walletData?.paymentWalletRate) {
        const numValue = parseFloat(value) || 0;
        setPaymentAmount(numValue);
        if(numValue > 0)setWalletAmount((numValue / walletData.paymentWalletRate).toString());
        if (numValue <= 0) setWalletAmount('');
      }
    }
  }, [walletData?.paymentWalletRate]);

  const switchPaymentMode = useCallback(() => {
    // flip conversion input
    setFlipped(prev=> !prev);
  }, []);

  const calculateFee = useCallback((value: number) => {
    if (!walletData) return '0';

    let feeValue = 0;
    if (walletData.paymentWalletRateType === 'RateType.PERCENT') {
      feeValue = (walletData.paymentWalletFee / 100) * value;
    } else if (walletData.paymentWalletRateType === 'RateType.FEE') {
      feeValue = walletData.paymentWalletFee;
    }

    // For sell operations, convert fee to Academix coins
    if (!isBuyMode) {
      feeValue = feeValue * walletData.paymentWalletRate;
    }

    return parseFloat(feeValue.toFixed(2)).toString();
  }, [walletData, isBuyMode]);

  const calculateTotal = useCallback((value: number) => {
    if (!walletData) return '0';

    const fee = parseFloat(calculateFee(value));
    return parseFloat((value + fee).toFixed(2)).toString();
  }, [walletData, isBuyMode, calculateFee]);

  // Filtered data
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
  }, [walletsModel, searchWalletQuery, walletSelectController]);

  const filteredMethods = useMemo(() => {
    if (!searchMethodQuery) return methodsModel;

    const filters = methodsModel.filter(item =>
      item.paymentMethodIdentity.toLowerCase().includes(searchMethodQuery.toLowerCase()) ||
      item.countryIdentity?.toLowerCase().includes(searchMethodQuery.toLowerCase())
    );

    if (filters.length <= 0 && methodsModel.length > 0) {
      methodSelectController.setSelectionState("empty");
    }

    return filters;
  }, [methodsModel, searchMethodQuery, methodSelectController]);

  // Load initial wallets when tab changes
  useEffect(() => {
    if (walletsModel.length === 0) {
      refreshWallets();
    }
  }, [walletsModel.length, refreshWallets, activeTab]);

  // Load methods when wallet changes
  useEffect(() => {
    if (walletData) {
      refreshMethods();
    }
  }, [walletData, refreshMethods]);

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <main
      className={getContainerClass()}
      style={getBackgroundStyle()}
    >
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {(canGoBack || initialized) && (
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
            )}

            <h1 className={styles.title}>
              {t('rates_text')}
            </h1>

            {!initialized && <Link className={styles.logoContainer} href="/">
              <Image
                className={styles.logo}
                src="/assets/image/academix-logo.png"
                alt="Academix Logo"
                width={40}
                height={40}
                priority
              />
            </Link>}
          </div>
        </header>
      )}

      {config.showTitle && (<h1 className={`${styles.bigTitle} ${styles[`bigTitle_${resolvedTheme}`]}`}>{t('academix_rates')}</h1>)}
      {config.showDescription && (<h4 className={`${styles.description} ${styles[`description_${resolvedTheme}`]}`}>
        {t('rates_description')}
      </h4>)}

      <div className={`${styles.innerBody} ${styles[`innerBody_${req}`]}`}>
        {/* Tab Switcher */}
        <div className={`${styles.tabSwitcher} ${styles[`tabSwitcher_${resolvedTheme}`]}`}>
          <button
            className={`${styles.tabButton} ${activeTab === 'buy' ? styles.tabButtonActive : ''}`}
            onClick={() => handleTabChange('buy')}
          >
            {t('top_up_text')}
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'sell' ? styles.tabButtonActive : ''}`}
            onClick={() => handleTabChange('sell')}
          >
            {t('withdraw_text')}
          </button>
        </div>

        {/* Conversion Section */}
        <div className={`${styles.conversionSection} ${styles[`conversionSection_${resolvedTheme}`]}`}>
          {/* Wallet Selection */}
          <div className={styles.selectionCard}>
            <label className={styles.selectionLabel}>{t('payment_wallet_text')}</label>
            <div
              className={`${styles.selectionButton} ${styles[`selectionButton_${resolvedTheme}`]}`}
              onClick={openWalletSelector}
            >
              {walletData ? (
                <div className={styles.selectedItem}>
                  <div className={styles.selectedItemImage}>
                    {walletData.paymentWalletImage ? (
                      <img src={walletData.paymentWalletImage} alt={walletData.paymentWalletIdentity} />
                    ) : (
                      <div className={styles.selectedItemInitials}>
                        {getInitials(walletData.paymentWalletIdentity)}
                      </div>
                    )}
                  </div>
                  <div className={styles.selectedItemInfo}>
                    <div className={styles.selectedItemName}>{walletData.paymentWalletIdentity}</div>
                    <div className={styles.selectedItemCurrency}>{walletData.paymentWalletCurrency}</div>
                  </div>
                </div>
              ) : (
                <div className={styles.placeholderText}>
                  {t('select_payment_wallet')}
                </div>
              )}
              <div className={styles.dropdownArrow}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Conversion Inputs */}
          {walletData && (
            <div className={styles.conversionCard}>


              <div  className={`${styles.conversionInputs} ${flipped ? styles.conversionInputsFlipped : ''}`}>
                <div className={styles.inputGroup}>
                  <div className={`${styles.conversionHeader} ${flipped ? styles.conversionRightHeader : styles.conversionLeftHeader}`}>
                      <span>{isBuyMode ? t('you_pay') : t('you_receive')}</span>
                  </div>
                  <div className={styles.inputWrapper}>

                    <input
                      ref={walletInputRef}
                      type="text"
                      value={walletAmount}
                      onChange={handleWalletAmountChange}
                      placeholder="0.00"
                      className={`${styles.amountInput} ${styles[`amountInput_${resolvedTheme}`]}`}
                    />
                    <div className={styles.currencyLabel}>{walletData.paymentWalletCurrency}</div>
                  </div>
                </div>

                <div className={styles.swapButton} onClick={switchPaymentMode}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
                  </svg>
                </div>

                <div className={styles.inputGroup}>
                  <div className={`${styles.conversionHeader} ${ flipped ? styles.conversionLeftHeader : styles.conversionRightHeader}`}>
                      <span>{isBuyMode ? t('you_receive') : t('you_pay')}</span>
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      ref={academixInputRef}
                      type="text"
                      value={academixAmount}
                      onChange={handleAcademixAmountChange}
                      placeholder="0.00"
                      className={`${styles.amountInput} ${styles[`amountInput_${resolvedTheme}`]}`}
                    />
                    <div className={styles.currencyLabel}>ADC</div>
                  </div>
                </div>
              </div>

              {/* Rate Display */}
              <div className={styles.rateInfo}>
                <span className={styles.rateText}>
                  1 {walletData.paymentWalletCurrency} = {walletData.paymentWalletRate} ADC
                </span>
              </div>

              {/* Fee and Total */}
              {(parseFloat(walletAmount) > 0 || parseFloat(academixAmount) > 0) && (
                <div className={styles.feeBreakdown}>
                  <div className={styles.feeRow}>
                    <span>{t('min_text')}:</span>
                    <span>{walletData.paymentWalletMin} {walletData.paymentWalletCurrency}</span>
                  </div>
                  <div className={styles.feeRow}>
                    <span>{t('fee_text')}:</span>
                    <span>{calculateFee(parseFloat(walletAmount) || 0)} {isBuyMode ? walletData.paymentWalletCurrency : 'ADC'}</span>
                  </div>
                  <div className={styles.feeRow}>
                    <span>{t('charged_text')}:</span>
                    <span>{calculateTotal(parseFloat(isBuyMode ? walletAmount : academixAmount) || 0)} {isBuyMode ? walletData.paymentWalletCurrency : 'ADC'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selection */}
          {walletData && (
            <div className={styles.selectionCard}>
              <label className={styles.selectionLabel}>
                {t('payment_method_text')}
              </label>
              <div
                className={`${styles.selectionButton} ${styles[`selectionButton_${resolvedTheme}`]} ${!walletData ? styles.disabled : ''}`}
                onClick={openMethodSelector}
              >
                {methodData ? (
                  <div className={styles.selectedItem}>
                    <div className={styles.selectedItemImage}>
                      {methodData.paymentMethodImage ? (
                        <img src={methodData.paymentMethodImage} alt={methodData.paymentMethodIdentity} />
                      ) : (
                        <div className={styles.selectedItemInitials}>
                          {getInitials(methodData.paymentMethodIdentity)}
                        </div>
                      )}
                    </div>
                    <div className={styles.selectedItemInfo}>
                      <div className={styles.selectedItemName}>{methodData.paymentMethodIdentity}</div>
                      <div className={styles.selectedItemCountry}>{methodData.countryIdentity}</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.placeholderText}>
                    {methodsModel.length > 0
                      ? t('select_payment_method')
                      : t('no_methods_available')
                    }
                  </div>
                )}
                {methodsModel.length > 0 && (
                  <div className={styles.dropdownArrow}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


     {/* Wallet Selection Modal */}
      <SelectionViewer
        id={walletSelectId}
        isOpen={walletSelectIsOpen}
        onClose={walletSelectController.close}
        onPaginate={loadMoreWallets}
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
            isSelected={item.paymentWalletId === walletData?.paymentWalletId}
          />
        ))}
      </SelectionViewer>

      {/* Method Selection Modal */}
      <SelectionViewer
        id={methodSelectId}
        isOpen={methodSelectIsOpen}
        onClose={methodSelectController.close}
        onPaginate={loadMoreMethods}
        titleProp={{
          text: t('select_payment_method'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: methodSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleMethodSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
        }}
        noResultProp={{
          view: <NoResultsView text={t('no_methods_found')} buttonText={t('try_again')} onButtonClick={loadMethods} />,
        }}
        errorProp={{
          view: <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={loadMethods} />,
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
        selectionState={methodSelectionState}
        zIndex={1000}
      >
        {filteredMethods.map((item) => (
          <MethodItem
            key={item.paymentMethodId}
            onClick={() => handleMethodSelect(item)}
            method={item}
            isSelected={methodData?.paymentMethodId === item.paymentMethodId}
          />
        ))}
      </SelectionViewer>

    </main>
  );
}