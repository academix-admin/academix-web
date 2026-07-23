'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './statements-page.module.css';
import { useNav } from "@academix-admin/navigation-stack";
import { useUserData } from '@/lib/stacks/user-stack';
import { getParamatical } from '@/utils/checkers';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useDialog } from '@academix-admin/dialog-viewer';
import { BottomViewer, useBottomController } from "@academix-admin/bottom-viewer";
import CustomScrollDatePicker from "@academix-admin/scroll-date-picker";
import DialogCancel from '@/components/DialogCancel';
import { Header } from '@academix-admin/header';

type StatementFormat = 'pdf' | 'csv';
type StatementPeriod = 'custom' | '7d' | '30d' | '90d' | '180d' | '365d';

interface PeriodOption {
  value: StatementPeriod;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '180d', label: 'Last 6 months' },
  { value: '365d', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

function getDateRangeFromPeriod(period: StatementPeriod): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case '7d': from.setDate(to.getDate() - 7); break;
    case '30d': from.setDate(to.getDate() - 30); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    case '180d': from.setDate(to.getDate() - 180); break;
    case '365d': from.setDate(to.getDate() - 365); break;
    default: return { from: '', to: '' };
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function StatementsPage() {
  const { theme, applyTheme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { userData } = useUserData();

  const [selectedPeriod, setSelectedPeriod] = useState<StatementPeriod>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<StatementFormat>('pdf');
  const [emailOverride, setEmailOverride] = useState('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [submitState, setSubmitState] = useState<'initial' | 'loading' | 'success'>('initial');

  const errorDialog = useDialog();
  const successDialog = useDialog();

  const [fromDateBottomViewerId, fromDateViewerController, fromDateViewerIsOpen] = useBottomController();
  const [toDateBottomViewerId, toDateViewerController, toDateViewerIsOpen] = useBottomController();

  const goBack = async () => { await nav.pop(); };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();
    const shortMonthsMap: { [key: number]: string } = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr',
      4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Aug',
      8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };
    return `${day} - ${shortMonthsMap[month]} - ${year}`;
  };

  const handleFromDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setCustomFrom(`${year}-${month}-${day}`);
  };

  const handleToDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setCustomTo(`${year}-${month}-${day}`);
  };

  const resolvedEmail = useCustomEmail
    ? emailOverride.trim()
    : (userData?.usersEmail ?? '');

  const isEmailValid = (email: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const resolvedDateRange = selectedPeriod === 'custom'
    ? { from: customFrom, to: customTo }
    : getDateRangeFromPeriod(selectedPeriod);

  const isFormValid = (() => {
    if (!isEmailValid(resolvedEmail)) return false;
    if (selectedPeriod === 'custom') {
      if (!customFrom || !customTo) return false;
      if (new Date(customFrom) > new Date(customTo)) return false;
    }
    return true;
  })();

  const handleSubmit = useCallback(async () => {
    if (!userData || !isFormValid || submitState === 'loading') return;

    setSubmitState('loading');

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setSubmitState('initial');
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('error_occurred')}</p>
          </div>
        );
        return;
      }

      const session = await supabaseBrowser.auth.getSession();
      const jwt = session.data.session?.access_token;
      if (!jwt) {
        setSubmitState('initial');
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{t('error_occurred')}</p>
          </div>
        );
        return;
      }

      const response = await fetch('/api/request-statement', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: paramatical.usersId,
          country: paramatical.country,
          locale: paramatical.locale,
          gender: paramatical.gender,
          age: paramatical.age,
          email: resolvedEmail,
          fromDate: resolvedDateRange.from,
          toDate: resolvedDateRange.to,
          format: selectedFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        setSubmitState('initial');
        errorDialog.open(
          <div style={{ textAlign: 'center' }}>
            <p>{data.message ?? t('error_occurred')}</p>
          </div>
        );
        return;
      }

      setSubmitState('success');
      successDialog.open(
        <div style={{ textAlign: 'center' }}>
          <p>{t('statement_sent_message', { email: resolvedEmail })}</p>
        </div>
      );
    } catch (err: any) {
      console.error('[StatementsPage] error:', err);
      setSubmitState('initial');
      errorDialog.open(
        <div style={{ textAlign: 'center' }}>
          <p>{t('error_occurred')}</p>
          {err?.message && (
            <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
              {err.message}
            </p>
          )}
        </div>
      );
    }
  }, [userData, isFormValid, submitState, lang, resolvedEmail, resolvedDateRange, selectedFormat]);

  return (
    <main className={`${applyTheme(styles, 'container')}`}>

      <Header title={t('statements_text')} theme={theme} onBack={goBack} />

      <div className={styles.innerBody}>

        {/* ── Period selector ── */}
        <section className={styles.section}>
          <h2 className={`${applyTheme(styles, 'sectionTitle')}`}>
            {t('select_period_text')}
          </h2>
          <div className={styles.periodGrid}>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${applyTheme(styles, 'periodChip')} ${selectedPeriod === opt.value ? styles.periodChipActive : ''}`}
                onClick={() => setSelectedPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedPeriod === 'custom' && (
            <div className={styles.customRangeRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('from_date_text')}</label>
                <button onClick={() => fromDateViewerController.open()} className={styles.select}>
                  {formatDate(customFrom) || t('select_text')}
                </button>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('to_date_text')}</label>
                <button onClick={() => toDateViewerController.open()} className={styles.select}>
                  {formatDate(customTo) || t('select_text')}
                </button>
              </div>
            </div>
          )}

          {/* Summary pill */}
          {(resolvedDateRange.from && resolvedDateRange.to) && (
            <div className={`${applyTheme(styles, 'summaryPill')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{resolvedDateRange.from} → {resolvedDateRange.to}</span>
            </div>
          )}
        </section>

        {/* ── Format selector ── */}
        <section className={styles.section}>
          <h2 className={`${applyTheme(styles, 'sectionTitle')}`}>
            {t('format_text')}
          </h2>
          <div className={styles.formatRow}>
            {(['pdf', 'csv'] as StatementFormat[]).map((fmt) => (
              <button
                key={fmt}
                className={`${applyTheme(styles, 'formatCard')} ${selectedFormat === fmt ? styles.formatCardActive : ''}`}
                onClick={() => setSelectedFormat(fmt)}
              >
                <div className={`${styles.formatIcon} ${selectedFormat === fmt ? styles.formatIconActive : ''}`}>
                  {fmt === 'pdf' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                      <line x1="9" y1="11" x2="15" y2="11" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="8" y2="17" />
                      <line x1="16" y1="13" x2="16" y2="17" />
                      <line x1="12" y1="11" x2="12" y2="17" />
                    </svg>
                  )}
                </div>
                <span className={styles.formatLabel}>{fmt.toUpperCase()}</span>
                <span className={`${applyTheme(styles, 'formatDesc')}`}>
                  {fmt === 'pdf' ? t('pdf_desc_text') : t('csv_desc_text')}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Delivery email ── */}
        <section className={styles.section}>
          <h2 className={`${applyTheme(styles, 'sectionTitle')}`}>
            {t('delivery_email_text')}
          </h2>

          {/* Toggle for custom email */}
          <button
            className={`${applyTheme(styles, 'toggleRow')}`}
            onClick={() => {
              setUseCustomEmail((prev) => !prev);
              if (useCustomEmail) setEmailOverride('');
            }}
          >
            <div className={styles.toggleLeft}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span className={styles.toggleLabel}>{t('send_to_different_email_text')}</span>
            </div>
            <div className={`${applyTheme(styles, 'switch')} ${useCustomEmail ? styles.switch_active : ''}`}>
              <div className={`${applyTheme(styles, 'switchHandle')} ${useCustomEmail ? styles.switchHandle_active : ''}`} />
            </div>
          </button>

          <div className={styles.emailBox}>
            {useCustomEmail ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('email_label')}</label>
                <input
                  type="email"
                  className={`${applyTheme(styles, 'input')}`}
                  value={emailOverride}
                  onChange={(e) => setEmailOverride(e.target.value)}
                  placeholder={t('email_placeholder')}
                />
                {emailOverride && !isEmailValid(emailOverride) && (
                  <p className={`${applyTheme(styles, 'errorText')}`}>
                    {t('invalid_email_text')}
                  </p>
                )}
              </div>
            ) : (
              <div className={`${applyTheme(styles, 'emailDisplay')}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>{userData?.usersEmail ?? '—'}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Submit ── */}
        <button
          className={styles.submitButton}
          disabled={!isFormValid || submitState === 'loading'}
          onClick={handleSubmit}
        >
          {submitState === 'loading' ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {t('send_statement_text')}
            </>
          )}
        </button>

      </div>

      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[
          {
            text: t('ok_text'),
            variant: 'primary',
            onClick: () => errorDialog.close()
          }
        ]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff'
        }}
      />

      <successDialog.DialogViewer
        title={t('success_text')}
        buttons={[
          {
            text: t('ok_text'),
            variant: 'primary',
            onClick: async () => {
              successDialog.close();
            }
          }
        ]}
        showCancel={false}
        closeOnBackdrop={false}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff'
        }}
      />

      <BottomViewer
        id={fromDateBottomViewerId}
        isOpen={fromDateViewerIsOpen}
        onClose={fromDateViewerController.close}
        cancelButton={{
          position: "right",
          onClick: fromDateViewerController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${applyTheme(styles, 'dialogContainer')}`}>
          <div className={`${applyTheme(styles, 'dialogHeaderContainer')}`}>
            <h3 className={`${applyTheme(styles, 'dialogTitle')}`}>{t('select_from_date_text')}</h3>
          </div>
          <CustomScrollDatePicker
            key={`from-date-${customTo || 'no-to'}`}
            onChange={handleFromDateChange}
            defaultDate={true}
            quickDate={true}
            opacity={0.5}
            itemExtent={30}
            useMagnifier={true}
            magnification={1.5}
            textSize={18}
            height={150}
            maxDate={customTo ? new Date(customTo) : new Date()}
            startFromDate={customFrom ? new Date(customFrom) : null}
            backgroundColor={theme === "light" ? "#f8f9fa" : "#1a1a1a"}
            primaryTextColor={theme === "light" ? "#2c3e50" : "#ecf0f1"}
            secondaryTextColor={theme === "light" ? "#7f8c8d" : "#bdc3c7"}
            todayText={t('today_text')}
            yesterdayText={t('yesterday_text')}
          />
          <div className={`${applyTheme(styles, 'dialogBottomContainer')}`}>
            <button className={`${applyTheme(styles, 'selectButton')}`} onClick={fromDateViewerController.close}>{t('select_date_text')}</button>
          </div>
        </div>
      </BottomViewer>

      <BottomViewer
        id={toDateBottomViewerId}
        isOpen={toDateViewerIsOpen}
        onClose={toDateViewerController.close}
        cancelButton={{
          position: "right",
          onClick: toDateViewerController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        closeThreshold={0.2}
        zIndex={1000}
      >
        <div className={`${applyTheme(styles, 'dialogContainer')}`}>
          <div className={`${applyTheme(styles, 'dialogHeaderContainer')}`}>
            <h3 className={`${applyTheme(styles, 'dialogTitle')}`}>{t('select_to_date_text')}</h3>
          </div>
          <CustomScrollDatePicker
            key={`to-date-${customFrom || 'no-from'}`}
            onChange={handleToDateChange}
            defaultDate={true}
            quickDate={true}
            opacity={0.5}
            itemExtent={30}
            useMagnifier={true}
            magnification={1.5}
            textSize={18}
            height={100}
            startFromDate={customTo ? new Date(customTo) : null}
            minDate={customFrom ? new Date(customFrom) : undefined}
            maxDate={new Date()}
            backgroundColor={theme === "light" ? "#f8f9fa" : "#1a1a1a"}
            primaryTextColor={theme === "light" ? "#2c3e50" : "#ecf0f1"}
            secondaryTextColor={theme === "light" ? "#7f8c8d" : "#bdc3c7"}
            todayText={t('today_text')}
            yesterdayText={t('yesterday_text')}
          />
          <div className={`${applyTheme(styles, 'dialogBottomContainer')}`}>
            <button className={`${applyTheme(styles, 'selectButton')}`} onClick={toDateViewerController.close}>{t('select_date_text')}</button>
          </div>
        </div>
      </BottomViewer>
    </main>
  );
}