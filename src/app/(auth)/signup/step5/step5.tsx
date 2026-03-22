'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step5.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useSignup, Role } from '@/lib/stacks/signup-stack';
import { useDemandState } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { BackendBuyPaymentWalletModel } from '@/models/payment-wallet-model';
import { PaymentWalletModel } from '@/models/payment-wallet-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import DialogCancel from '@/components/DialogCancel';


interface RoleItemProps {
  onClick: () => void;
  role: Role;
  selected: boolean;
}

const RoleItem = ({ onClick, role, selected }: RoleItemProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      onClick={onClick}
      className={`
        ${styles.roleCard}
        ${selected ? styles.roleCardSelected : `${styles.roleCardUnselected} ${styles[`roleCardUnselected_${theme}`]}`}
        ${styles[`roleCard_${theme}`]}
      `}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className={styles.radioCircle}>
        {selected && <div className={styles.radioDot} />}
      </div>
      <div className={styles.roleInfo}>
        <span className={styles.roleTitle}>{role.roles_identity}</span>
        <div className={styles.buyInContainer}>
          <span className={styles.buyInLabel}>{t('buy_in')}</span>
          <span className={styles.roleTier}>{role.roles_buy_in && role.roles_buy_in > 0 ? role.roles_buy_in.toLocaleString() : t('free_text')} {role.roles_buy_in ? "ADC" : ""}</span>
        </div>
      </div>
    </div>
  );
};


export default function SignUpStep5() {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { signup, signup$, __meta } = useSignup();
  const nav = useNav();
  const isTop = nav.isTop();

  const [roles, demandRoles, setRoles] = useDemandState<Role[]>([], {
    key: 'roles',
    scope: 'signup_flow',
    persist: true,
    ttl: 3600,
    deps: [lang],
  });

  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Wallet selection state
  const [walletData, setWalletData] = useState<PaymentWalletModel | null>(null);
  const [walletsModel, setWalletsModel] = useState<PaymentWalletModel[]>([]);
  const [walletSelectId, walletSelectController, walletSelectIsOpen, walletSelectionState] = useSelectionController();
  const [searchWalletQuery, setWalletQuery] = useState('');

  const [roleState, setRoleState] = useState('initial');

  useEffect(() => {
    if (!signup.fullName && __meta.isHydrated && isTop) { nav.go('step1'); }
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName, __meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    loadRoles();
  }, []);


  useEffect(() => {
    const needsAcceptance = signup.role && signup.role.roles_buy_in != null && signup.role.roles_buy_in > 0;
    setIsFormValid(!!signup.role && (!needsAcceptance || (acceptedTerms && !!walletData)));
  }, [signup.role, acceptedTerms, walletData]);

  useEffect(() => {
    if (roles.length <= 0 && roleState === 'data') setRoleState("empty");
  }, [roles]);

  const loadRoles = useCallback(() => {
    demandRoles(async ({ set, get }) => {
      const check = get().length;
      if (!check || check === 0) setRoleState("loading");
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_roles', { p_locale: lang });
        if (error) throw error;
        if (data.length > 0) {
          set(data || []);
          setRoleState("data");
        } else {
          setRoleState("empty");
        }
      } catch (err) {
        setRoleState("error");

        console.error('Failed to fetch roles:', err);
      }
    });
  }, [lang]);


  const handleRole = (role: Role) => {
    signup$.setField({ field: 'role', value: role });
    // Reset acceptance when role changes
    setAcceptedTerms(false);
  };

  const calculateConvertedAmount = useCallback((adcAmount: number): { amount: string; currency: string } => {
    if (!walletData || !adcAmount) return { amount: '0', currency: 'ADC' };
    
    // Convert ADC to wallet currency (base amount)
    const baseAmount = adcAmount / walletData.paymentWalletRate;
    
    // Calculate fee (in buy mode, fee is calculated on wallet currency amount)
    let feeValue = 0;
    
    if (walletData.paymentWalletRateType === 'RateType.PERCENT') {
      feeValue = (walletData.paymentWalletFee / 100) * baseAmount;
    } else if (walletData.paymentWalletRateType === 'RateType.FEE') {
      feeValue = walletData.paymentWalletFee;
    } else if (walletData.paymentWalletRateType === 'RateType.FUNCTION') {
      feeValue = Math.max(walletData.paymentWalletFeeFlat, (baseAmount * walletData.paymentWalletFee) / 100);
    }
    
    // Total amount including fee
    const totalAmount = baseAmount + feeValue;
    
    return {
      amount: totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      currency: walletData.paymentWalletCurrency
    };
  }, [walletData]);

  // Fetch payment wallets
  const fetchPaymentWallets = useCallback(async (): Promise<PaymentWalletModel[]> => {
    try {
      const { data, error } = await supabaseBrowser.rpc("fetch_top_up_wallets", {
        p_limit_by: 100,
        p_after_wallets: new PaginateModel().toJson(),
      });

      if (error) {
        console.error("[PaymentWalletModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendBuyPaymentWalletModel) =>
        new PaymentWalletModel('PaymentType.buy', row)
      );
    } catch (err) {
      console.error("[PaymentWalletModel] error:", err);
      return [];
    }
  }, []);

  const loadWallets = useCallback(async () => {
    walletSelectController.setSelectionState("loading");
    const wallets = await fetchPaymentWallets();

    if (!wallets) {
      walletSelectController.setSelectionState("error");
      return;
    }

    if (wallets.length > 0) {
      setWalletsModel(wallets);
      walletSelectController.setSelectionState("data");
    } else {
      walletSelectController.setSelectionState("empty");
    }
  }, [fetchPaymentWallets, walletSelectController]);

  const openWalletSelector = useCallback(() => {
    walletSelectController.toggle();
    if (walletsModel.length === 0) {
      loadWallets();
    }
  }, [walletSelectController, walletsModel.length, loadWallets]);

  const handleWalletSearch = useCallback((query: string) => {
    setWalletQuery(query);
  }, []);

  const handleWalletSelect = useCallback((wallet: PaymentWalletModel) => {
    setWalletData(wallet);
    walletSelectController.close();
  }, [walletSelectController]);

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Filtered wallets
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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    signup$.setStep(6);
    nav.push('step6');
    setContinueLoading(false);
  };



  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
              aria-label="Go back"
              disabled={continueLoading}
            >
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}

          <h1 className={styles.title}>{t('sign_up')}</h1>

          <Link className={styles.logoContainer} href="/">
            <Image
              className={styles.logo}
              src="/assets/image/academix-logo.png"
              alt="Academix Logo"
              width={40}
              height={40}
              priority
            />
          </Link>
        </div>
      </header>

      <div className={styles.innerBody}>
        <CachedLottie
          id="signup-step5"
          src="/assets/lottie/sign_up_step_5_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 5, total: 7 })}</p>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>
              {t('choose_role')}
            </label>
            <div className={styles.roleState}>
              {roleState === 'loading' && roles.length <= 0 && (<LoadingView text={t('loading')} />)}
              {roleState === 'empty' && roles.length <= 0 && (<NoResultsView text="No results found." buttonText="Try Again" onButtonClick={loadRoles} />)}
              {roleState === 'error' && roles.length <= 0 && (<ErrorView text="Error occurred." buttonText="Try Again" onButtonClick={loadRoles} />)}
            </div>
            {roles.length > 0 && (
              <div className={styles.rolesGrid}>
                {[...roles].reverse().map((role) => (
                  <RoleItem
                    key={role.roles_id}
                    onClick={() => handleRole(role)}
                    role={role}
                    selected={signup.role?.roles_id === role.roles_id}
                  />
                ))}
              </div>
            )}

            {signup.role && signup.role.roles_buy_in != null && signup.role.roles_buy_in > 0 && (
              <>
                {/* Wallet Selection */}
                <div className={styles.walletSelectionCard}>
                  <label className={styles.walletLabel}>{t('select_payment_wallet')}</label>
                  <div
                    className={`${styles.walletButton} ${styles[`walletButton_${theme}`]}`}
                    onClick={openWalletSelector}
                  >
                    {walletData ? (
                      <div className={styles.selectedWallet}>
                        <div className={styles.walletImage}>
                          {walletData.paymentWalletImage ? (
                            <img src={walletData.paymentWalletImage} alt={walletData.paymentWalletIdentity} />
                          ) : (
                            <div className={styles.walletInitials}>
                              {getInitials(walletData.paymentWalletIdentity)}
                            </div>
                          )}
                        </div>
                        <div className={styles.walletInfo}>
                          <div className={styles.walletName}>{walletData.paymentWalletIdentity}</div>
                          <div className={styles.walletCurrency}>{walletData.paymentWalletCurrency}</div>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.walletPlaceholder}>
                        {t('select_payment_wallet')}
                      </div>
                    )}
                    <div className={styles.walletArrow}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Acceptance Notice */}
                {walletData && (
                  <div className={styles.acceptanceSection}>
                    <label className={`${styles.checkboxLabel} ${styles[`checkboxLabel_${theme}`]}`}>
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <div className={styles.checkboxCustom}>
                        {acceptedTerms && (
                          <svg className={styles.checkIcon} viewBox="0 0 16 16" fill="none">
                            <path
                              d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                              fill="currentColor"
                            />
                          </svg>
                        )}
                      </div>
                      <span className={styles.checkboxText}>
                        {tNode('role_acceptance_notice', {
                          amount: (() => {
                            const converted = calculateConvertedAmount(signup.role.roles_buy_in || 0);
                            return `${converted.amount} ${converted.currency}`;
                          })()
                        })}
                      </span>
                    </label>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="submit"
            className={styles.continueButton}
            disabled={!isFormValid || continueLoading}
            aria-disabled={!isFormValid || continueLoading}
            onClick={handleSubmit}
          >
            {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </div>
      </div>

      {/* Wallet Selection Modal */}
      <SelectionViewer
        id={walletSelectId}
        isOpen={walletSelectIsOpen}
        onClose={walletSelectController.close}
        titleProp={{
          text: t('select_wallet'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: walletSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleWalletSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
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
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        snapPoints={[0, 1]}
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

    </main>
  );
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
      className={`${styles.walletItem} ${styles[`walletItem_${theme}`]} ${isSelected ? styles.walletItemSelected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className={styles.walletItemImage}>
        {wallet.paymentWalletImage ? (
          <img src={wallet.paymentWalletImage} alt={wallet.paymentWalletIdentity} />
        ) : (
          <div className={styles.walletItemInitials}>{getInitials(wallet.paymentWalletIdentity)}</div>
        )}
      </div>
      <div className={styles.walletItemInfo}>
        <div className={styles.walletItemName}>{wallet.paymentWalletIdentity}</div>
        <div className={styles.walletItemCurrency}>{wallet.paymentWalletCurrency}</div>
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
}