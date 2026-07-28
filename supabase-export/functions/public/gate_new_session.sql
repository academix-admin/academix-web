-- schema: public (trigger fn on auth.sessions)
-- Universal sign-in gate (all methods). Warms the lazy GeoIP cache (request_ip_geo) + gates via one
-- gate_check(NEW.user_id, NEW.ip). RAISE aborts a blocked sign-in. FAIL-OPEN.
CREATE OR REPLACE FUNCTION public.gate_new_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_status text;
BEGIN
  BEGIN
    PERFORM public.request_ip_geo(NEW.ip);   -- lazy GeoIP: resolve this IP asynchronously
    SELECT status INTO v_status
      FROM public.gate_check('Features.sign_in', 'en', NEW.user_id, NULL, NEW.ip);
  EXCEPTION WHEN OTHERS THEN
    v_status := NULL;  -- fail-open
  END;

  IF v_status IS NOT NULL THEN
    RAISE EXCEPTION 'AX_SIGNIN_GATE:%', v_status USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS gate_new_session ON auth.sessions;
CREATE TRIGGER gate_new_session
  BEFORE INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.gate_new_session();
