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
import { BackendRedeemCodeModel } from '@/models/redeem-code-model';
import { RedeemCodeModel } from '@/models/redeem-code-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { useRedeemCodeModel } from '@/lib/stacks/redeem-code-stack';


interface QuizRedeemCodeProps {
  onRedeemCodeSelect: (redeemCode: RedeemCodeModel | null) => void;
  onSkip: (skip: boolean) => void;
}

const RedeemCodeCard: React.FC<{ redeemCode: RedeemCodeModel, onClick?: ()=> void, display?: boolean, onEdit?: ()=> void , onDelete?: ()=> void }> = ({ redeemCode, onClick, display = false, onEdit, onDelete }) => {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();

  const handleCopy = async (code: RedeemCodeModel) => {
    try {
      await navigator.clipboard.writeText(code.redeemCodeValue);
      // You might want to add a toast notification here
      console.log('Code copied to clipboard:', code.redeemCodeValue);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const formatExpiryDate = (expiry: string | null | undefined) => {
    if (!expiry) return null;
    try {
      const date = new Date(expiry);
      return date.toLocaleDateString(lang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return expiry;
    }
  };

  const expiryText = formatExpiryDate(redeemCode.redeemCodeExpires);

  // Build rules text based on the conditions
  const buildRulesText = () => {
    const rules = [];

    if (redeemCode.redeemCodeTop) rules.push(t('top_text'));
    if (redeemCode.redeemCodeMid) rules.push(t('mid_text'));
    if (redeemCode.redeemCodeBot) rules.push(t('bot_text'));
    if (redeemCode.redeemCodeRank1) rules.push(t('first_rank'));
    if (redeemCode.redeemCodeRank2) rules.push(t('second_rank'));
    if (redeemCode.redeemCodeRank3) rules.push(t('third_rank'));

    if (rules.length === 0) return null;

    return (
      <div className={styles.rulesRow}>
        <span className={styles.rulesLabel}>{t('rules_text')}:</span>
        <span className={styles.rulesValue}>{rules.join(', ')}</span>
      </div>
    );
  };

  const rulesElement = buildRulesText();
  const hasRules = rulesElement !== null;

  return (
    <div role="button" onClick={onClick} className={`${styles.redeemCodeCard} ${display ?  styles.removeMargin : ''}`} aria-labelledby={`redeemCode-${redeemCode.redeemCodeId}`}>
      {/* Main Card Content */}
      <div className={styles.cardContent}>
        {/* Header with code and copy button */}
        <div className={styles.cardHeader}>
          <div className={styles.codeSection}>
            <h3 role="button" onClick={onEdit} id={`redeemCode-${redeemCode.redeemCodeId}`} className={styles.redeemCodeValue}>
              {redeemCode.redeemCodeValue}

              {display && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2"/>
                </svg>
              )}
            </h3>
            <button
              className={styles.copyButton}
              onClick={() => handleCopy(redeemCode)}
              aria-label={`Copy code ${redeemCode.redeemCodeValue}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="9" height="9" stroke="currentColor" strokeWidth="1.6" rx="1" />
                <rect x="4.5" y="4.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Amount section with icon */}
        <div className={styles.amountSection}>
          <div className={styles.amountContent}>
            <div className={styles.currencyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.32c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.72-2.82 0-1.47-1.09-2.49-3.93-3.16z"/>
              </svg>
            </div>
            <span className={styles.amountText}>{redeemCode.redeemCodeAmount}</span>
          </div>
          {display && (
            <div role="button" onClick={onDelete} className={styles.deleteIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red">
                <path d="M3 6h18" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2"/>
                <path d="M10 11v6" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 11v6" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        {/* Footer with rules and expiry */}
        <div className={styles.cardFooter}>
          {hasRules && rulesElement}
          {hasRules && expiryText && <div className={styles.separator} />}
          {expiryText && (
            <div className={styles.expiryRow}>
              <span className={styles.expiryText}>
                {t('expires_text', { date: expiryText })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RedeemCodeView = ({
  onRemoveClick,
  onRedeemCodeSelect
}: {
      onRemoveClick: () => void;
      onRedeemCodeSelect: (redeemCode: RedeemCodeModel | null) => void;
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
                  setError(t('error_occurred'));

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
       setError(t('error_occurred'));
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

      if (rpcResult.status === 'RedeemCode.found') {
       const redeemCode = new RedeemCodeModel(rpcResult.code_data);
         setError('');
         onRedeemCodeSelect(redeemCode);
      }else{
          setError(t('redeem_code_not_found'));
       }
      setCollecting(false);
    } catch (err) {
      console.error(err);
      setCollecting(false);
                        setError(t('error_occurred'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
     setIsFormValid(value.length > 0);
     setCodeText(value.toUpperCase());
  };

  if(collecting)return <div className={styles.loadingContainer}> <span className={styles.spinner}></span> </div>;

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

export default function QuizRedeemCode({ onRedeemCodeSelect, onSkip }: QuizRedeemCodeProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();
  const [codeView, setCodeView] = useState(false);

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [redeemCodeData, setRedeemCodeData] = useState<RedeemCodeModel | null>(null);
  const [userRedeemCodeState, setUserRedeemCodeState] = useState<'initial' | 'loading' | 'data' | 'error'>('initial');

  const [redeemCodeSelectId, redeemCodeSelectController, redeemCodeSelectIsOpen, redeemCodeSelectionState] = useSelectionController();
  const [searchRedeemCodeQuery, setRedeemCodeQuery] = useState('');

  const [redeemCodes, demandRedeemCodes, setRedeemCodes] = useRedeemCodeModel(lang);


  useEffect(() => {
     onRedeemCodeSelect(redeemCodeData);
     onSkip(!codeView);
  }, [redeemCodeData, codeView]);


  const fetchRedeemCodes = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<RedeemCodeModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("get_users_redeem_code", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_after_codes: paginateModel.toJson(),
      });

      if (error) {
        console.error("[RedeemCodes] error:", error);
        return [];
      }
      return (data || []).map((row: BackendRedeemCodeModel) => new RedeemCodeModel(row));
    } catch (err) {
      console.error("[RedeemCodes] error:", err);
      return [];
    }
  }, [lang]);

  const extractLatest = (userRedeemCodes: RedeemCodeModel[]) => {
    if (userRedeemCodes.length > 0) {
      const lastItem = userRedeemCodes[userRedeemCodes.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processRedeemCodesPaginate = (userRedeemCodes: RedeemCodeModel[]) => {
    const oldRedeemCodesIds = redeemCodes.map((e) => e.redeemCodeId);
    const newRedeemCodes = [...redeemCodes];

    for (const friend of userRedeemCodes) {
      if (!oldRedeemCodesIds.includes(friend.redeemCodeId)) {
        newRedeemCodes.push(friend);
      }
    }

    setRedeemCodes(newRedeemCodes);
  };

  const callPaginate = async (): Promise<boolean>  => {
    if (!userData || redeemCodes.length <= 0) return true;
    const redeemCodesModel = await fetchRedeemCodes(userData, 20, paginateModel);
    if (redeemCodesModel.length > 0) {
      extractLatest(redeemCodesModel);
      processRedeemCodesPaginate(redeemCodesModel);
    }
   return true
  };

  const refreshData = useCallback(async () => {
    if (!userData || redeemCodes.length > 0) return;

    const redeemCodesModel = await fetchRedeemCodes(userData, 100, paginateModel);
    if (redeemCodesModel.length > 0) {
      extractLatest(redeemCodesModel);
      setRedeemCodes(redeemCodesModel);
    }
  }, [userData, redeemCodes, paginateModel, fetchRedeemCodes, extractLatest, setRedeemCodes]);

  const loadRedeemCodes = useCallback(() => {

    demandRedeemCodes(async ({ get, set }) => {
          if (!userData || redeemCodes.length > 0) return;
                redeemCodeSelectController.setSelectionState("loading");
          const redeemCodesModel = await fetchRedeemCodes(userData, 10,  new PaginateModel());
                if (!redeemCodesModel) {
                  redeemCodeSelectController.setSelectionState("error");
                  return;
                }

                extractLatest(redeemCodesModel);
                if (redeemCodesModel.length > 0) {
                  set(redeemCodesModel);
                  redeemCodeSelectController.setSelectionState("data");
                } else {
                  redeemCodeSelectController.setSelectionState("empty");
                }
    });
  }, [demandRedeemCodes, fetchRedeemCodes, userData, extractLatest, redeemCodeSelectController]);

  const openRedeemCode = useCallback(() => {
    if (!userData) return;
    redeemCodeSelectController.toggle();
    loadRedeemCodes();
  }, [userData, redeemCodeSelectController, loadRedeemCodes]);

  const handleRedeemCodeSearch = useCallback((query: string) => {
    setRedeemCodeQuery(query);
  }, []);

  const filteredRedeemCodes = useMemo(() => {
    if (!searchRedeemCodeQuery) return redeemCodes;

    const filters = redeemCodes.filter(item =>
      item.redeemCodeValue.toLowerCase().includes(searchRedeemCodeQuery.toLowerCase()) ||
      item.redeemCodeAmount.toString().toLowerCase().includes(searchRedeemCodeQuery.toLowerCase())
    );

    if (filters.length <= 0 && redeemCodes.length > 0) {
      redeemCodeSelectController.setSelectionState("empty");
    }

    return filters;
  }, [redeemCodes, searchRedeemCodeQuery]);

  const handleRedeemCodeSelect = useCallback((redeemCode: RedeemCodeModel) => {
    setRedeemCodeData(redeemCode);
    redeemCodeSelectController.close();
  }, [redeemCodeSelectController]);

  const toggleView = () => {
    if(redeemCodeData)setCodeView(false);
    if(!redeemCodeData)setCodeView(prev=> !prev);
    setRedeemCodeData(null);
  };

  const editView = () => {
    if(redeemCodeData)setRedeemCodeData(null);
    if(redeemCodeData)setCodeView(true);
  };

  const removeView = () => {
    if(redeemCodeData)setRedeemCodeData(null);
    if(redeemCodeData)setCodeView(false);
  };

  return (
    <div className={styles.experienceContainer}>
      <div className={styles.titleRowContainer}>
           <div role="button" onClick={toggleView} className={styles.titleContainer}>
               <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
                 {t('redeem_code_text')}
               </h2>
               <h3 className={`${styles.experienceDesc} ${styles[`experienceDesc_${theme}`]}`}>
                 {t('option_to_redeem_code')}
               </h3>
           </div>
           {codeView && (
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path d="m18 15-6-6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           )}
           {!codeView && (
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           )}
      </div>

      {codeView && !redeemCodeData && <RedeemCodeView onRemoveClick={()=> setCodeView(false)} onRedeemCodeSelect={setRedeemCodeData} />}
      {!codeView && !redeemCodeData && (
                    <div className={styles.profileContainer}>
                      <button
                        className={styles.newProfileButton}
                        onClick={openRedeemCode}
                      >
                        {t('personal_codes')}
                      </button>
                    </div>
                  )}
      {redeemCodeData && (
                    <RedeemCodeCard
                                key={redeemCodeData.redeemCodeId}
                                redeemCode={redeemCodeData}
                                display
                                onEdit={editView}
                                onDelete={removeView}
                    />
                  )}

      <SelectionViewer
        id={redeemCodeSelectId}
        isOpen={redeemCodeSelectIsOpen}
        onClose={redeemCodeSelectController.close}
        onPaginate={callPaginate}
        titleProp={{
          text: t('select_a_code'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: redeemCodeSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleRedeemCodeSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
        }}
        noResultProp={{
          view: <NoResultsView text={t('no_results')} buttonText={t('try_again')} onButtonClick={loadRedeemCodes} />,
        }}
        errorProp={{
          view: <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={loadRedeemCodes} />,
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
        selectionState={redeemCodeSelectionState}
        zIndex={1000}
      >
        {filteredRedeemCodes.map((redeemCode) => (
          <RedeemCodeCard
            key={redeemCode.redeemCodeId}
            onClick={() => handleRedeemCodeSelect(redeemCode)}
            redeemCode={redeemCode}
          />
        ))}
      </SelectionViewer>
    </div>
  );
}