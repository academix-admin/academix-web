import { supabaseBrowser } from '@/lib/supabase/client';
import { LoginModel } from '@/models/user-data';
import { UserLoginAccount } from '@/models/user-data';
import { UserData } from '@/models/user-data';

export type LocationData = {
  ip: string;
  success: boolean;
  type: string;
  continent: string;
  continent_code: string;
  country: string;
  country_code: string;
  region: string;
  region_code: string;
  city: string;
  latitude: number;
  longitude: number;
  is_eu: boolean;
  postal: string;
  calling_code: string;
  capital: string;
  borders: string;
  flag: {
    img: string;
    emoji: string;
    emoji_unicode: string;
  };
  connection: {
    asn: number;
    org: string;
    isp: string;
    domain: string;
  };
  timezone: {
    id: string;
    abbr: string;
    is_dst: boolean;
    offset: number;
    utc: string;
    current_time: string;
  };
};


export type ParamaticalData = {
  usersId: string;
  locale: string;
  country: string;
  age: number;
  gender: string;
}

// checkLocation + getParamatical + checkFeatures + fetchUserPartialDetails removed: identity is
// auth.uid(), and region/feature/demographics are all derived + enforced server-side now
// (gate_check / the action RPCs return Feature.unavailable / Region.blocked). The bypassable
// client-side IP lookup (/api/ipwho) and feature pre-check are gone along with their overhead.

const fetchUserDetails = async (loginModel: LoginModel): Promise<UserLoginAccount | null> => {
        const { data, error } = await supabaseBrowser.rpc('get_user_login_record', {
          p_login_type: loginModel.loginType,
          p_login_check: loginModel.loginDetails,
        });

        if (error) throw error;
        return data;
};

const fetchUserData = async (usersId: string, locale: string): Promise<UserData | null> => {
        const { data: userData, error: userError } = await supabaseBrowser.rpc("get_user_record", {
          p_user_id: usersId,
          p_locale: locale
        });

        if (userError) throw userError;
        return userData;
};

/**
 * Returns the current access token, or — when the session has expired / been revoked — signs the
 * user out (AuthProvider's redirect guard then sends them to /login) and returns null. Use this at
 * the top of any authenticated action instead of a bare `getSession()` + generic error dialog, so a
 * lost session logs the user out cleanly rather than showing "something went wrong".
 */
const ensureSession = async (): Promise<string | null> => {
  const { data } = await supabaseBrowser.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) {
    await hardLocalSignOut();
    return null;
  }
  return jwt;
};

/** Decode the `session_id` claim from a Supabase access-token JWT (base64url payload). */
function jwtSessionId(token: string): string | undefined {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json) as { session_id?: string }).session_id;
  } catch {
    return undefined;
  }
}

/**
 * Reliably drop the LOCAL session, even when supabase-js `signOut` hangs.
 *
 * supabase-js `signOut` acquires a `navigator.locks` lock; if it's contended (multiple tabs) or stuck
 * it never resolves, so a plain `await signOut()` (or a race that just times out) can leave the JWT
 * sitting in localStorage. On a device whose session was REVOKED server-side that stale token makes
 * the app think it's still logged in → it forwards to /main → the gate 401s → back to /login → a
 * /login↔/main LOOP that survives closing the tab/browser (the token is persisted) and only clears by
 * wiping browsing data. So after a capped signOut we FORCE-remove any `sb-*` auth token. Does NOT
 * navigate — the caller decides where to go.
 */
export async function hardLocalSignOut(): Promise<void> {
  // Best-effort: ask the server to drop THIS session's row (auth.sessions + its app-lock) so a
  // signed-out device doesn't linger in the session list. Needs the still-valid token, so do it BEFORE
  // signOut. Capped + swallowed — a dead/revoked session (gate 401) or no internet must never block logout.
  try {
    const { data } = await supabaseBrowser.auth.getSession();
    const tok = data.session?.access_token;
    const sid = tok ? jwtSessionId(tok) : undefined;
    if (sid) {
      await Promise.race([
        supabaseBrowser.rpc('revoke_my_session', { p_session_id: sid }).then(() => {}, () => {}),
        new Promise((res) => setTimeout(res, 1500)),
      ]);
    }
  } catch { /* best-effort */ }

  await Promise.race([
    supabaseBrowser.auth.signOut({ scope: 'local' }).catch(() => {}),
    new Promise((res) => setTimeout(res, 1500)),
  ]);
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable — nothing to clear */ }
}

export { fetchUserDetails, fetchUserData, ensureSession };
