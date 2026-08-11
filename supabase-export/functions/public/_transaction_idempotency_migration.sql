-- =====================================================================================
-- Idempotency key on transaction_table (ACADEMIX_PLAN Part VI, Q4).
--
-- WHY
-- Double-charge is currently prevented by pessimistic locking inside the charge functions
-- (charge_user_quiz_pool / commit_quiz_pool_entry use FOR UPDATE plus single-use guards). That is
-- the right layer, but it guards the *balance* — it does not make a duplicated REQUEST provably
-- impossible. A network retry or a double-tap can still create two distinct transactions.
--
-- transaction_security_hash_key does NOT cover this: it authenticates a retry of an ALREADY-created
-- transaction's credit leg (see get_transaction_for_credit_retry), not the initial creation.
--
-- This matters more since the PIN/transport retry budgets were lengthened (Part V, S11) — more
-- automatic retries means more chances to submit the same intent twice.
--
-- DESIGN
-- The key identifies a payment INTENT, not an attempt: the client generates one UUID when the user
-- commits to a payment and reuses it across every retry of that same intent. A second insert with
-- the same key then fails on the unique index instead of creating a second transaction — the
-- guarantee is enforced by the database, not by application discipline.
--
-- Nullable + PARTIAL index, deliberately: 4,311 existing rows predate the key and must stay valid,
-- and the partial predicate keeps the index to only the rows that carry one. (Postgres treats NULLs
-- as distinct in a unique index anyway, so this is about size and intent, not correctness.)
--
-- This migration is PHASE 1 — the database guarantee. Phase 2 (clients sending the key, and the
-- endpoint returning the ORIGINAL result on conflict rather than an error) is tracked in Part VI Q4.
-- Until phase 2 ships this column is simply unused, which is why phase 1 is safe to deploy alone.
-- =====================================================================================

ALTER TABLE public.transaction_table
  ADD COLUMN IF NOT EXISTS transaction_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS transaction_idempotency_key_uidx
  ON public.transaction_table (transaction_idempotency_key)
  WHERE transaction_idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.transaction_table.transaction_idempotency_key IS
  'Client-generated UUID identifying a payment INTENT (stable across retries of that intent). '
  'Unique among non-null values, so a replayed request cannot create a second transaction. '
  'Null for rows created before this was introduced.';
