-- schema:   public
-- function: async_rpc(rpc_name text, json_args jsonb, supabase_url text, jwt_token text, version text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)
-- Hardened: egress restricted to our own PostgREST (anti-SSRF), pg_net timeout_milliseconds passed
-- as an argument (was a bogus header), fire-and-forget, and execute revoked from anon/authenticated.

CREATE OR REPLACE FUNCTION public.async_rpc(rpc_name text, json_args jsonb, supabase_url text, jwt_token text DEFAULT NULL::text, version text DEFAULT 'v1'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  api_url text;
  token   text := coalesce(jwt_token, '');
begin
  -- Only our own project's PostgREST may be targeted — a caller-supplied host would otherwise be an
  -- SSRF + token-exfiltration vector (the bearer token travels in the request headers).
  IF supabase_url IS NULL
     OR supabase_url !~ '^https://iewqfmkngcgayxbbnpiz\.supabase\.co(/|$)' THEN
    RETURN;
  END IF;
  api_url := supabase_url || '/rest/' || version || '/rpc/' || rpc_name;
  PERFORM net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', token,
      'Authorization', 'Bearer ' || token
    ),
    body := json_args,
    timeout_milliseconds := 15000
  );
exception when others then
  RETURN;  -- fire-and-forget
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.async_rpc(text, jsonb, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.async_rpc(text, jsonb, text, text, text) TO service_role;
