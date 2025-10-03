'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './redeem-codes.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalizeWords } from '@/utils/textUtils';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendRedeemCodeModel } from '@/models/redeem-code-model';
import { RedeemCodeModel } from '@/models/redeem-code-model';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { useDemandState } from '@/lib/state-stack';
import { PaginateModel } from '@/models/paginate-model';
import { StateStack } from '@/lib/state-stack';
import { useRedeemCodeModel } from '@/lib/stacks/redeem-code-stack';


const RedeemCodeCard: React.FC<{ redeemCode: RedeemCodeModel }> = ({ redeemCode }) => {
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
    <div className={styles.redeemCodeCard} role="group" aria-labelledby={`redeemCode-${redeemCode.redeemCodeId}`}>
      {/* Main Card Content */}
      <div className={styles.cardContent}>
        {/* Header with code and copy button */}
        <div className={styles.cardHeader}>
          <div className={styles.codeSection}>
            <h3 id={`redeemCode-${redeemCode.redeemCodeId}`} className={styles.redeemCodeValue}>
              {redeemCode.redeemCodeValue}
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

export default function RedeemCodes() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData, userData$ } = useUserData();
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);


  const [redeemCodes, demandRedeemCodes, setRedeemCodes] = useRedeemCodeModel(lang);


  useEffect(() => {
        if (!loaderRef.current) return;

     const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                callPaginate();
            }
        },
        { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [redeemCodes, paginateModel]);

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
        setError(t('error_occurred'));
        return [];
      }
      setError('');
      return (data || []).map((row: BackendRedeemCodeModel) => new RedeemCodeModel(row));
    } catch (err) {
      console.error("[RedeemCodes] error:", err);
      setError(t('error_occurred'));
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


  useEffect(() => {
    demandRedeemCodes(async ({ get, set }) => {
      if (!userData || redeemCodes.length > 0) return;
      setFetchLoading(true);
      const redeemCodesModel = await fetchRedeemCodes(userData, 10,  new PaginateModel());
      extractLatest(redeemCodesModel);
      set(redeemCodesModel);
      setEmpty(redeemCodesModel.length === 0);
      setFetchLoading(false);
    });
  }, [demandRedeemCodes]);


  const callPaginate = async () => {
    if (!userData || redeemCodes.length <= 0) return;
    setFetchLoading(true);
    const redeemCodesModel = await fetchRedeemCodes(userData, 20, paginateModel);
    setFetchLoading(false);
    if (redeemCodesModel.length > 0) {
      extractLatest(redeemCodesModel);
      processRedeemCodesPaginate(redeemCodesModel);
    }
  };

  const refreshData = async () => {
    if (!userData || redeemCodes.length > 0) return;
    setFetchLoading(true);
    const redeemCodesModel = await fetchRedeemCodes(userData, 10, paginateModel);
    setFetchLoading(false);
    setEmpty(redeemCodesModel.length === 0);
    if (redeemCodesModel.length > 0) {
      extractLatest(redeemCodesModel);
      setRedeemCodes(redeemCodesModel);
    }
  };

    const goBack = async () => {
      await nav.pop();
      StateStack.core.clearScope('redeem_code_flow');
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
          <h1 className={styles.title}>{t('redeem_codes')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        {redeemCodes.length === 0  && fetchLoading && <LoadingView />}

        {redeemCodes.length === 0 && error && (
          <ErrorView
            text={error}
            buttonText="Try Again"
            onButtonClick={refreshData}
          />
        )}

        {empty && !error && !fetchLoading && (
          <NoResultsView
            text="No result"
            buttonText="Try Again"
            onButtonClick={refreshData}
          />
        )}

         {redeemCodes.map((redeemCode) => (
                 <RedeemCodeCard key={redeemCode.redeemCodeId} redeemCode={redeemCode}/>
         ))}
         {redeemCodes.length > 0 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
      </div>
    </main>
  );
}

