-- schema:   public
-- function: async_rpc(rpc_name text, json_args jsonb, supabase_url text, jwt_token text, version text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.async_rpc(rpc_name text, json_args jsonb, supabase_url text, jwt_token text DEFAULT NULL::text, version text DEFAULT 'v1'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  id TEXT;
  api_url TEXT;
  token TEXT;
begin
  api_url := supabase_url ||  '/rest/' || version || '/rpc/' || rpc_name;
  token := coalesce(jwt_token, '');
  PERFORM net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', token,
      'timeout_milliseconds', 15000,
      'Authorization', 'Bearer ' || token
    ),
    body := json_args
  );

end;
$function$

