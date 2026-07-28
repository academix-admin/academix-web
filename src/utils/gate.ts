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

export type GateStatus = string | null | undefined;

export function gateStatusOf(response: any): GateStatus {
  if (!response) return null;
  if (Array.isArray(response)) return response[0]?.status ?? null;
  return response.status ?? null;
}

/** Returns a translated message for a blocked gate status, or null when not blocked. */
export function gateMessage(status: GateStatus, t: (key: string) => string): string | null {
  if (status === 'Region.blocked') return t('region_blocked');
  if (status === 'Feature.unavailable') return t('feature_unavailable');
  return null;
}
