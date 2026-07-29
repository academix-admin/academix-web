'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PinInput, Keypad } from '@academix-admin/pin-input';
import { useDialog } from '@academix-admin/dialog-viewer';
import Image from 'next/image';
import { useAuthContext } from '@/providers/AuthProvider';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import { fetchWithTimeout } from '@/utils/timeout';
import styles from './AppLock.module.css';

/**
 * AppLock — fintech idle app-lock (Workstream G1).
 *
 * Supabase's free plan issues non-expiring sessions, so a signed-in device stays authenticated
 * indefinitely. This overlays a PIN gate after a period of inactivity WITHOUT signing the user
 * out: the session is untouched; we just cover the UI until the 6-digit money PIN is re-entered
 * (verified server-side via /api/pin/verify, which enforces the same 5-attempt/15-min lockout).
 *
 * Only active when signed in with a loaded profile. `last-active` is persisted so returning from
 * a long background (or a reload) re-locks immediately. A PIN-less account is never trapped.
 */

const IDLE_MS = 10 * 60 * 1000; // lock after 10 minutes idle
const TOUCH_MS = 60 * 1000; // heartbeat to the server gate at most once a minute
const LAST_ACTIVE_KEY = 'ax:last-active';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click', 'scroll'] as const;

export function AppLock({ children }: { children: React.ReactNode }) {
  const { hasValidSession, userData } = useAuthContext();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const active = hasValidSession && !!userData;

  const [locked, setLocked] = useState(false);
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lockedRef = useRef(false);

  const setLockedState = useCallback((v: boolean) => { lockedRef.current = v; setLocked(v); }, []);

  const unlock = useCallback(() => {
    setValue(''); setError(''); setBusy(false);
    try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* ignore */ }
    setLockedState(false);
  }, [setLockedState]);

  // Escape hatch on the lock screen — confirm, then sign out (local scope so it never hangs; the
  // redirect guard sends this device to login). Lets a user who can't recall their PIN leave.
  const signOutDialog = useDialog();
  const [signingOut, setSigningOut] = useState(false);
  const openSignOutConfirm = useCallback(() => {
    signOutDialog.open(
      <div style={{ textAlign: 'center' }}>
        <p>{t('confirm_sign_out')}</p>
      </div>
    );
  }, [signOutDialog, t]);
  const confirmSignOutFromLock = useCallback(async () => {
    setSigningOut(true);
    // Cap the local sign-out so a stuck auth lock / no internet can't block us, then hard-navigate.
    await Promise.race([
      supabaseBrowser.auth.signOut({ scope: 'local' }).catch(() => {}),
      new Promise((res) => setTimeout(res, 2000)),
    ]);
    window.location.replace('/login');
  }, []);

  // Typing a fresh PIN after a failure clears the stale error immediately.
  const onPinChange = useCallback((v: string) => {
    setValue(v);
    setError((prev) => (prev ? '' : prev));
  }, []);

  // ─── Inactivity tracking ────────────────────────────────────────────────
  useEffect(() => {
    if (!active) { setLockedState(false); return; }

    let idleTimer: number | undefined;
    let lastWrite = 0;
    let lastTouch = 0;
    const mark = () => {
      const now = Date.now();
      if (now - lastWrite > 5000) { lastWrite = now; try { localStorage.setItem(LAST_ACTIVE_KEY, String(now)); } catch { /* ignore */ } }
    };
    // Heartbeat: slide the SERVER idle window on genuine user activity (throttled). The server gate is
    // the source of truth for app-lock; this keeps an actively-used session unlocked. No-ops when the
    // session is already locked/revoked server-side (session_touch checks the gate).
    const touch = () => {
      const now = Date.now();
      if (now - lastTouch > TOUCH_MS) { lastTouch = now; supabaseBrowser.rpc('session_touch').then(() => {}, () => {}); }
    };
    const arm = () => { window.clearTimeout(idleTimer); idleTimer = window.setTimeout(() => setLockedState(true), IDLE_MS); };
    const onActivity = () => { if (lockedRef.current) return; mark(); touch(); arm(); };
    const lockIfStale = () => {
      if (lockedRef.current) return;
      let last = 0; try { last = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0); } catch { /* ignore */ }
      if (last && Date.now() - last > IDLE_MS) setLockedState(true);
    };

    lockIfStale();               // returning after a long background / reload → lock now
    if (!lockedRef.current) { mark(); arm(); }

    const onVisible = () => { if (document.visibilityState === 'visible') lockIfStale(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearTimeout(idleTimer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active, setLockedState]);

  // ─── Server-driven lock ─────────────────────────────────────────────────
  // If the session gate refuses a request with AX_APP_LOCKED (client fetch interceptor broadcasts
  // `ax:app-locked`), force the overlay up — even if the DOM overlay was tampered with, the request
  // already failed server-side and only a fresh PIN (which extends the server window) clears it.
  useEffect(() => {
    if (!active) return;
    const onLocked = () => setLockedState(true);
    window.addEventListener('ax:app-locked', onLocked);
    return () => window.removeEventListener('ax:app-locked', onLocked);
  }, [active, setLockedState]);

  // ─── Verify entered PIN ─────────────────────────────────────────────────
  const verify = useCallback(async (pin: string) => {
    setBusy(true); setError('');
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetchWithTimeout('https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com/prod/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin }),
      }, 15000, 'PIN verification');
      const json = await res.json().catch(() => ({}));
      if (json.success || json.not_set) { unlock(); return; } // not_set: never trap a PIN-less account
      if (json.locked_until) {
        setError(t('lock_too_many_attempts'));
      } else if (typeof json.attempts_left === 'number') {
        setError(t('lock_incorrect_pin', { count: String(json.attempts_left) }));
      } else {
        setError(t('lock_generic_error'));
      }
      setValue('');
    } catch {
      setError(t('lock_network_error'));
      setValue('');
    } finally {
      setBusy(false);
    }
  }, [unlock, t]);

  useEffect(() => {
    if (locked && value.length === 6 && !busy) verify(value);
  }, [locked, value, busy, verify]);

  return (
    <>
      {children}
      {active && locked && (
        <div
          className={`${styles.overlay} ${theme === 'dark' ? styles.dark : styles.light}`}
          role="dialog"
          aria-modal="true"
          aria-label="App locked"
        >
          <div className={styles.lockHeader}>
            <Image
              src="/assets/image/academix-logo.png"
              alt="Academix"
              width={36}
              height={36}
              className={styles.lockLogo}
              priority
            />
            <button
              type="button"
              className={styles.lockSignOut}
              onClick={openSignOutConfirm}
              disabled={busy || signingOut}
            >
              {t('sign_out')}
            </button>
          </div>

          <div className={styles.top}>
            <h2 className={styles.title}>{t('lock_enter_pin')}</h2>
            <p className={styles.subtitle}>{t('lock_subtitle')}</p>

            <PinInput
              length={6}
              value={value}
              onChange={onPinChange}
              mask
              revealed={reveal}
              autoFocus={false}
              disabled={busy}
              classNames={{ container: styles.pinContainer, input: styles.pinBox }}
            />

            <div className={styles.statusLine} aria-live="polite">
              {busy ? (
                <span className={styles.status}>
                  <span className={styles.spinner} aria-hidden="true" />
                  {t('lock_verifying')}
                </span>
              ) : (
                <span className={`${styles.error} ${error ? '' : styles.errorHidden}`}>{error || ' '}</span>
              )}
            </div>

          </div>

          <div className={styles.keypadSection}>
            <Keypad
              value={value}
              onChange={onPinChange}
              length={6}
              disabled={busy}
              showMaskToggle
              revealed={reveal}
              onToggleReveal={setReveal}
              classNames={{
                keypad: styles.keypad,
                grid: styles.keypadGrid,
                button: styles.key,
                backspace: styles.keyMuted,
                toggle: styles.keyMuted,
              }}
            />
          </div>

          {userData?.usersUsername && (
            <div className={styles.lockUsername}>{userData.usersUsername}</div>
          )}
        </div>
      )}

      <signOutDialog.DialogViewer
        title={t('sign_out')}
        buttons={[
          {
            text: signingOut ? '' : t('yes_text'),
            variant: 'primary',
            loading: signingOut,
            onClick: async () => { await confirmSignOutFromLock(); },
          },
          {
            text: t('no_text'),
            variant: 'secondary',
            disabled: signingOut,
            onClick: () => signOutDialog.close(),
          },
        ]}
        showCancel={false}
        closeOnBackdrop={!signingOut}
        zIndex={2147483647}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
        }}
      />
    </>
  );
}
