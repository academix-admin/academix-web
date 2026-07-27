'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './SessionManager.module.css';

/**
 * SessionManager — active-device / session control (Workstream G2).
 *
 * Lists the user's Supabase sessions (device from user_agent, IP, last-active, current badge)
 * via the SECURITY DEFINER RPC `get_my_sessions`, and lets them revoke a specific device
 * (`revoke_my_session` → deletes the session; refresh tokens cascade) or log out all other
 * devices (`auth.signOut({ scope: 'others' })`). Because free-plan sessions don't expire, this
 * is how a user boots a lost/old device.
 */

interface Sess {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  refreshed_at: string | null;
  is_current: boolean;
}

function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os =
    /Windows/i.test(ua) ? 'Windows'
      : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
        : /Android/i.test(ua) ? 'Android'
          : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
            : /Linux/i.test(ua) ? 'Linux' : '';
  const browser =
    /Edg\//i.test(ua) ? 'Edge'
      : /OPR\/|Opera/i.test(ua) ? 'Opera'
        : /Chrome\//i.test(ua) ? 'Chrome'
          : /Firefox\//i.test(ua) ? 'Firefox'
            : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return [browser, os].filter(Boolean).join(' · ');
}

function ago(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'active now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type Loc = { city: string; region: string; country: string; country_code: string };

function placeOf(loc?: Loc): string {
  if (!loc) return '';
  return [loc.city, loc.country].filter(Boolean).join(', ');
}

export function SessionManager() {
  const { theme, applyTheme } = useTheme();
  const [sessions, setSessions] = useState<Sess[] | null>(null);
  const [locations, setLocations] = useState<Record<string, Loc>>({});
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const loadLocations = useCallback(async (list: Sess[]) => {
    const ips = [...new Set(list.map((s) => s.ip).filter((ip): ip is string => !!ip))];
    if (!ips.length) return;
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ ips }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.locations) setLocations((prev) => ({ ...prev, ...json.locations }));
    } catch { /* location is best-effort */ }
  }, []);

  const load = useCallback(async () => {
    setError('');
    const { data, error } = await supabaseBrowser.rpc('get_my_sessions');
    if (error) { setError('Could not load your devices.'); setSessions([]); return; }
    const list = (data as Sess[]) ?? [];
    setSessions(list);
    loadLocations(list);
  }, [loadLocations]);

  useEffect(() => { load(); }, [load]);

  const revokeOne = useCallback(async (id: string) => {
    setBusyId(id); setError('');
    try {
      const { error } = await supabaseBrowser.rpc('revoke_my_session', { p_session_id: id });
      if (error) throw error;
      await load();
    } catch {
      setError('Could not log out that device.');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const revokeOthers = useCallback(async () => {
    setBusyAll(true); setError('');
    try {
      const { error } = await supabaseBrowser.auth.signOut({ scope: 'others' });
      if (error) throw error;
      await load();
    } catch {
      setError('Could not log out other devices.');
    } finally {
      setBusyAll(false);
    }
  }, [load]);

  const others = (sessions ?? []).filter((s) => !s.is_current);

  return (
    <div className={`${applyTheme(styles, 'section')}`}>
      <h3 className={`${applyTheme(styles, 'heading')}`}>Active devices</h3>
      <p className={styles.subtext}>Where you&apos;re signed in. Log out any device you don&apos;t recognise.</p>

      {sessions === null ? (
        <div className={styles.rowMuted}>Loading devices…</div>
      ) : sessions.length === 0 ? (
        <div className={styles.rowMuted}>No active sessions found.</div>
      ) : (
        <ul className={styles.list}>
          {sessions.map((s) => (
            <li key={s.id} className={`${applyTheme(styles, 'row')}`}>
              <div className={styles.info}>
                <div className={styles.deviceLine}>
                  <span className={styles.device}>{describeDevice(s.user_agent)}</span>
                  {s.is_current && <span className={styles.currentBadge}>This device</span>}
                </div>
                <div className={styles.meta}>
                  {[placeOf(s.ip ? locations[s.ip] : undefined), s.ip, ago(s.refreshed_at || s.created_at)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {!s.is_current && (
                <button
                  type="button"
                  className={`${applyTheme(styles, 'logoutBtn')}`}
                  onClick={() => revokeOne(s.id)}
                  disabled={busyId === s.id || busyAll}
                >
                  {busyId === s.id ? '…' : 'Log out'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {others.length > 0 && (
        <button
          type="button"
          className={`${applyTheme(styles, 'logoutAllBtn')}`}
          onClick={revokeOthers}
          disabled={busyAll}
        >
          {busyAll ? 'Logging out…' : 'Log out all other devices'}
        </button>
      )}
    </div>
  );
}
