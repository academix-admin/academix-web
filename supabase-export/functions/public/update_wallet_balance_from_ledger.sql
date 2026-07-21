-- schema:   public
-- function: update_wallet_balance_from_ledger()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_wallet_balance_from_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_principal_delta   NUMERIC := 0;
    v_profit_delta      NUMERIC := 0;
BEGIN
    CASE NEW.transaction_type
 
        -- ── User liability ────────────────────────────────────────────────
        WHEN 'top_up'       THEN v_principal_delta := NEW.gross_amount;
        WHEN 'withdraw'     THEN v_principal_delta := NEW.gross_amount;
 
        -- ── Platform profit ───────────────────────────────────────────────
        WHEN 'profit'       THEN v_profit_delta    := NEW.our_profit_amount;
        WHEN 'buy_in'       THEN v_profit_delta    := NEW.gross_amount;
        WHEN 'fee'          THEN v_profit_delta    := NEW.gross_amount;   -- negative
 
        -- ── Admin cash flows ──────────────────────────────────────────────
        WHEN 'deposit'      THEN v_profit_delta    := NEW.gross_amount;   -- positive
        WHEN 'cashout'      THEN v_profit_delta    := NEW.gross_amount;   -- negative
 
        -- ── ADC treasury ──────────────────────────────────────────────────
        WHEN 'quiz'         THEN v_profit_delta    := NEW.gross_amount;   -- positive
        WHEN 'bonus'        THEN v_profit_delta    := NEW.gross_amount;   -- negative
 
        -- ── Giveback feature ──────────────────────────────────────────────
        --  giveback:     platform reserves ADC for user quiz payments (negative)
        --  contribution: external party funds the giveback upfront (positive)
        --                mirrors 'deposit' semantics exactly
        WHEN 'giveback'     THEN v_profit_delta    := NEW.gross_amount;   -- negative
        WHEN 'contribution' THEN v_profit_delta    := NEW.gross_amount;   -- positive
 
        ELSE
            RAISE NOTICE 'update_wallet_balance_from_ledger: unrecognised type [%] for ledger row %',
                NEW.transaction_type, NEW.wallet_ledger_id;
            RETURN NEW;
    END CASE;
 
    INSERT INTO public.wallet_balance_table (
        payment_wallet_id,
        currency,
        user_principal,
        our_profit,
        wallet_balance,
        updated_at
    )
    VALUES (
        NEW.payment_wallet_id,
        NEW.currency,
        GREATEST(0, v_principal_delta),
        GREATEST(0, v_profit_delta),
        GREATEST(0, v_principal_delta + v_profit_delta),
        now()
    )
    ON CONFLICT (payment_wallet_id) DO UPDATE
        SET user_principal  = wallet_balance_table.user_principal + v_principal_delta,
            our_profit      = wallet_balance_table.our_profit     + v_profit_delta,
            wallet_balance  = wallet_balance_table.user_principal + v_principal_delta
                            + wallet_balance_table.our_profit     + v_profit_delta,
            updated_at      = now();
 
    RETURN NEW;
 
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'update_wallet_balance_from_ledger error for ledger % wallet %: %',
            NEW.wallet_ledger_id, NEW.payment_wallet_id, SQLERRM;
        RETURN NEW;
END;
$function$

