-- ── Money-table RLS hardening (2026-07-29) ──────────────────────────────────
-- transaction_table + redeem_code_table had authenticated INSERT/UPDATE/DELETE with USING/CHECK = true
-- (any signed-in user could forge/alter/delete transactions or mint redeem codes via PostgREST directly).
-- The only legit writers are the service_role Lambdas (rolbypassrls = true), so writes are now
-- service_role-only. transaction_table SELECT is scoped to the owner (sender/receiver profile).

-- transaction_table: remove blanket authenticated writes
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.transaction_table;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.transaction_table;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.transaction_table;
-- transaction_table: scope reads to the caller's own transactions (was: USING true = read everyone's)
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.transaction_table;
CREATE POLICY "tx_select_own" ON public.transaction_table
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payment_profile_table p
    WHERE p.users_id = auth.uid()
      AND p.payment_profile_id IN (transaction_table.payment_profile_sender_id,
                                   transaction_table.payment_profile_receiver_id)
  ));

-- redeem_code_table: remove blanket authenticated writes (mint/alter/delete codes). SELECT (code lookup)
-- is left intact — claiming requires reading a code by value.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.redeem_code_table;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.redeem_code_table;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.redeem_code_table;
