// Client-side handling for server-gated RPCs/Lambdas.
//
// Any RPC or Lambda that runs public.gate_check returns a `status` of 'Region.blocked' or
// 'Feature.unavailable' when the caller is blocked. At EVERY call site whose server enforces a
// gate, read that status and surface a clear, translated message with this helper:
//
//   const { data } = await supabaseBrowser.rpc('make_payment', {...});
//   const msg = gateMessage(data?.status, t);
//   if (msg) { setError(msg); return; }
//
// For SETOF-returning list RPCs the status (if any) is the first row: gateMessage(data?.[0]?.status, t).

import { supabaseBrowser } from '@/lib/supabase/client';

export type StatusValue = string | null | undefined;

/**
 * Resolve WHY sign-in is blocked. The auth.sessions gate trigger raises, but GoTrue/supabase-js
 * flattens that to a generic "Database error granting user" (code 'unexpected_failure') — the real
 * reason never reaches the client. So we ask the server with location_gate, a REGION+COUNTRY check
 * (via cf-ipcountry) that works signed-out — the full gate_check can't be used pre-auth because it
 * also evaluates gender/age (unknown before sign-in) and would report everyone blocked. Returns
 * 'Region.blocked' | 'Feature.unavailable' | null.
 */
export async function signInGateStatus(locale: string): Promise<StatusValue> {
  try {
    const { data, error } = await supabaseBrowser.rpc('location_gate', { p_feature: 'Features.sign_in', p_locale: locale });
    if (error) return null;
    return typeof data === 'string' ? data : (data ?? null);
  } catch {
    return null;
  }
}

export function gateStatusOf(response: any): StatusValue {
  if (!response) return null;
  if (Array.isArray(response)) return response[0]?.status ?? null;
  return response.status ?? null;
}

/** Returns a translated message for a blocked gate status, or null when not blocked. */
export function gateMessage(status: StatusValue, t: (key: string) => string): string | null {
  if (status === 'Region.blocked') return t('region_blocked');
  if (status === 'Feature.unavailable') return t('feature_unavailable');
  return null;
}
