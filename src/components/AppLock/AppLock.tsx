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
import { hardLocalSignOut } from '@/utils/checkers';
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
const PIN_VERIFY_URL = 'https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com/prod/pin/verify';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    // hardLocalSignOut caps the (possibly-hanging) signOut AND force-removes the sb-* token so a stale
    // session can't bounce this device back into the app, then hard-navigate to /login.
    await hardLocalSignOut();
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
  //
  // Gated on `hasValidSession` alone, NOT `active` (which also requires `userData` to be loaded):
  // the very first request after login — fetching userData itself — can be the one that gets
  // refused, and requiring userData first would mean the overlay can never appear for exactly that
  // case (the call that would satisfy the gate is the call the gate is blocking). The event detail's
  // `accountExists` (BackendSessionGateError, single-source via domain-types) is the server's own
  // answer to whether this is a real, previously-authenticated account — trust it directly instead
  // of re-deriving the same judgment from local state.
  useEffect(() => {
    if (!hasValidSession) return;
    const onLocked = (e: Event) => {
      const accountExists = (e as CustomEvent<{ accountExists?: boolean }>).detail?.accountExists;
      if (accountExists) setLockedState(true);
    };
    window.addEventListener('ax:app-locked', onLocked);
    return () => window.removeEventListener('ax:app-locked', onLocked);
  }, [hasValidSession, setLockedState]);

  // ─── Verify entered PIN ─────────────────────────────────────────────────
  const verify = useCallback(async (pin: string) => {
    setBusy(true); setError('');
    // Right after login — especially OAuth/Google — the freshly-issued access token can be briefly
    // rejected by the API Gateway authorizer while it propagates. That denial (401/403) used to surface
    // as a "network error" and made a correct PIN look wrong until the user retried. Retry a few times,
    // refreshing the session between attempts, so we ride out that window before showing any error.
    const MAX_ATTEMPTS = 4;
    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const isLast = attempt === MAX_ATTEMPTS - 1;

        let token: string | undefined;
        try {
          const { data } = await supabaseBrowser.auth.getSession();
          token = data.session?.access_token;
          if (!token && attempt > 0) {
            const refreshed = await supabaseBrowser.auth.refreshSession();
            token = refreshed.data.session?.access_token;
          }
        } catch { /* no token this round — the request will 401 and we retry */ }

        let res: Response;
        try {
          res = await fetchWithTimeout(PIN_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
            body: JSON.stringify({ pin }),
          }, 15000, 'PIN verification');
        } catch {
          // Real network/timeout failure — back off and retry a couple times before giving up.
          if (!isLast) { await sleep(300 * (attempt + 1)); continue; }
          setError(t('lock_network_error')); setValue(''); return;
        }

        // Authorizer rejected the token (not yet valid post-login) — refresh the session and retry.
        if (res.status === 401 || res.status === 403) {
          try { await supabaseBrowser.auth.refreshSession(); } catch { /* ignore */ }
          if (!isLast) { await sleep(300 * (attempt + 1)); continue; }
          setError(t('lock_network_error')); setValue(''); return;
        }

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
        return;
      }
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
