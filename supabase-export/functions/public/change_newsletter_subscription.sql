-- schema:   public
-- function: change_newsletter_subscription(p_email text)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.change_newsletter_subscription(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_subscribed boolean;
    v_clean_email   text;
BEGIN
    -- Normalise: trim whitespace and lowercase
    v_clean_email := LOWER(TRIM(p_email));

    -- Guard: must be a non-empty string after normalisation
    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('status', 'NewsletterStatus.error');
    END IF;

    -- Guard: basic email format check
    IF v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RETURN jsonb_build_object('status', 'NewsletterStatus.invalid_email');
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM newsletter_table
        WHERE newsletter_email = v_clean_email
    ) INTO v_is_subscribed;

    IF v_is_subscribed THEN
        DELETE FROM newsletter_table
        WHERE newsletter_email = v_clean_email;

        RETURN jsonb_build_object('status', 'NewsletterStatus.unsubscribed');
    ELSE
        INSERT INTO newsletter_table (newsletter_email)
        VALUES (v_clean_email)
        ON CONFLICT ON CONSTRAINT newsletter_table_email_key
        DO NOTHING;

        RETURN jsonb_build_object('status', 'NewsletterStatus.subscribed');
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'NewsletterStatus.error');
END;
$function$

