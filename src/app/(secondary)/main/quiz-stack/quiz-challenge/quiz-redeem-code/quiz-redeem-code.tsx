'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './quiz-redeem-code.module.css';
import { useNav } from "@/lib/NavigationStack";
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails, fetchUserData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendPaymentMethodModel } from '@/models/payment-method-model';
import { PaymentMethodModel } from '@/models/payment-method-model';
import { RedeemCodeModel } from '@/models/redeem-code-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';

interface PaymentMethodProps {
  onMethodSelect: (method: PaymentMethodModel) => void;
}

const RedeemCodeView = ({
  onRemoveClick,
  onContinueClick,
  continueLoading
}: {
      onRemoveClick: () => void;
      onContinueClick: () => void;
      continueLoading: boolean;
}) => {
  const { t, tNode, lang } = useLanguage();
  const { theme } = useTheme();
  const { userData } = useUserData();

  const [isFormValid, setIsFormValid] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [codeText, setCodeText] = useState('');
  const [error, setError] = useState('');

  const onSearchClick = async () => {
       if (!userData) {
           console.warn("User data not available");
           return;
         }
    try {
       setCollecting(true);

     const paramatical = await getParamatical(
       userData.usersId,
       lang,
       userData.usersSex,
       userData.usersDob
     );

     if (!paramatical) {
       setCollecting(false);
       console.error("Failed to get code data");
       return;
     }

     const feature = await checkFeatures(
            'Features.code_search',
            lang,
                    paramatical.country,
                    userData.usersSex,
                    userData.usersDob
          );

          if (!feature) {
            console.log('feature not available');
            setError(t('feature_unavailable'));
                   setCollecting(false);

            return;
          }


      const { data: rpcResult, error } = await supabaseBrowser.rpc('get_code_data', {
                                                                                              p_user_id: paramatical.usersId,
                                                                                              p_locale: paramatical.locale,
                                                                                              p_country: paramatical.country,
                                                                                              p_gender: paramatical.gender,
                                                                                              p_age: paramatical.age,
                                                                                              p_redeem_code: codeText
                                                                                            });
      if (error) throw error;

      console.log(rpcResult);
      const redeemCode = new RedeemCodeModel(rpcResult.code_data);
      console.log(redeemCode);
      if (rpcResult.status === 'RedeemCode.found') {


      }
         setCollecting(false);
    } catch (err) {
      console.error(err);
      setCollecting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

     setIsFormValid(value.length > 0);
     setCodeText(value.toUpperCase());
  };

  if(collecting)return <span className={styles.spinner}></span>;

  return (
      <>
          <div className={styles.formGroup}>
                  <label htmlFor="codeText" className={styles.label}>{t('code_text_label')}</label>
                  <input
                                type="text"
                                id="redeemCode"
                                name="redeemCode"
                                value={codeText}
                                onChange={handleChange}
                                placeholder="ACADEMIX"
                                className={`${styles.input} ${styles[`input_${theme}`]}`}
                                required
                              />
                </div>

          <div className={styles.actionsRow}>
           <button
                  type="button"
                  className={styles.removeButton}
                  onClick={onRemoveClick}
                >
                  {t('remove')}
                </button>
              <button
                className={styles.searchButton}
                disabled={!isFormValid}
                aria-disabled={!isFormValid}
                onClick={onSearchClick}
              >
                    {t('get_code')}
              </button>
         </div>
     </>

  );
};

export default function QuizRedeemCode({ onMethodSelect }: PaymentMethodProps) {
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
        p_wallet_id: 'walletId',
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
  }, [lang]);

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


  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('redeem_code_text')}
      </h2>
      <h3 className={`${styles.experienceDesc} ${styles[`experienceDesc_${theme}`]}`}>
        {t('option_to_redeem_code')}
      </h3>

      <RedeemCodeView onRemoveClick={()=> console.log('s')} onContinueClick={()=> console.log('s')} continueLoading={false}  />

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