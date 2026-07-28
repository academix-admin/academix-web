'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PinInput, Keypad } from '@academix-admin/pin-input';
import { useAuthContext } from '@/providers/AuthProvider';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
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
    const mark = () => {
      const now = Date.now();
      if (now - lastWrite > 5000) { lastWrite = now; try { localStorage.setItem(LAST_ACTIVE_KEY, String(now)); } catch { /* ignore */ } }
    };
    const arm = () => { window.clearTimeout(idleTimer); idleTimer = window.setTimeout(() => setLockedState(true), IDLE_MS); };
    const onActivity = () => { if (lockedRef.current) return; mark(); arm(); };
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

  // ─── Verify entered PIN ─────────────────────────────────────────────────
  const verify = useCallback(async (pin: string) => {
    setBusy(true); setError('');
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com/prod/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin }),
      });
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
        </div>
      )}
    </>
  );
}
