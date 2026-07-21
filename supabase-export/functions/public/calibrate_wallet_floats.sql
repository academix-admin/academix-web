-- schema:   public
-- function: calibrate_wallet_floats()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.calibrate_wallet_floats()
 RETURNS TABLE(wallet_id uuid, currency text, p95_withdrawal numeric, avg_topup numeric, same_day_credit numeric, settlement_rate numeric, new_float_minimum numeric, new_float_target numeric, days_of_data bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH withdrawal_daily AS (
        SELECT
            pm.payment_wallet_id,
            DATE_TRUNC('day', tt.transaction_created_at::TIMESTAMPTZ)::DATE AS day,
            SUM(ABS(tt.transaction_receiver_amount))           AS daily_gross
        FROM public.transaction_table tt
        JOIN public.payment_profile_table pp
            ON pp.payment_profile_id = tt.payment_profile_receiver_id
        JOIN public.payment_method_table pm
            ON pm.payment_method_id = pp.payment_method_id
        WHERE tt.transaction_type              = 'TransactionType.withdraw'
          AND tt.transaction_receiver_status   = 'TransactionStatus.success'
          AND tt.transaction_created_at::TIMESTAMPTZ >= NOW() - INTERVAL '30 days'
        GROUP BY 1, 2
    ),
    topup_daily AS (
        SELECT
            pm.payment_wallet_id,
            DATE_TRUNC('day', tt.transaction_created_at::TIMESTAMPTZ)::DATE AS day,
            SUM(ABS(tt.transaction_sender_amount))             AS daily_gross
        FROM public.transaction_table tt
        JOIN public.payment_profile_table pp
            ON pp.payment_profile_id = tt.payment_profile_sender_id
        JOIN public.payment_method_table pm
            ON pm.payment_method_id = pp.payment_method_id
        WHERE tt.transaction_type            IN ('TransactionType.top_up', 'TransactionType.buy_in')
          AND tt.transaction_sender_status    = 'TransactionStatus.success'
          AND tt.transaction_created_at::TIMESTAMPTZ >= NOW() - INTERVAL '30 days'
        GROUP BY 1, 2
    ),
    withdrawal_stats AS (
        SELECT
            payment_wallet_id,
            COUNT(*)                                                   AS days_of_data,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY daily_gross)  AS p95_withdrawal,
            AVG(daily_gross)                                           AS avg_withdrawal
        FROM withdrawal_daily
        GROUP BY payment_wallet_id
    ),
    topup_stats AS (
        SELECT
            payment_wallet_id,
            AVG(daily_gross) AS avg_topup
        FROM topup_daily
        GROUP BY payment_wallet_id
    ),
    computed AS (
        SELECT
            ws.payment_wallet_id,
            wb.currency,
            -- Use observed per-corridor settlement rate, fall back to 0.70
            COALESCE(wb.wallet_settlement_rate, 0.70)              AS settlement_rate,
            ws.p95_withdrawal,
            COALESCE(ts.avg_topup, 0)                              AS avg_topup,
            COALESCE(ts.avg_topup, 0)
                * COALESCE(wb.wallet_settlement_rate, 0.70)        AS same_day_credit,
            ws.days_of_data,
            GREATEST(
                ws.p95_withdrawal * 1.5
                    - COALESCE(ts.avg_topup, 0)
                      * COALESCE(wb.wallet_settlement_rate, 0.70),
                GREATEST(ws.p95_withdrawal * 0.10, 500)
            )                                                        AS float_minimum,
            GREATEST(
                ws.p95_withdrawal * 1.5
                    - COALESCE(ts.avg_topup, 0)
                      * COALESCE(wb.wallet_settlement_rate, 0.70),
                GREATEST(ws.p95_withdrawal * 0.10, 500)
            ) * 1.25                                                 AS float_target
        FROM withdrawal_stats ws
        JOIN public.wallet_balance_table wb USING (payment_wallet_id)
        LEFT JOIN topup_stats ts           USING (payment_wallet_id)
        WHERE ws.days_of_data >= 3
    )
    UPDATE public.wallet_balance_table wb
       SET wallet_float_minimum = c.float_minimum,
           wallet_float_target  = c.float_target,
           updated_at           = NOW()
      FROM computed c
     WHERE wb.payment_wallet_id = c.payment_wallet_id
     RETURNING
        c.payment_wallet_id,
        c.currency,
        ROUND(c.p95_withdrawal::NUMERIC,   2),
        ROUND(c.avg_topup::NUMERIC,        2),
        ROUND(c.same_day_credit::NUMERIC,  2),
        ROUND(c.settlement_rate::NUMERIC,  4),
        ROUND(c.float_minimum::NUMERIC,    2),
        ROUND(c.float_target::NUMERIC,     2),
        c.days_of_data;
END;
$function$

