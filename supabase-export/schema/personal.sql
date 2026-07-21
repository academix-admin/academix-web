-- Schema: personal
-- Project: iewqfmkngcgayxbbnpiz  (read-only mirror via Management API)
-- NOTE: functions live in ../functions/personal/*.sql

CREATE SCHEMA IF NOT EXISTS personal;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE personal.users_balance_table (
  users_balance_amount numeric NOT NULL DEFAULT 0.0,
  users_balance_updated_at text NOT NULL DEFAULT now(),
  users_balance_created_at text NOT NULL DEFAULT now(),
  users_id uuid NOT NULL,
  users_balance_referral_block timestamp with time zone
);

CREATE TABLE personal.users_login_pin_table (
  users_id uuid NOT NULL,
  pin_hash text,
  users_login_pin_created_at text NOT NULL DEFAULT now(),
  users_login_pin_updated_at text DEFAULT now(),
  failed_attempts integer DEFAULT 0,
  locked_until timestamp with time zone
);

-- ============================================================
-- CONSTRAINTS (PK, UNIQUE, CHECK, FK)
-- ============================================================

ALTER TABLE personal.users_balance_table ADD CONSTRAINT users_balance_table_pkey PRIMARY KEY (users_id);

ALTER TABLE personal.users_login_pin_table ADD CONSTRAINT users_login_pin_table_pkey PRIMARY KEY (users_id);

ALTER TABLE personal.users_balance_table ADD CONSTRAINT users_balance_table_users_id_fkey1 FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE personal.users_balance_table ADD CONSTRAINT users_balance_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE personal.users_login_pin_table ADD CONSTRAINT users_login_pin_table_users_id_fkey1 FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE personal.users_login_pin_table ADD CONSTRAINT users_login_pin_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE personal.users_balance_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE personal.users_login_pin_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users only" ON personal.users_balance_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for the authenticated original users only" ON personal.users_login_pin_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = users_id));

CREATE POLICY "Enable select for authenticated original users only" ON personal.users_login_pin_table AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = users_id));

CREATE POLICY "Enable select for authenticated users only" ON personal.users_balance_table AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update for authenticated original users only" ON personal.users_login_pin_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK ((( SELECT auth.uid() AS uid) = users_id));

CREATE POLICY "Enable update for authenticated users only" ON personal.users_balance_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
