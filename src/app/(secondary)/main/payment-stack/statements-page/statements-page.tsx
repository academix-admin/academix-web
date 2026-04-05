'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './statements-page.module.css';
import { useNav } from "@/lib/NavigationStack";
import { useUserData } from '@/lib/stacks/user-stack';
import { getParamatical } from '@/utils/checkers';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useDialog } from '@/lib/DialogViewer';
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import CustomScrollDatePicker from "@/lib/CustomScrollDatePicker";
import DialogCancel from '@/components/DialogCancel';

type StatementFormat = 'pdf' | 'csv';
type StatementPeriod = 'custom' | '7d' | '30d' | '90d' | '180d' | '365d';

interface PeriodOption {
  value: StatementPeriod;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '7d',    label: 'Last 7 days' },
  { value: '30d',   label: 'Last 30 days' },
  { value: '90d',   label: 'Last 3 months' },
  { value: '180d',  label: 'Last 6 months' },
  { value: '365d',  label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

function getDateRangeFromPeriod(period: StatementPeriod): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case '7d':   from.setDate(to.getDate() - 7);   break;
    case '30d':  from.setDate(to.getDate() - 30);  break;
    case '90d':  from.setDate(to.getDate() - 90);  break;
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
  const { theme } = useTheme();
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
          userId:    paramatical.usersId,
          country:   paramatical.country,
          locale:    paramatical.locale,
          gender:    paramatical.gender,
          age:       paramatical.age,
          email:     resolvedEmail,
          fromDate:  resolvedDateRange.from,
          toDate:    resolvedDateRange.to,
          format:    selectedFormat,
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
          <h1 className={styles.title}>{t('statements_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>

        {/* ── Period selector ── */}
        <section className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles[`sectionTitle_${theme}`]}`}>
            {t('select_period_text')}
          </h2>
          <div className={styles.periodGrid}>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.periodChip} ${styles[`periodChip_${theme}`]} ${selectedPeriod === opt.value ? styles.periodChipActive : ''}`}
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
            <div className={`${styles.summaryPill} ${styles[`summaryPill_${theme}`]}`}>
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
          <h2 className={`${styles.sectionTitle} ${styles[`sectionTitle_${theme}`]}`}>
            {t('format_text')}
          </h2>
          <div className={styles.formatRow}>
            {(['pdf', 'csv'] as StatementFormat[]).map((fmt) => (
              <button
                key={fmt}
                className={`${styles.formatCard} ${styles[`formatCard_${theme}`]} ${selectedFormat === fmt ? styles.formatCardActive : ''}`}
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
                <span className={`${styles.formatDesc} ${styles[`formatDesc_${theme}`]}`}>
                  {fmt === 'pdf' ? t('pdf_desc_text') : t('csv_desc_text')}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Delivery email ── */}
        <section className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles[`sectionTitle_${theme}`]}`}>
            {t('delivery_email_text')}
          </h2>

          {/* Toggle for custom email */}
          <button
            className={`${styles.toggleRow} ${styles[`toggleRow_${theme}`]}`}
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
            <div className={`${styles.switch} ${styles[`switch_${theme}`]} ${useCustomEmail ? styles.switch_active : ''}`}>
              <div className={`${styles.switchHandle} ${styles[`switchHandle_${theme}`]} ${useCustomEmail ? styles.switchHandle_active : ''}`} />
            </div>
          </button>

          <div className={styles.emailBox}>
            {useCustomEmail ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>{t('email_label')}</label>
                <input
                  type="email"
                  className={`${styles.input} ${styles[`input_${theme}`]}`}
                  value={emailOverride}
                  onChange={(e) => setEmailOverride(e.target.value)}
                  placeholder={t('email_placeholder')}
                />
                {emailOverride && !isEmailValid(emailOverride) && (
                  <p className={`${styles.errorText} ${styles[`errorText_${theme}`]}`}>
                    {t('invalid_email_text')}
                  </p>
                )}
              </div>
            ) : (
              <div className={`${styles.emailDisplay} ${styles[`emailDisplay_${theme}`]}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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
              await nav.pop();
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
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          <div className={`${styles.dialogHeaderContainer} ${styles[`dialogHeaderContainer_${theme}`]}`}>
            <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>{t('select_from_date_text')}</h3>
          </div>
          <CustomScrollDatePicker
            onChange={handleFromDateChange}
            defaultDate={true}
            quickDate={true}
            opacity={0.5}
            itemExtent={30}
            useMagnifier={true}
            magnification={1.5}
            textSize={18}
            height={150}
            startFromDate={customFrom ? new Date(customFrom) : null}
            backgroundColor={theme === "light" ? "#f8f9fa" : "#1a1a1a"}
            primaryTextColor={theme === "light" ? "#2c3e50" : "#ecf0f1"}
            secondaryTextColor={theme === "light" ? "#7f8c8d" : "#bdc3c7"}
            todayText={t('today_text')}
            yesterdayText={t('yesterday_text')}
          />
          <div className={`${styles.dialogBottomContainer} ${styles[`dialogBottomContainer_${theme}`]}`}>
            <button className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`} onClick={fromDateViewerController.close}>{t('select_date_text')}</button>
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
        <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
          <div className={`${styles.dialogHeaderContainer} ${styles[`dialogHeaderContainer_${theme}`]}`}>
            <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>{t('select_to_date_text')}</h3>
          </div>
          <CustomScrollDatePicker
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
            backgroundColor={theme === "light" ? "#f8f9fa" : "#1a1a1a"}
            primaryTextColor={theme === "light" ? "#2c3e50" : "#ecf0f1"}
            secondaryTextColor={theme === "light" ? "#7f8c8d" : "#bdc3c7"}
            todayText={t('today_text')}
            yesterdayText={t('yesterday_text')}
          />
          <div className={`${styles.dialogBottomContainer} ${styles[`dialogBottomContainer_${theme}`]}`}>
            <button className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`} onClick={toDateViewerController.close}>{t('select_date_text')}</button>
          </div>
        </div>
      </BottomViewer>
    </main>
  );
}