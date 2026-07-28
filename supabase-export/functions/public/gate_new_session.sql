-- schema: public (trigger fn on auth.sessions)
-- Universal sign-in gate: BEFORE INSERT on auth.sessions for EVERY method (password/phone/Google/OAuth).
-- Reuses gate_check (NEW.user_id + NEW.ip); raises to abort a blocked sign-in. FAIL-OPEN.
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
    SELECT status INTO v_status
      FROM public.gate_check('Features.sign_in', 'en', NEW.user_id, NULL, NEW.ip);
  EXCEPTION WHEN OTHERS THEN
    v_status := NULL;  -- fail-open: a gate error must never block sign-in
  END;

  IF v_status IS NOT NULL THEN
    -- Aborts the INSERT → GoTrue fails the sign-in → no session exists.
    RAISE EXCEPTION 'AX_SIGNIN_GATE:%', v_status USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$
;

DROP TRIGGER IF EXISTS gate_new_session ON auth.sessions;
CREATE TRIGGER gate_new_session
  BEFORE INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.gate_new_session();
