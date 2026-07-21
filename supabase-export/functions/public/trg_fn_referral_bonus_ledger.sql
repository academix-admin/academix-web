-- schema:   public
-- function: trg_fn_referral_bonus_ledger()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.trg_fn_referral_bonus_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.write_bonus_ledger_entry(
        NEW.redeem_code_id,
        NEW.redeem_code_amount
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'trg_fn_referral_bonus_ledger: failed for code %: %',
            NEW.redeem_code_id, SQLERRM;
        RETURN NEW;
END;
$function$

