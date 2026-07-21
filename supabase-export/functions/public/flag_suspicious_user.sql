-- schema:   public
-- function: flag_suspicious_user()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.flag_suspicious_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.risk_score >= 70 THEN
    INSERT INTO suspicious_activities (
      user_id,
      activity_type,
      description,
      severity,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.action,
      'High risk score detected: ' || NEW.risk_score || '. Reasons: ' || array_to_string(NEW.reasons, ', '),
      CASE 
        WHEN NEW.risk_score >= 90 THEN 'critical'
        WHEN NEW.risk_score >= 70 THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'fraud_log_id', NEW.id,
        'risk_score', NEW.risk_score,
        'reasons', NEW.reasons
      )
    );
  END IF;
  RETURN NEW;
END;
$function$

