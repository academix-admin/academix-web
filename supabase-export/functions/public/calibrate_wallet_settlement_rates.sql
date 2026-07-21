-- schema:   public
-- function: calibrate_wallet_settlement_rates()
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.calibrate_wallet_settlement_rates()
 RETURNS TABLE(out_wallet_id uuid, out_currency text, out_observed_rate numeric, out_total_topups bigint, out_settled_within_sla bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH topup_settlement AS (
        SELECT
            pm.payment_wallet_id                                AS ts_wallet_id,
            pw.payment_wallet_currency                          AS ts_currency,
            COALESCE(pw.wallet_settlement_hours, 24)           AS ts_sla_hours,
            EXTRACT(EPOCH FROM (
                tt.transaction_updated_at
                - tt.transaction_created_at::TIMESTAMPTZ
            )) / 3600.0                                        AS ts_lag_hours
        FROM public.transaction_table tt
        JOIN public.payment_profile_table pp
            ON pp.payment_profile_id = tt.payment_profile_sender_id
        JOIN public.payment_method_table pm
            ON pm.payment_method_id = pp.payment_method_id
        JOIN public.payment_wallet_table pw
            ON pw.payment_wallet_id = pm.payment_wallet_id
        WHERE tt.transaction_type         IN (
                  'TransactionType.top_up',
                  'TransactionType.buy_in'
              )
          AND tt.transaction_sender_status = 'TransactionStatus.success'
          AND tt.transaction_created_at::TIMESTAMPTZ >= NOW() - INTERVAL '30 days'
    ),
    rates AS (
        SELECT
            ts_wallet_id,
            ts_currency,
            COUNT(*)                                                        AS r_total,
            COUNT(*) FILTER (WHERE ts_lag_hours <= ts_sla_hours)           AS r_settled,
            GREATEST(0.30,
                LEAST(0.95,
                    COUNT(*) FILTER (WHERE ts_lag_hours <= ts_sla_hours)::NUMERIC
                    / NULLIF(COUNT(*), 0)
                )
            )                                                               AS r_rate
        FROM topup_settlement
        GROUP BY ts_wallet_id, ts_currency
        HAVING COUNT(*) >= 5
    )
    UPDATE public.wallet_balance_table wb
       SET wallet_settlement_rate = r.r_rate,
           updated_at             = NOW()
      FROM rates r
     WHERE wb.payment_wallet_id = r.ts_wallet_id
     RETURNING
        r.ts_wallet_id              AS out_wallet_id,
        r.ts_currency               AS out_currency,
        ROUND(r.r_rate::NUMERIC, 4) AS out_observed_rate,
        r.r_total                   AS out_total_topups,
        r.r_settled                 AS out_settled_within_sla;
END;
$function$

