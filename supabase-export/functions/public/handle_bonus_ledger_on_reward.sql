-- schema:   public
-- function: handle_bonus_ledger_on_reward()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.handle_bonus_ledger_on_reward()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_redeem_code_id UUID;
    v_amount         NUMERIC;
    v_rewarded_old   BOOLEAN;
    v_rewarded_new   BOOLEAN;
    v_ledger_written BOOLEAN;
BEGIN
    IF TG_TABLE_NAME = 'daily_streaks_table' THEN
        v_rewarded_old   := OLD.daily_streaks_rewarded;
        v_rewarded_new   := NEW.daily_streaks_rewarded;
        v_ledger_written := NEW.daily_streaks_ledger_written;
        v_redeem_code_id := NEW.redeem_code_id;
        v_amount         := NEW.daily_streaks_awarded;

    ELSIF TG_TABLE_NAME = 'mission_progress_table' THEN
        v_rewarded_old   := OLD.mission_progress_rewarded;
        v_rewarded_new   := NEW.mission_progress_rewarded;
        v_ledger_written := NEW.mission_progress_ledger_written;
        v_redeem_code_id := NEW.redeem_code_id;
        SELECT redeem_code_amount INTO v_amount
        FROM   public.redeem_code_table
        WHERE  redeem_code_id = NEW.redeem_code_id;

    ELSIF TG_TABLE_NAME = 'achievements_progress_table' THEN
        v_rewarded_old   := OLD.achievements_progress_rewarded;
        v_rewarded_new   := NEW.achievements_progress_rewarded;
        v_ledger_written := NEW.achievements_progress_ledger_written;
        v_redeem_code_id := NEW.redeem_code_id;
        SELECT redeem_code_amount INTO v_amount
        FROM   public.redeem_code_table
        WHERE  redeem_code_id = NEW.redeem_code_id;

    ELSE
        RETURN NEW;
    END IF;

    IF v_rewarded_old = TRUE OR v_rewarded_new = FALSE THEN RETURN NEW; END IF;
    IF v_ledger_written = TRUE THEN RETURN NEW; END IF;
    IF v_redeem_code_id IS NULL THEN
        RAISE NOTICE 'handle_bonus_ledger_on_reward: no redeem_code_id on %, skipping', TG_TABLE_NAME;
        RETURN NEW;
    END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE NOTICE 'handle_bonus_ledger_on_reward: invalid amount (%) on %, skipping', v_amount, TG_TABLE_NAME;
        RETURN NEW;
    END IF;

    BEGIN
        PERFORM public.write_bonus_ledger_entry(v_redeem_code_id, v_amount);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'handle_bonus_ledger_on_reward: write_bonus_ledger_entry failed on %: %',
                TG_TABLE_NAME, SQLERRM;
            RETURN NEW;
    END;

    IF TG_TABLE_NAME = 'daily_streaks_table' THEN
        NEW.daily_streaks_ledger_written := TRUE;
    ELSIF TG_TABLE_NAME = 'mission_progress_table' THEN
        NEW.mission_progress_ledger_written := TRUE;
    ELSIF TG_TABLE_NAME = 'achievements_progress_table' THEN
        NEW.achievements_progress_ledger_written := TRUE;
    END IF;

    RETURN NEW;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'handle_bonus_ledger_on_reward: unexpected error on %: %', TG_TABLE_NAME, SQLERRM;
        RETURN NEW;
END;
$function$

