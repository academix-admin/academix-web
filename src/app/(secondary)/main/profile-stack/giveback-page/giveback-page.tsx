'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './giveback-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendGiveBackModel, GiveBackModel } from '@/models/redeem-code-model';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { PaginateModel } from '@/models/paginate-model';
import { StateStack } from '@/lib/state-stack';
import { useGiveBackModel } from '@/lib/stacks/redeem-code-stack';
import { useDialog } from '@/lib/DialogViewer';

type Tab = 'unclaimed' | 'claimed';

// ── Card ─────────────────────────────────────────────────────────────────────

const GiveBackCard: React.FC<{
  giveBack: GiveBackModel;
  onClaim: (giveBack: GiveBackModel) => void;
  claiming: boolean;
  passwordMode: boolean;
  passwordValue: string;
  onPasswordChange: (value: string) => void;
  onPasswordCancel: () => void;
  onPasswordSubmit: () => void;
  showPassword: boolean;
  onTogglePasswordVisibility: () => void;
  passwordSaving: boolean;
}> = ({
  giveBack,
  onClaim,
  claiming,
  passwordMode,
  passwordValue,
  onPasswordChange,
  onPasswordCancel,
  onPasswordSubmit,
  showPassword,
  onTogglePasswordVisibility,
  passwordSaving,
}) => {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(giveBack.redeemCodeValue ?? giveBack.giveBackCode);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const buildRulesText = () => {
    const rules: string[] = [];
    if (giveBack.giveBackTop) rules.push(t('top_text'));
    if (giveBack.giveBackMid) rules.push(t('mid_text'));
    if (giveBack.giveBackBot) rules.push(t('bot_text'));
    if (giveBack.giveBackRank1) rules.push(t('first_rank'));
    if (giveBack.giveBackRank2) rules.push(t('second_rank'));
    if (giveBack.giveBackRank3) rules.push(t('third_rank'));
    if (rules.length === 0) return null;
    return (
      <div className={styles.rulesRow}>
        <span className={styles.rulesLabel}>{t('rules_text')}:</span>
        <span className={styles.rulesValue}>{rules.join(', ')}</span>
      </div>
    );
  };

  const rulesElement = buildRulesText();

  return (
    <div className={styles.giveBackCard} role="group">
      <div className={styles.cardContent}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.codeSection}>
            <h3 className={styles.giveBackValue}>
              {giveBack.hasClaimed
                ? (giveBack.redeemCodeValue ?? giveBack.giveBackCode)
                : giveBack.giveBackCode}
            </h3>
            {giveBack.hasClaimed && (
              <button
                className={styles.copyButton}
                onClick={handleCopy}
                aria-label="Copy code"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="9" height="9" stroke="currentColor" strokeWidth="1.6" rx="1" />
                  <rect x="4.5" y="4.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2" rx="1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className={styles.amountSection}>
          <div className={styles.amountContent}>
            <div className={styles.currencyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.32c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.72-2.82 0-1.47-1.09-2.49-3.93-3.16z" />
              </svg>
            </div>
            <span className={styles.amountText}>{giveBack.giveBackAmount}</span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.cardFooter}>
          {rulesElement}
          <div className={styles.slotsRow}>
            <span className={styles.slotsText}>
              {giveBack.remainingSlots} / {giveBack.giveBackTotalUsage} {t('slots_remaining_text')}
            </span>
          </div>

            {/* Claim action */}
            {!giveBack.hasClaimed && !passwordMode && (
              <button
                className={styles.claimButton}
                onClick={() => onClaim(giveBack)}
                disabled={claiming}
              >
                {claiming ? <span className={styles.claimSpinner} /> : t('claim_text')}
              </button>
            )}

            {!giveBack.hasClaimed && passwordMode && (
              <div className={styles.passwordSection}>
                <label className={styles.passwordLabel} htmlFor={`giveback-password-${giveBack.giveBackId}`}>
                  {t('password_text')}
                </label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    id={`giveback-password-${giveBack.giveBackId}`}
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.passwordInput} ${styles[`passwordInput_${theme}`]}`}
                    value={passwordValue}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onPasswordSubmit(); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={`${styles.eyeButton} ${styles[`eyeButton_${theme}`]}`}
                    onClick={onTogglePasswordVisibility}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M17.6112 17.6112C16.0556 18.979 14.1364 19.7493 12.0001 19.7493C5.63647 19.7493 2.25011 12.3743 2.25011 12.3743C3.47011 10.1443 5.27761 8.35577 7.38911 7.13965" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20.8892 6.00928C21.8292 6.78928 22.6732 7.70428 23.3892 8.72428C23.7502 9.23428 23.7502 9.91428 23.3892 10.4243C22.6732 11.4443 21.8292 12.3593 20.8892 13.1393" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14.9318 6.00928C13.6618 5.38928 12.2818 5.02928 10.8188 5.00928C9.35585 4.98928 7.93185 5.30928 6.61185 5.88928" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className={styles.passwordRow}>
                  <button
                    type="button"
                    className={styles.passwordCancelButton}
                    onClick={onPasswordCancel}
                    disabled={passwordSaving}
                  >
                    {t('cancel_text')}
                  </button>
                  <button
                    type="button"
                    className={styles.passwordSaveButton}
                    onClick={onPasswordSubmit}
                    disabled={!passwordValue || passwordSaving}
                  >
                    {passwordSaving ? <span className={styles.claimSpinner} /> : t('claim_text')}
                  </button>
                </div>
              </div>
            )}

          {/* Spent badge */}
          {giveBack.hasClaimed && giveBack.isSpent && (
            <div className={styles.spentBadge}>{t('spent_text')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GiveBackPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData, __meta } = useUserData();
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('unclaimed');
  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);

  // Claim state
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const errorDialog = useDialog();

  const [giveBacks, demandGiveBacks, setGiveBacks] = useGiveBackModel(lang);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const unclaimedList = giveBacks.filter(g => !g.hasClaimed);
  const claimedList = giveBacks.filter(g => g.hasClaimed);
  const activeList = activeTab === 'unclaimed' ? unclaimedList : claimedList;
  const isActiveListEmpty = activeList.length === 0;

  // ── Intersection observer for pagination ──────────────────────────────────
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) callPaginate(); },
      { threshold: 1.0 }
    );
    observer.observe(loaderRef.current);
    return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
  }, [giveBacks, paginateModel]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchGiveBacks = useCallback(async (
    userData: UserData,
    limitBy: number,
    paginate: PaginateModel
  ): Promise<GiveBackModel[]> => {
    try {
      const paramatical = await getParamatical(
        userData.usersId, lang, userData.usersSex, userData.usersDob
      );
      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc('get_give_back_code', {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_after_giveback: paginate.toJson(),
      });

      if (error) {
        console.error('[GiveBacks] error:', error);
        setError(t('error_occurred'));
        return [];
      }
      setError('');
      console.log('[GiveBacks] raw row sample:', data?.[0]);
      return (data || []).map((row: BackendGiveBackModel) => new GiveBackModel(row));
    } catch (err) {
      console.error('[GiveBacks] error:', err);
      setError(t('error_occurred'));
      return [];
    }
  }, [lang]);

  const extractLatest = (items: GiveBackModel[]) => {
    if (items.length > 0) {
      setPaginateModel(new PaginateModel({ sortId: items[items.length - 1].sortCreatedId }));
    }
  };

  const processGiveBacksPaginate = (newItems: GiveBackModel[]) => {
    const existingIds = giveBacks.map(g => g.giveBackId);
    const merged = [...giveBacks];
    for (const item of newItems) {
      if (!existingIds.includes(item.giveBackId)) merged.push(item);
    }
    setGiveBacks(merged);
  };

  useEffect(() => {
    if (!__meta.isHydrated || !userData || giveBacks.length > 0) return;

    demandGiveBacks(async ({ get, set }) => {
      setFetchLoading(true);
      const items = await fetchGiveBacks(userData, 10, new PaginateModel());
      extractLatest(items);
      set(items);
      setEmpty(items.length === 0);
      setFetchLoading(false);
    });
  }, [demandGiveBacks, userData, __meta.isHydrated, giveBacks.length]);

  const callPaginate = async () => {
    if (!userData || giveBacks.length <= 0) return;
    setFetchLoading(true);
    const items = await fetchGiveBacks(userData, 20, paginateModel);
    setFetchLoading(false);
    if (items.length > 0) {
      extractLatest(items);
      processGiveBacksPaginate(items);
    }
  };

  const refreshData = async () => {
    if (!userData) return;
    setFetchLoading(true);
    const items = await fetchGiveBacks(userData, 10, new PaginateModel());
    setFetchLoading(false);
    setEmpty(items.length === 0);
    if (items.length > 0) {
      extractLatest(items);
      setGiveBacks(items);
    }
  };

  // ── Claim ──────────────────────────────────────────────────────────────────
  const executeClaim = async (giveBack: GiveBackModel, password?: string) => {
    if (!userData) return;
    setClaimingId(giveBack.giveBackId);
    try {
      const paramatical = await getParamatical(
        userData.usersId, lang, userData.usersSex, userData.usersDob
      );
      if (!paramatical) { setClaimingId(null); return; }
      const { data, error } = await supabaseBrowser.rpc('claim_giveback_code', {
        p_user_id: paramatical.usersId,
        p_giveback_code: giveBack.giveBackCode,
        p_country: paramatical.country,
        p_locale: paramatical.locale,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        ...(password ? { p_password: password } : {}),
      });

      if (error) throw error;

      const status: string = data?.status ?? '';
      console.log('[GiveBacks] claim response:', { status, data, giveBackCode: giveBack.giveBackCode });

      if (status === 'Giveback.claimed') {
        const codeValue: string = data?.redeem_code_details?.redeem_code_value ?? giveBack.giveBackCode;
        setGiveBacks(prev =>
          prev.map(g =>
            g.giveBackId === giveBack.giveBackId
              ? GiveBackModel.from(g).copyWith({ hasClaimed: true, canClaim: false, redeemCodeValue: codeValue })
              : g
          )
        );
        setPendingClaimId(null);
        setPasswordValue('');
        setShowPassword(false);
        setActiveTab('claimed');
      } else if (status === 'Giveback.invalid_password') {
        console.warn('[GiveBacks] invalid password for:', giveBack.giveBackCode);
        setPasswordValue('');
        setShowPassword(false);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('invalid_password_text')}</p>
          </div>
        );
      } else if (status === 'Giveback.already_claimed') {
        console.warn('[GiveBacks] already claimed:', giveBack.giveBackCode);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('already_claimed_text')}</p>
          </div>
        );
      } else if (status === 'Giveback.exhausted') {
        console.warn('[GiveBacks] exhausted:', giveBack.giveBackCode);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('giveback_exhausted_text')}</p>
          </div>
        );
      } else if (status === 'Giveback.control_failed') {
        const msg = data?.error ?? t('error_occurred');
        console.warn('[GiveBacks] control failed:', msg);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{msg}</p>
          </div>
        );
      } else if (status === 'Giveback.not_found') {
        console.warn('[GiveBacks] not found — giveBackCode sent:', giveBack.giveBackCode);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('error_occurred')}</p>
          </div>
        );
      } else if (status === 'Giveback.code_generation_failed' || status === 'Giveback.failed') {
        console.error('[GiveBacks] server error:', status, data?.error);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('error_occurred')}</p>
          </div>
        );
      } else {
        console.error('[GiveBacks] unexpected status:', status, data);
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('error_occurred')}</p>
          </div>
        );
      }
    } catch (err) {
      console.error('[GiveBacks] claim error:', err);
      errorDialog.open(
        <div style={{ textAlign: 'center' }}>
          <p>{t('error_occurred')}</p>
        </div>
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaim = (giveBack: GiveBackModel) => {
    if (giveBack.hasPassword) {
      setPendingClaimId(giveBack.giveBackId);
      setPasswordValue('');
      setShowPassword(false);
    } else {
      executeClaim(giveBack);
    }
  };

  const handlePasswordCancel = () => {
    setPendingClaimId(null);
    setPasswordValue('');
    setShowPassword(false);
  };

  const handlePasswordSubmit = async () => {
    const pending = giveBacks.find((g) => g.giveBackId === pendingClaimId);
    if (!pending) return;
    await executeClaim(pending, passwordValue);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const goBack = async () => {
    await nav.pop();
    StateStack.core.clearScope('give_back_flow');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button className={styles.backButton} onClick={goBack} aria-label="Go back">
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('give_backs')}</h1>
          <div className={styles.headerSpacer} />
        </div>

        {/* Tabs */}
        <div className={`${styles.tabBar} ${styles[`tabBar_${theme}`]}`}>
          <button
            className={`${styles.tab} ${activeTab === 'unclaimed' ? styles.tabActive : ''} ${styles[`tab_${theme}`]}`}
            onClick={() => setActiveTab('unclaimed')}
          >
            {t('unclaimed_text')} {unclaimedList.length > 0 && <span className={styles.tabBadge}>{unclaimedList.length}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'claimed' ? styles.tabActive : ''} ${styles[`tab_${theme}`]}`}
            onClick={() => setActiveTab('claimed')}
          >
            {t('claimed_text')} {claimedList.length > 0 && <span className={styles.tabBadge}>{claimedList.length}</span>}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {giveBacks.length === 0 && fetchLoading && <LoadingView />}

        {giveBacks.length === 0 && error && (
          <ErrorView text={error} buttonText="Try Again" onButtonClick={refreshData} />
        )}

        {isActiveListEmpty && !error && !fetchLoading && (
          <NoResultsView text="No result" buttonText="Try Again" onButtonClick={refreshData} />
        )}

        {activeList.map(giveBack => (
          <GiveBackCard
            key={giveBack.giveBackId}
            giveBack={giveBack}
            onClaim={handleClaim}
            claiming={claimingId === giveBack.giveBackId}
            passwordMode={pendingClaimId === giveBack.giveBackId}
            passwordValue={pendingClaimId === giveBack.giveBackId ? passwordValue : ''}
            onPasswordChange={setPasswordValue}
            onPasswordCancel={handlePasswordCancel}
            onPasswordSubmit={handlePasswordSubmit}
            showPassword={showPassword}
            onTogglePasswordVisibility={togglePasswordVisibility}
            passwordSaving={claimingId === giveBack.giveBackId}
          />
        ))}

        {activeList.length > 0 && <div ref={loaderRef} className={styles.loadMoreSentinel} />}
      </div>

      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
        }}
      />

    </main>
  );
}
