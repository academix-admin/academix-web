'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './payment-method.module.css';
import { useNav } from "@/lib/NavigationStack";
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendPaymentMethodModel } from '@/models/payment-method-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';

interface PaymentMethodProps {
  profileType: string;
  walletId: string;
  onMethodSelect: (method: PaymentMethodModel) => void;
  paymentMethodId?: string | null;
  modify?: boolean;
}

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

export default function PaymentMethod({ profileType, walletId, onMethodSelect, paymentMethodId, modify = true }: PaymentMethodProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [methodData, setMethodData] = useState<PaymentMethodModel | null>(null);
  const [userMethodState, setUserMethodState] = useState<'initial' | 'loading' | 'data' | 'error'>('initial');

  const [methodSelectId, methodSelectController, methodSelectIsOpen, methodSelectionState] = useSelectionController();
  const [searchMethodQuery, setMethodQuery] = useState('');

  const [methodsModel, demandPaymentMethodModel, setPaymentMethodModel, { isHydrated }] = usePaymentMethodModel(lang);

  useEffect(() => {
    if(!methodData)return;
     onMethodSelect(methodData);
  }, [methodData]);

  useEffect(() => {
    if(!isHydrated)return;
    const getMethod = methodsModel.find((e) => e.paymentMethodId === paymentMethodId);

    if (getMethod) {
      setMethodData(getMethod);
    }

  }, [methodsModel, paymentMethodId ,isHydrated]);

   useEffect(() => {
      if (methodsModel.length <= 0)setMethodData(null);
   }, [methodsModel]);

  const fetchPaymentMethodModel = useCallback(async (
    userData: UserData,
    limitBy: number,
    paginateModel: PaginateModel
  ): Promise<PaymentMethodModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc(profileType === 'ProfileType.buy' ? "fetch_top_up_methods" : "fetch_withdraw_methods", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_wallet_id: walletId,
        p_after_methods: paginateModel.toJson(),
      });

      if (error) {
        console.error("[PaymentMethodModel] error:", error);
        return [];
      }
         
      return (data || []).map((row: BackendPaymentMethodModel) => new PaymentMethodModel(row));
    } catch (err) {
      console.error("[PaymentMethodModel] error:", err);
      return [];
    }
  }, [lang, walletId]);

  const extractLatest = useCallback((userPaymentMethodModel: PaymentMethodModel[]) => {
    if (userPaymentMethodModel.length > 0) {
      const lastItem = userPaymentMethodModel[userPaymentMethodModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  }, []);

  const processPaymentMethodModelPaginate = useCallback((userPaymentMethodModel: PaymentMethodModel[]) => {
    const oldPaymentMethodModelIds = methodsModel.map((e) => e.paymentMethodId);
    const newPaymentMethodModel = [...methodsModel];

    for (const method of userPaymentMethodModel) {
      if (!oldPaymentMethodModelIds.includes(method.paymentMethodId)) {
        newPaymentMethodModel.push(method);
      }
    }

    setPaymentMethodModel(newPaymentMethodModel);
  }, [methodsModel, setPaymentMethodModel]);

  const callPaginate = useCallback(async (): Promise<boolean> => {
    if (!userData || methodsModel.length <= 0) return false;

    const methods = await fetchPaymentMethodModel(userData, 20, paginateModel);
    if (methods.length > 0) {
      extractLatest(methods);
      processPaymentMethodModelPaginate(methods);
      return true;
    }
    return false;
  }, [userData, methodsModel, paginateModel, fetchPaymentMethodModel, extractLatest, processPaymentMethodModelPaginate]);

  const refreshData = useCallback(async () => {
    if (!userData || methodsModel.length > 0) return;

    const methods = await fetchPaymentMethodModel(userData, 100, paginateModel);
    if (methods.length > 0) {
      extractLatest(methods);
      setPaymentMethodModel(methods);
    }
  }, [userData, methodsModel, paginateModel, fetchPaymentMethodModel, extractLatest, setPaymentMethodModel]);

  const loadMethods = useCallback(() => {
      if(!userData) return;
    demandPaymentMethodModel(async ({ get, set }) => {
      methodSelectController.setSelectionState("loading");
      const methods = await fetchPaymentMethodModel(userData!, 100, new PaginateModel());

      if (!methods) {
        methodSelectController.setSelectionState("error");
        return;
      }

      extractLatest(methods);
      if (methods.length > 0) {
        set(methods);
        methodSelectController.setSelectionState("data");
      } else {
        methodSelectController.setSelectionState("empty");
      }
    });
  }, [demandPaymentMethodModel, fetchPaymentMethodModel, userData, extractLatest, methodSelectController]);

  const openMethod = useCallback(() => {
    if (!userData || !modify) return;
    methodSelectController.toggle();
    loadMethods();
  }, [userData, methodSelectController, loadMethods]);

  const handleMethodSearch = useCallback((query: string) => {
    setMethodQuery(query);
  }, []);

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
  }, [methodsModel, searchMethodQuery]);

  const handleMethodSelect = useCallback((method: PaymentMethodModel) => {
    setMethodData(method);
    methodSelectController.close();
  }, [methodSelectController]);

  const getInitials = useCallback((text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, []);

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('payment_method_text')}
      </h2>

      <div className={styles.formGroup}>
        <button onClick={openMethod} className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`}>
          {methodData ? (
            <div className={styles.selectedMethod}>
              <div className={styles.methodImage}>
                {methodData.paymentMethodImage ? (
                  <img src={methodData.paymentMethodImage} alt={methodData.paymentMethodIdentity} />
                ) : (
                  <div className={styles.methodInitials}>{getInitials(methodData.paymentMethodIdentity)}</div>
                )}
              </div>
              <div className={`${styles.methodInfo} ${styles[`methodInfo_${theme}`]}`}>
                <div className={styles.methodName}>{methodData.paymentMethodIdentity}</div>
                <div className={styles.methodCountry}>{methodData.countryIdentity}</div>
              </div>
            </div>
          ) : (
            <div className={styles.placeholder}>
              {t('select_payment_method')}
            </div>
          )}
          <svg className={styles.chevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <SelectionViewer
        id={methodSelectId}
        isOpen={methodSelectIsOpen}
        onClose={methodSelectController.close}
        onPaginate={callPaginate}
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
          view: <NoResultsView text={t('no_results')} buttonText={t('try_again')} onButtonClick={loadMethods} />,
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
    </div>
  );
}