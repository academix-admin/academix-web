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
    try { await supabaseBrowser.auth.signOut(); } catch { /* already gone */ }
    return null;
  }
  return jwt;
};

export { fetchUserDetails, fetchUserData, ensureSession };
