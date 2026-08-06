'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import styles from './SessionManager.module.css';

/**
 * SessionManager — active-device / session control (Workstream G2).
 *
 * Lists the user's Supabase sessions (device from user_agent, geolocated IP, last-active,
 * current badge) via the SECURITY DEFINER RPC `get_my_sessions`, and revokes a specific device
 * (`revoke_my_session` → deletes the session; refresh tokens cascade) or all other devices
 * (`auth.signOut({ scope: 'others' })`). Styled with the profile theme variables.
 */

interface Sess {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  refreshed_at: string | null;
  is_current: boolean;
  device_name: string | null;
  platform: string | null;
}

type Loc = { city: string; region: string; country: string; country_code: string };

// NOTE on iOS: Chrome/Firefox/Edge use CriOS/FxiOS/EdgiOS and ALSO contain "Safari", so those
// must be matched BEFORE Safari or every iOS browser looks like Safari.
function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os =
    /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
      : /Android/i.test(ua) ? 'Android'
        : /Windows/i.test(ua) ? 'Windows'
          : /CrOS/i.test(ua) ? 'ChromeOS'
            : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
              : /Linux/i.test(ua) ? 'Linux' : '';
  const browser =
    /EdgiOS|EdgA|Edg\//i.test(ua) ? 'Edge'
      : /CriOS|Chrome\//i.test(ua) ? 'Chrome'
        : /FxiOS|Firefox\//i.test(ua) ? 'Firefox'
          : /OPiOS|OPR\/|Opera/i.test(ua) ? 'Opera'
            : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return [browser, os].filter(Boolean).join(' · ');
}

function placeOf(loc?: Loc): string {
  if (!loc) return '';
  return [loc.city, loc.country].filter(Boolean).join(', ');
}

export function SessionManager({ onRegisterRefresh }: { onRegisterRefresh?: (refresh: () => Promise<void>) => void } = {}) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<Sess[] | null>(null);
  const [locations, setLocations] = useState<Record<string, Loc>>({});
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const rel = useCallback((iso: string | null): string => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t('active_now') || 'active now';
    const value = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
    return (t('time_ago', { value }) || `${value} ago`).replace('{value}', value);
  }, [t]);

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
    setLoadError(false);
    const { data, error } = await supabaseBrowser.rpc('get_my_sessions');
    if (error) { setLoadError(true); setSessions([]); return; }
    const list = (data as Sess[]) ?? [];
    setSessions(list);
    loadLocations(list);
  }, [loadLocations]);

  useEffect(() => { load(); }, [load]);

  // Expose reload to the page header (refresh button), matching the redeem-codes pattern.
  useEffect(() => { onRegisterRefresh?.(load); }, [onRegisterRefresh, load]);

  const revokeOne = useCallback(async (id: string) => {
    setBusyId(id); setError('');
    try {
      const { error } = await supabaseBrowser.rpc('revoke_my_session', { p_session_id: id });
      if (error) throw error;
      await load();
    } catch {
      setError(t('could_not_logout_device') || 'Could not log out that device.');
    } finally {
      setBusyId(null);
    }
  }, [load, t]);

  const revokeOthers = useCallback(async () => {
    setBusyAll(true); setError('');
    try {
      const { error } = await supabaseBrowser.auth.signOut({ scope: 'others' });
      if (error) throw error;
      await load();
    } catch {
      setError(t('could_not_logout_others') || 'Could not log out other devices.');
    } finally {
      setBusyAll(false);
    }
  }, [load, t]);

  const others = (sessions ?? []).filter((s) => !s.is_current);

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>{t('active_devices') || 'Active devices'}</h3>
      <p className={styles.subtext}>{t('devices_subtitle') || "Where you're signed in. Log out any device you don't recognise."}</p>

      {/* Exactly one status view at a time (data > loading > error > empty). */}
      {sessions === null ? (
        <LoadingView text={t('loading') || 'Loading…'} />
      ) : loadError ? (
        <ErrorView
          text={t('could_not_load_devices') || 'Could not load your devices.'}
          buttonText={t('try_again') || 'Try Again'}
          onButtonClick={load}
        />
      ) : sessions.length === 0 ? (
        <NoResultsView
          text={t('no_sessions') || 'No active sessions found.'}
          buttonText={t('try_again') || 'Try Again'}
          onButtonClick={load}
        />
      ) : (
        <>
          <ul className={styles.list}>
            {sessions.map((s) => (
              <li key={s.id} className={styles.row}>
                <div className={styles.info}>
                  <div className={styles.deviceLine}>
                    <span className={styles.device}>{s.device_name || describeDevice(s.user_agent)}</span>
                    {s.is_current && <span className={styles.currentBadge}>{t('this_device') || 'This device'}</span>}
                  </div>
                  <div className={styles.meta}>
                    {[placeOf(s.ip ? locations[s.ip] : undefined), s.ip, rel(s.refreshed_at || s.created_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                {!s.is_current && (
                  <button
                    type="button"
                    className={styles.logoutBtn}
                    onClick={() => revokeOne(s.id)}
                    disabled={busyId === s.id || busyAll}
                  >
                    {busyId === s.id ? '…' : (t('log_out') || 'Log out')}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Action (revoke) errors are shown alongside the list only. */}
          {error && <p className={styles.error}>{error}</p>}

          {others.length > 0 && (
            <button type="button" className={styles.logoutAllBtn} onClick={revokeOthers} disabled={busyAll}>
              {busyAll ? (t('logging_out') || 'Logging out…') : (t('log_out_all_others') || 'Log out all other devices')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
