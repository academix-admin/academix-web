-- Schema: public
-- Project: iewqfmkngcgayxbbnpiz  (read-only mirror via Management API)
-- NOTE: functions live in ../functions/public/*.sql

CREATE SCHEMA IF NOT EXISTS public;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE public."Pools" AS ENUM ('created', 'open');

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.external_transaction_ref_seq;

CREATE SEQUENCE IF NOT EXISTS public.internal_transaction_ref_seq;

CREATE SEQUENCE IF NOT EXISTS public.sort_id_counter;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.achievements_progress_table (
  achievements_progress_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_id uuid NOT NULL,
  achievements_id uuid NOT NULL,
  achievements_progress_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  achievements_progress_completed boolean NOT NULL DEFAULT false,
  achievements_progress_updated_at text DEFAULT now(),
  achievements_progress_created_at text NOT NULL DEFAULT now(),
  achievements_progress_rewarded boolean NOT NULL DEFAULT false,
  redeem_code_id uuid,
  achievements_progress_ledger_written boolean NOT NULL DEFAULT false
);

CREATE TABLE public.achievements_table (
  achievements_id uuid NOT NULL DEFAULT gen_random_uuid(),
  achievements_type text NOT NULL,
  reward_id uuid NOT NULL,
  achievements_created_at text NOT NULL DEFAULT now(),
  achievements_requirement jsonb NOT NULL,
  achievements_is_active boolean NOT NULL DEFAULT true,
  sort_created_id bigint NOT NULL,
  achievements_description jsonb NOT NULL,
  achievements_title jsonb NOT NULL,
  language_control_old jsonb,
  country_control_old jsonb,
  achievements_image text,
  language_control jsonb,
  country_control jsonb
);

CREATE TABLE public.age_table (
  age_id integer NOT NULL,
  age_visible boolean NOT NULL DEFAULT true,
  age_identity jsonb NOT NULL,
  age_created_at text NOT NULL DEFAULT (now())::text
);

CREATE TABLE public.category_group_table (
  category_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_group_created_at text NOT NULL DEFAULT now(),
  category_group_visible boolean NOT NULL DEFAULT true,
  category_group_updated_at text NOT NULL DEFAULT now(),
  sort_updated_id text NOT NULL DEFAULT tsid(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  category_group_identity jsonb NOT NULL,
  category_group_created_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_group_reviewed_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  age_control jsonb NOT NULL,
  country_control jsonb NOT NULL,
  language_control jsonb NOT NULL,
  gender_control jsonb NOT NULL,
  approval_status jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.challenge_table (
  challenge_id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_visible boolean NOT NULL DEFAULT true,
  challenge_min_participants bigint NOT NULL,
  challenge_points bigint NOT NULL,
  challenge_price numeric NOT NULL,
  challenge_top_share bigint NOT NULL,
  challenge_mid_share bigint NOT NULL,
  challenge_bot_share bigint NOT NULL,
  challenge_created_at text NOT NULL DEFAULT now(),
  challenge_development_charge numeric NOT NULL DEFAULT '20'::numeric,
  challenge_question_count numeric NOT NULL,
  challenge_waiting_time bigint NOT NULL DEFAULT '10'::bigint,
  challenge_extended_time bigint NOT NULL DEFAULT '10'::bigint,
  challenge_starting_time bigint NOT NULL DEFAULT '10'::bigint,
  challenge_max_participants bigint NOT NULL DEFAULT '1'::bigint,
  users_id uuid,
  challenge_identity jsonb NOT NULL,
  challenge_rank bigint NOT NULL,
  game_mode_id uuid NOT NULL,
  challenge_role_share jsonb NOT NULL DEFAULT '{}'::jsonb,
  challenge_creator_share numeric NOT NULL DEFAULT '10'::numeric,
  challenge_reviewer_share numeric NOT NULL DEFAULT '10'::numeric,
  challenge_overhead_time bigint NOT NULL DEFAULT '30'::bigint
);

CREATE TABLE public.country_table (
  country_id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_created_at timestamp with time zone DEFAULT now(),
  country_phone_digit numeric NOT NULL,
  country_phone_code text NOT NULL,
  country_two_iso_code text NOT NULL,
  country_three_iso_code text NOT NULL,
  country_visible boolean NOT NULL DEFAULT true,
  country_identity jsonb NOT NULL,
  country_image text
);

CREATE TABLE public.daily_streaks_table (
  daily_streaks_id uuid NOT NULL DEFAULT gen_random_uuid(),
  daily_streaks_created_at text NOT NULL DEFAULT now(),
  users_id uuid NOT NULL,
  daily_streaks_count bigint NOT NULL,
  daily_streaks_reached boolean NOT NULL DEFAULT false,
  streak_date date NOT NULL DEFAULT CURRENT_DATE,
  daily_streaks_awarded numeric NOT NULL DEFAULT 0.0,
  daily_streaks_rewarded boolean NOT NULL DEFAULT false,
  redeem_code_id uuid,
  daily_streaks_ledger_written boolean NOT NULL DEFAULT false
);

CREATE TABLE public.engagement_levels_table (
  engagement_levels_identity jsonb NOT NULL,
  engagement_levels_max_points numeric NOT NULL,
  engagement_levels_badge_url text,
  engagement_levels_created_at text DEFAULT now(),
  engagement_levels_updated_at text DEFAULT now(),
  engagement_levels_id bigint NOT NULL DEFAULT '1'::bigint
);

CREATE TABLE public.features_table (
  features_id uuid NOT NULL DEFAULT gen_random_uuid(),
  features_active boolean NOT NULL DEFAULT true,
  features_created_at timestamp with time zone NOT NULL DEFAULT now(),
  features_checker text NOT NULL,
  features_identity jsonb NOT NULL,
  country_control jsonb NOT NULL,
  language_control jsonb NOT NULL,
  age_control jsonb NOT NULL,
  gender_control jsonb NOT NULL
);

CREATE TABLE public.fraud_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pool_id uuid,
  device_fingerprint text NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  action text NOT NULL,
  risk_score integer NOT NULL DEFAULT 0,
  allowed boolean NOT NULL DEFAULT true,
  reasons text[],
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.game_mode_table (
  game_mode_id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_mode_identity jsonb,
  game_mode_created_at text NOT NULL DEFAULT now(),
  game_mode_checker text
);

CREATE TABLE public.gender_table (
  gender_id text NOT NULL,
  gender_visible boolean NOT NULL DEFAULT true,
  gender_identity jsonb NOT NULL,
  gender_created_at text NOT NULL DEFAULT (now())::text
);

CREATE TABLE public.giveback_table (
  giveback_id uuid NOT NULL DEFAULT gen_random_uuid(),
  giveback_code text NOT NULL,
  giveback_unit_amount numeric NOT NULL,
  giveback_total_usage integer NOT NULL,
  giveback_total_amount numeric DEFAULT (giveback_unit_amount * (giveback_total_usage)::numeric),
  giveback_password text,
  redeem_code_rule_id uuid,
  giveback_identifier text,
  giveback_created_at text NOT NULL DEFAULT now(),
  age_control jsonb NOT NULL DEFAULT '{}'::jsonb,
  country_control jsonb NOT NULL DEFAULT '{}'::jsonb,
  language_control jsonb NOT NULL DEFAULT '{}'::jsonb,
  gender_control jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_created_id text NOT NULL DEFAULT tsid()
);

CREATE TABLE public.language_table (
  language_id uuid NOT NULL DEFAULT gen_random_uuid(),
  language_created_at timestamp with time zone NOT NULL DEFAULT now(),
  language_code text NOT NULL,
  language_identity jsonb NOT NULL,
  age_control_old jsonb NOT NULL,
  gender_control_old jsonb NOT NULL,
  language_visible boolean NOT NULL DEFAULT true,
  age_control jsonb NOT NULL,
  gender_control jsonb NOT NULL
);

CREATE TABLE public.media_operation_table (
  media_operation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_id uuid NOT NULL DEFAULT gen_random_uuid(),
  media_operation_type text NOT NULL,
  media_operation_created_at text NOT NULL DEFAULT now(),
  media_operation_path text
);

CREATE TABLE public.mission_progress_table (
  mission_progress_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  mission_progress_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  mission_progress_completed boolean NOT NULL DEFAULT false,
  mission_progress_updated_at text DEFAULT now(),
  mission_progress_created_at text NOT NULL DEFAULT now(),
  mission_progress_rewarded boolean NOT NULL DEFAULT false,
  redeem_code_id uuid,
  mission_progress_ledger_written boolean NOT NULL DEFAULT false
);

CREATE TABLE public.mission_table (
  mission_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_type text NOT NULL,
  mission_created_at text NOT NULL DEFAULT now(),
  mission_requirement jsonb NOT NULL,
  reward_id uuid NOT NULL,
  mission_is_active boolean NOT NULL DEFAULT true,
  sort_created_id bigint NOT NULL,
  mission_title jsonb NOT NULL,
  mission_description jsonb NOT NULL,
  country_control_old jsonb,
  language_control_old jsonb,
  mission_image text,
  country_control jsonb NOT NULL,
  language_control jsonb NOT NULL
);

CREATE TABLE public.newsletter_table (
  newsletter_id uuid NOT NULL DEFAULT gen_random_uuid(),
  newsletter_email text NOT NULL,
  newsletter_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.option_tracker_table (
  option_tracker_id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_tracker_id uuid NOT NULL,
  options_id uuid NOT NULL,
  option_tracker_created_at text NOT NULL DEFAULT now(),
  option_tracker_identity text
);

CREATE TABLE public.options_table (
  options_id uuid NOT NULL DEFAULT gen_random_uuid(),
  options_is_correct boolean NOT NULL DEFAULT false,
  questions_id uuid NOT NULL,
  options_created_at text NOT NULL DEFAULT now(),
  options_min numeric,
  options_max numeric,
  options_unit text,
  options_identity jsonb NOT NULL,
  options_image text
);

CREATE TABLE public.payment_details_table (
  payment_details_id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  network text,
  fullname text NOT NULL DEFAULT '''Academix Customer''::text'::text,
  email text NOT NULL DEFAULT 'customer@academix.com'::text,
  country text,
  private_account boolean,
  bank_code text,
  account_number text,
  e_naira boolean,
  direct_debit boolean,
  bank_name text,
  opay boolean
);

CREATE TABLE public.payment_method_table (
  payment_method_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_wallet_id uuid NOT NULL,
  payment_method_sell_active boolean NOT NULL DEFAULT true,
  payment_method_buy_active boolean NOT NULL DEFAULT true,
  payment_method_checker text NOT NULL,
  payment_method_created_at text NOT NULL DEFAULT now(),
  payment_method_sell_limit numeric,
  payment_method_buy_limit numeric,
  sort_created_id text NOT NULL DEFAULT tsid(),
  payment_method_identity jsonb NOT NULL,
  payment_method_image text,
  payment_method_buy_multiple boolean NOT NULL DEFAULT true,
  payment_method_sell_multiple boolean NOT NULL DEFAULT true,
  payment_method_network jsonb[] NOT NULL DEFAULT '{}'::jsonb[],
  payment_method_time_out bigint NOT NULL DEFAULT '300'::bigint,
  age_control jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.payment_profile_table (
  users_id uuid,
  payment_method_id uuid NOT NULL,
  payment_profile_created_at text NOT NULL DEFAULT now(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  payment_profile_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_profile_receiver boolean NOT NULL DEFAULT false,
  payment_profile_sell_active boolean NOT NULL DEFAULT false,
  payment_profile_buy_active boolean NOT NULL DEFAULT false,
  payment_details_id uuid
);

CREATE TABLE public.payment_wallet_table (
  payment_wallet_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_wallet_currency text NOT NULL,
  payment_wallet_buy_rate numeric NOT NULL,
  payment_wallet_sell_rate numeric NOT NULL,
  payment_wallet_buy_active boolean NOT NULL DEFAULT true,
  payment_wallet_sell_active boolean NOT NULL DEFAULT true,
  payment_wallet_buy_min numeric NOT NULL,
  payment_wallet_sell_min numeric NOT NULL,
  payment_wallet_created_at text NOT NULL DEFAULT now(),
  payment_wallet_identity text NOT NULL,
  sort_created_id text NOT NULL DEFAULT tsid(),
  payment_wallet_image text,
  payment_wallet_buy_fee numeric NOT NULL DEFAULT '0'::numeric,
  payment_wallet_sell_fee numeric NOT NULL DEFAULT '0'::numeric,
  payment_wallet_buy_rate_type text NOT NULL DEFAULT 'RateType.FEE'::text,
  payment_wallet_sell_rate_type text NOT NULL DEFAULT 'RateType.FEE'::text,
  country_id uuid,
  payment_wallet_updated_at text,
  payment_wallet_buy_max numeric NOT NULL,
  payment_wallet_sell_max numeric NOT NULL,
  payment_wallet_buy_fee_flat numeric NOT NULL DEFAULT 0,
  payment_wallet_sell_fee_flat numeric NOT NULL DEFAULT 0,
  wallet_settlement_hours integer NOT NULL DEFAULT 24
);

CREATE TABLE public.personalized_table (
  personalized_id uuid NOT NULL DEFAULT gen_random_uuid(),
  personalized_created_at text NOT NULL DEFAULT now(),
  users_id uuid NOT NULL,
  topics_id uuid
);

CREATE TABLE public.platform_config_table (
  config_key text NOT NULL,
  config_value text NOT NULL,
  config_note text
);

CREATE TABLE public.pools_members_table (
  pools_members_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_id uuid NOT NULL,
  pools_id uuid NOT NULL,
  pools_members_created_at text NOT NULL DEFAULT now(),
  pools_members_rank bigint NOT NULL DEFAULT '0'::bigint,
  pools_completed_question_tracker_size bigint NOT NULL DEFAULT '0'::bigint,
  pools_members_price numeric NOT NULL DEFAULT '0'::numeric,
  pools_members_points numeric NOT NULL DEFAULT '0'::numeric,
  redeemable_id uuid,
  transaction_id uuid,
  sort_created_id text NOT NULL DEFAULT tsid(),
  pools_completed_question_tracker_time numeric NOT NULL DEFAULT 0.0,
  pools_members_paid_amount numeric,
  pools_members_category text NOT NULL DEFAULT 'Position.none'::text
);

CREATE TABLE public.pools_question_table (
  pools_question_id uuid NOT NULL DEFAULT gen_random_uuid(),
  pools_id uuid NOT NULL,
  questions_id uuid NOT NULL,
  pools_question_created_at text NOT NULL DEFAULT now(),
  users_id uuid NOT NULL
);

CREATE TABLE public.pools_table (
  pools_id uuid NOT NULL DEFAULT gen_random_uuid(),
  topics_id uuid NOT NULL,
  pools_created_at text NOT NULL DEFAULT now(),
  challenge_id uuid NOT NULL,
  pools_starting_at text,
  pools_duration bigint,
  pools_status text NOT NULL DEFAULT 'Pools.open'::text,
  pools_job text,
  pools_visible boolean NOT NULL DEFAULT true,
  pools_job_end_at text,
  sort_created_id text NOT NULL DEFAULT tsid(),
  sort_updated_id text NOT NULL DEFAULT tsid(),
  pools_code text NOT NULL DEFAULT generate_pool_code(),
  pools_auth text NOT NULL DEFAULT 'PoolAuth.public'::text,
  pools_allow_submission boolean NOT NULL DEFAULT false,
  pools_graded_at text,
  pools_ranked_at text,
  pools_rewarded_at text,
  pools_completed_at text,
  pools_locale text NOT NULL DEFAULT 'en'::text,
  pools_paid_at text,
  pools_gamified_at text,
  pools_ledger_written_at timestamp with time zone,
  pools_contributors_paid numeric,
  pools_members_paid numeric,
  pools_total_amount numeric,
  pools_dev_charge numeric,
  pools_platform_kept numeric,
  pools_password text
);

CREATE TABLE public.question_time_table (
  question_time_id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_time_created_at text NOT NULL DEFAULT now(),
  question_time_value bigint NOT NULL
);

CREATE TABLE public.question_tracker_table (
  question_tracker_id uuid NOT NULL DEFAULT gen_random_uuid(),
  pools_question_id uuid NOT NULL,
  users_id uuid NOT NULL,
  question_tracker_time_taken numeric NOT NULL,
  question_tracker_question_status text NOT NULL DEFAULT 'Question.submitted'::text,
  question_tracker_created_at text NOT NULL DEFAULT now(),
  question_tracker_updated_at text NOT NULL DEFAULT now(),
  sort_updated_id text DEFAULT tsid(),
  sort_created_id text DEFAULT tsid()
);

CREATE TABLE public.question_type_table (
  question_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_type_created_at text NOT NULL DEFAULT now(),
  question_type_available boolean NOT NULL DEFAULT true,
  question_type_local_identity text NOT NULL,
  question_type_identity jsonb NOT NULL
);

CREATE TABLE public.questions_table (
  questions_id uuid NOT NULL DEFAULT gen_random_uuid(),
  topics_id uuid NOT NULL,
  questions_created_at text NOT NULL DEFAULT now(),
  questions_updated_at text NOT NULL DEFAULT now(),
  question_time_id uuid NOT NULL,
  category_group_id uuid NOT NULL,
  question_type_id uuid NOT NULL,
  questions_visible boolean NOT NULL DEFAULT true,
  topic_category_id uuid NOT NULL,
  sort_updated_id text NOT NULL DEFAULT tsid(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  questions_identity jsonb NOT NULL,
  questions_image text,
  questions_created_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  questions_reviewed_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  country_control jsonb NOT NULL,
  language_control jsonb NOT NULL,
  age_control jsonb NOT NULL,
  gender_control jsonb NOT NULL,
  approval_status jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.redeem_code_rule_table (
  redeem_code_rule_id uuid NOT NULL DEFAULT gen_random_uuid(),
  redeem_code_rule_top boolean NOT NULL DEFAULT false,
  redeem_code_rule_mid boolean NOT NULL DEFAULT false,
  redeem_code_rule_bot boolean NOT NULL DEFAULT false,
  redeem_code_rule_rank1 boolean NOT NULL DEFAULT false,
  redeem_code_rule_rank2 boolean NOT NULL DEFAULT false,
  redeem_code_rule_rank3 boolean NOT NULL DEFAULT false,
  redeem_code_rule_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.redeem_code_table (
  redeem_code_id uuid NOT NULL DEFAULT gen_random_uuid(),
  redeem_code_value text NOT NULL,
  redeem_code_amount bigint NOT NULL,
  redeem_code_expires timestamp with time zone,
  redeem_code_active boolean NOT NULL DEFAULT true,
  users_id uuid NOT NULL,
  redeem_code_created_at text NOT NULL DEFAULT now(),
  redeem_code_visible boolean NOT NULL DEFAULT true,
  redeem_code_rule_id uuid,
  sort_created_id text NOT NULL DEFAULT tsid(),
  giveback_id uuid,
  redeem_code_description text NOT NULL DEFAULT 'REDEEM CODE'::text,
  redeem_code_source text
);

CREATE TABLE public.redeemable_table (
  redeemable_id uuid NOT NULL DEFAULT gen_random_uuid(),
  redeem_code_id uuid NOT NULL,
  users_id uuid NOT NULL,
  redeemable_status text NOT NULL,
  redeemable_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.redirect_consume_table (
  redirect_consume_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_id uuid,
  redirect_link_id text NOT NULL,
  redirect_consume_used boolean DEFAULT false,
  redirect_consume_created_at text NOT NULL DEFAULT now(),
  redirect_consume_expires_at text,
  redirect_consume_query text
);

CREATE TABLE public.redirect_link_table (
  redirect_link_id text NOT NULL,
  redirect_link_value text NOT NULL,
  created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.reports_table (
  reports_id uuid NOT NULL DEFAULT gen_random_uuid(),
  reports_type text NOT NULL,
  reports_activity text NOT NULL,
  reports_by uuid NOT NULL,
  reports_user_involved uuid NOT NULL,
  reports_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.reward_table (
  reward_id uuid NOT NULL DEFAULT gen_random_uuid(),
  reward_created_at text NOT NULL DEFAULT now(),
  reward_value numeric NOT NULL,
  reward_limit bigint,
  reward_type text NOT NULL,
  reward_expires_hour bigint,
  reward_instruction jsonb NOT NULL
);

CREATE TABLE public.roles_table (
  roles_id uuid NOT NULL DEFAULT gen_random_uuid(),
  roles_created_at text NOT NULL DEFAULT now(),
  roles_is_public boolean NOT NULL DEFAULT false,
  roles_checker text NOT NULL,
  roles_identity jsonb NOT NULL,
  roles_level integer NOT NULL,
  roles_is_personal_entry boolean NOT NULL DEFAULT true,
  roles_access jsonb NOT NULL DEFAULT '{}'::jsonb,
  roles_buy_in numeric,
  roles_perks jsonb NOT NULL DEFAULT '{}'::jsonb,
  roles_streak_amount numeric NOT NULL DEFAULT 0,
  roles_streak_duration integer NOT NULL DEFAULT 30,
  roles_streak_expires integer NOT NULL DEFAULT 24
);

CREATE TABLE public.suspicious_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.topic_category_table (
  topic_category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  topic_category_visible boolean NOT NULL DEFAULT true,
  topic_category_created_at text NOT NULL DEFAULT now(),
  category_group_id uuid NOT NULL,
  topic_category_updated_at text NOT NULL DEFAULT now(),
  sort_updated_id text NOT NULL DEFAULT tsid(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  topic_category_identity jsonb NOT NULL,
  topic_category_image text,
  topic_category_created_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_category_reviewed_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  country_control jsonb NOT NULL,
  language_control jsonb NOT NULL,
  age_control jsonb NOT NULL,
  gender_control jsonb NOT NULL,
  approval_status jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.topic_settings_table (
  topic_settings_id uuid NOT NULL DEFAULT gen_random_uuid(),
  topic_category_id uuid,
  users_id uuid NOT NULL,
  topic_settings_created_at text NOT NULL DEFAULT now(),
  topic_settings_updated_at text NOT NULL DEFAULT now(),
  topic_is_favourite boolean NOT NULL DEFAULT false,
  topic_is_recent boolean NOT NULL DEFAULT false,
  topics_id uuid,
  sort_updated_id text NOT NULL DEFAULT tsid(),
  sort_created_id text NOT NULL DEFAULT tsid()
);

CREATE TABLE public.topics_metrics_table (
  topics_metrics_id uuid NOT NULL DEFAULT gen_random_uuid(),
  topics_id uuid NOT NULL,
  topics_metrics_is_liked boolean,
  topics_metrics_is_commented boolean,
  topics_metrics_rating numeric,
  users_id uuid NOT NULL,
  topics_metrics_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.topics_table (
  topics_id uuid NOT NULL DEFAULT gen_random_uuid(),
  topics_created_at text NOT NULL DEFAULT now(),
  topics_visible boolean NOT NULL DEFAULT true,
  topic_category_id uuid NOT NULL,
  category_group_id uuid NOT NULL,
  topics_updated_at text NOT NULL DEFAULT now(),
  sort_updated_id text NOT NULL DEFAULT tsid(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  topics_identity jsonb NOT NULL,
  topics_image text,
  topics_created_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  topics_reviewed_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  country_control jsonb NOT NULL,
  language_control jsonb NOT NULL,
  age_control jsonb NOT NULL,
  gender_control jsonb NOT NULL,
  approval_status jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.transaction_table (
  transaction_id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_sender_amount numeric NOT NULL,
  transaction_sender_rate numeric NOT NULL,
  transaction_created_at text NOT NULL DEFAULT now(),
  transaction_sender_status text NOT NULL DEFAULT 'TransactionStatus.pending'::text,
  payment_profile_sender_id uuid NOT NULL,
  payment_profile_receiver_id uuid NOT NULL,
  transaction_type text NOT NULL,
  transaction_receiver_amount numeric NOT NULL,
  transaction_sender_reference text NOT NULL DEFAULT generate_transaction_internal_ref(),
  transaction_receiver_reference text NOT NULL DEFAULT generate_transaction_external_ref(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  transaction_fee numeric NOT NULL,
  transaction_receiver_rate numeric NOT NULL,
  pools_id uuid,
  transaction_receiver_status text NOT NULL DEFAULT 'TransactionStatus.pending'::text,
  users_balance_old_amount numeric NOT NULL,
  users_balance_new_amount numeric NOT NULL,
  transaction_external_id text,
  transaction_service text,
  transaction_ledger_status text,
  transaction_ledger_retries smallint NOT NULL DEFAULT 0,
  transaction_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  transaction_external_fee numeric,
  transaction_balance_written boolean NOT NULL DEFAULT false,
  transaction_retry_status boolean NOT NULL DEFAULT false,
  transaction_security_hash_key text
);

CREATE TABLE public.user_engagement_progress_table (
  users_id uuid NOT NULL DEFAULT gen_random_uuid(),
  pools_id uuid NOT NULL,
  user_engagement_progress_points numeric NOT NULL DEFAULT 0.0,
  user_engagement_progress_questions bigint NOT NULL DEFAULT '0'::bigint,
  user_engagement_progress_quiz_count bigint NOT NULL DEFAULT '0'::bigint,
  user_engagement_progress_created_at text NOT NULL DEFAULT now(),
  user_engagement_progress_time numeric NOT NULL DEFAULT 0.0,
  user_engagement_progress_win_count bigint NOT NULL DEFAULT '0'::bigint,
  user_engagement_total_questions bigint NOT NULL DEFAULT '0'::bigint,
  user_engagement_total_time bigint NOT NULL DEFAULT '0'::bigint
);

CREATE TABLE public.users_followers_table (
  users_followers_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_creator_id uuid,
  users_id uuid NOT NULL,
  users_followers_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.users_settings_table (
  users_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_settings_created_at text NOT NULL DEFAULT now()
);

CREATE TABLE public.users_table (
  users_id uuid NOT NULL,
  users_username text NOT NULL,
  users_names text NOT NULL,
  users_email text NOT NULL,
  users_dob text NOT NULL,
  users_sex text NOT NULL,
  users_profile_index text,
  roles_id uuid NOT NULL,
  users_active boolean NOT NULL DEFAULT false,
  users_verified boolean NOT NULL DEFAULT false,
  country_id uuid NOT NULL,
  language_id uuid NOT NULL,
  users_created_at text NOT NULL DEFAULT now(),
  users_updated_at text NOT NULL DEFAULT now(),
  users_phone text NOT NULL,
  users_login_type text NOT NULL,
  users_referred_id uuid,
  users_referred_status text NOT NULL DEFAULT 'Referral.none'::text,
  sort_created_id text NOT NULL DEFAULT tsid(),
  users_image text,
  users_roles_access jsonb NOT NULL DEFAULT '{}'::jsonb,
  transaction_id uuid,
  users_activation_at timestamp with time zone
);

CREATE TABLE public.wallet_balance_table (
  payment_wallet_id uuid NOT NULL,
  currency text NOT NULL,
  user_principal numeric NOT NULL DEFAULT 0,
  our_profit numeric NOT NULL DEFAULT 0,
  wallet_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet_float_minimum numeric NOT NULL DEFAULT 0,
  wallet_float_target numeric NOT NULL DEFAULT 0,
  replenish_needed boolean NOT NULL DEFAULT false,
  last_alert_at timestamp with time zone,
  wallet_settlement_rate numeric NOT NULL DEFAULT 0.70
);

CREATE TABLE public.wallet_ledger_table (
  wallet_ledger_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_wallet_id uuid NOT NULL,
  transaction_id uuid,
  transaction_type text NOT NULL,
  gross_amount numeric NOT NULL,
  principal_amount numeric NOT NULL,
  flutterwave_fee_amount numeric NOT NULL,
  our_profit_amount numeric NOT NULL,
  adc_amount numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  method_checker text,
  currency text NOT NULL,
  wallet_ledger_created_at text NOT NULL DEFAULT now(),
  sort_created_id text NOT NULL DEFAULT tsid(),
  pools_id uuid,
  reconciled_at timestamp with time zone,
  redeem_code_id uuid
);

-- ============================================================
-- CONSTRAINTS (PK, UNIQUE, CHECK, FK)
-- ============================================================

ALTER TABLE public.pools_question_table ADD CONSTRAINT pools_question_table_pkey PRIMARY KEY (pools_question_id);

ALTER TABLE public.user_engagement_progress_table ADD CONSTRAINT user_engagement_progress_table_pkey PRIMARY KEY (users_id);

ALTER TABLE public.topic_settings_table ADD CONSTRAINT topic_settings_table_pkey PRIMARY KEY (topic_settings_id);

ALTER TABLE public.wallet_balance_table ADD CONSTRAINT wallet_balance_table_pkey PRIMARY KEY (payment_wallet_id);

ALTER TABLE public.topics_metrics_table ADD CONSTRAINT topics_metrics_table_pkey PRIMARY KEY (topics_metrics_id);

ALTER TABLE public.redirect_consume_table ADD CONSTRAINT redirect_consume_table_pkey PRIMARY KEY (redirect_consume_id);

ALTER TABLE public.topics_table ADD CONSTRAINT topics_table_pkey PRIMARY KEY (topics_id);

ALTER TABLE public.payment_method_table ADD CONSTRAINT payment_method_table_pkey PRIMARY KEY (payment_method_id);

ALTER TABLE public.country_table ADD CONSTRAINT country_table_pkey PRIMARY KEY (country_id);

ALTER TABLE public.redirect_link_table ADD CONSTRAINT redirect_link_table_pkey PRIMARY KEY (redirect_link_id);

ALTER TABLE public.payment_profile_table ADD CONSTRAINT payment_profile_table_pkey PRIMARY KEY (payment_profile_id);

ALTER TABLE public.daily_streaks_table ADD CONSTRAINT daily_streaks_table_2_pkey PRIMARY KEY (daily_streaks_id);

ALTER TABLE public.features_table ADD CONSTRAINT features_table_pkey PRIMARY KEY (features_id);

ALTER TABLE public.wallet_ledger_table ADD CONSTRAINT wallet_ledger_table_pkey PRIMARY KEY (wallet_ledger_id);

ALTER TABLE public.language_table ADD CONSTRAINT language_table_pkey PRIMARY KEY (language_id);

ALTER TABLE public.platform_config_table ADD CONSTRAINT platform_config_table_pkey PRIMARY KEY (config_key);

ALTER TABLE public.achievements_table ADD CONSTRAINT achievements_table_pkey PRIMARY KEY (achievements_id);

ALTER TABLE public.redeem_code_rule_table ADD CONSTRAINT redeem_code_rule_table_pkey PRIMARY KEY (redeem_code_rule_id);

ALTER TABLE public.mission_progress_table ADD CONSTRAINT mission_progress_table_pkey PRIMARY KEY (mission_progress_id);

ALTER TABLE public.mission_table ADD CONSTRAINT mission_table_pkey PRIMARY KEY (mission_id);

ALTER TABLE public.category_group_table ADD CONSTRAINT category_group_table_pkey PRIMARY KEY (category_group_id);

ALTER TABLE public.achievements_progress_table ADD CONSTRAINT achievements_progress_table_pkey PRIMARY KEY (achievements_progress_id);

ALTER TABLE public.option_tracker_table ADD CONSTRAINT option_tracker_table_pkey PRIMARY KEY (option_tracker_id);

ALTER TABLE public.gender_table ADD CONSTRAINT gender_table_pkey PRIMARY KEY (gender_id);

ALTER TABLE public.options_table ADD CONSTRAINT options_table_pkey PRIMARY KEY (options_id);

ALTER TABLE public.game_mode_table ADD CONSTRAINT game_mode_table_pkey PRIMARY KEY (game_mode_id);

ALTER TABLE public.personalized_table ADD CONSTRAINT personalized_table_pkey PRIMARY KEY (personalized_id);

ALTER TABLE public.fraud_logs ADD CONSTRAINT fraud_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_pkey PRIMARY KEY (pools_members_id);

ALTER TABLE public.pools_table ADD CONSTRAINT pools_table_pkey PRIMARY KEY (pools_id);

ALTER TABLE public.suspicious_activities ADD CONSTRAINT suspicious_activities_pkey PRIMARY KEY (id);

ALTER TABLE public.question_time_table ADD CONSTRAINT question_time_table_pkey PRIMARY KEY (question_time_id);

ALTER TABLE public.question_tracker_table ADD CONSTRAINT question_tracker_table_pkey PRIMARY KEY (question_tracker_id);

ALTER TABLE public.newsletter_table ADD CONSTRAINT newsletter_table_pkey PRIMARY KEY (newsletter_id);

ALTER TABLE public.giveback_table ADD CONSTRAINT giveback_table_pkey PRIMARY KEY (giveback_id);

ALTER TABLE public.question_type_table ADD CONSTRAINT question_type_table_pkey PRIMARY KEY (question_type_id);

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_pkey PRIMARY KEY (questions_id);

ALTER TABLE public.age_table ADD CONSTRAINT age_table_pkey PRIMARY KEY (age_id);

ALTER TABLE public.reports_table ADD CONSTRAINT reports_t_pkey PRIMARY KEY (reports_id);

ALTER TABLE public.reward_table ADD CONSTRAINT reward_table_pkey PRIMARY KEY (reward_id);

ALTER TABLE public.payment_details_table ADD CONSTRAINT payment_details_table_pkey PRIMARY KEY (payment_details_id);

ALTER TABLE public.roles_table ADD CONSTRAINT roles_table_pkey PRIMARY KEY (roles_id);

ALTER TABLE public.topic_category_table ADD CONSTRAINT topic_category_table_pkey PRIMARY KEY (topic_category_id);

ALTER TABLE public.transaction_table ADD CONSTRAINT transaction_table_pkey PRIMARY KEY (transaction_id);

ALTER TABLE public.redeem_code_table ADD CONSTRAINT redeem_code_table_pkey PRIMARY KEY (redeem_code_id);

ALTER TABLE public.users_followers_table ADD CONSTRAINT users_followers_table_pkey PRIMARY KEY (users_followers_id);

ALTER TABLE public.redeemable_table ADD CONSTRAINT redeemable_table_pkey PRIMARY KEY (redeemable_id);

ALTER TABLE public.users_settings_table ADD CONSTRAINT users_settings_table_pkey PRIMARY KEY (users_id);

ALTER TABLE public.users_table ADD CONSTRAINT users_table_pkey PRIMARY KEY (users_id);

ALTER TABLE public.engagement_levels_table ADD CONSTRAINT engagement_levels_table_pkey PRIMARY KEY (engagement_levels_id);

ALTER TABLE public.media_operation_table ADD CONSTRAINT media_operation_table_pkey PRIMARY KEY (media_operation_id);

ALTER TABLE public.challenge_table ADD CONSTRAINT challenge_table_pkey PRIMARY KEY (challenge_id);

ALTER TABLE public.payment_wallet_table ADD CONSTRAINT payment_wallet_table_pkey PRIMARY KEY (payment_wallet_id);

ALTER TABLE public.pools_members_table ADD CONSTRAINT unique_pool_member UNIQUE (pools_id, users_id);

ALTER TABLE public.language_table ADD CONSTRAINT language_table_language_code_key UNIQUE (language_code);

ALTER TABLE public.redirect_link_table ADD CONSTRAINT redirect_link_table_redirect_link_value_key UNIQUE (redirect_link_value);

ALTER TABLE public.topic_category_table ADD CONSTRAINT topic_category_table_sort_id_key UNIQUE (sort_updated_id);

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_sort_created_at_key UNIQUE (sort_created_id);

ALTER TABLE public.personalized_table ADD CONSTRAINT personalized_table_users_id_topics_id_key UNIQUE (users_id, topics_id);

ALTER TABLE public.question_tracker_table ADD CONSTRAINT unique_question_user UNIQUE (pools_question_id, users_id);

ALTER TABLE public.topics_table ADD CONSTRAINT topics_table_sort_id_key UNIQUE (sort_updated_id);

ALTER TABLE public.roles_table ADD CONSTRAINT roles_table_roles_checker_key UNIQUE (roles_checker);

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_sort_id_key UNIQUE (sort_updated_id);

ALTER TABLE public.mission_progress_table ADD CONSTRAINT mission_progress_table_users_id_mission_id_key UNIQUE (users_id, mission_id);

ALTER TABLE public.question_time_table ADD CONSTRAINT question_time_table_question_time_value_key UNIQUE (question_time_value);

ALTER TABLE public.topic_category_table ADD CONSTRAINT topic_category_table_sort_created_at_key UNIQUE (sort_created_id);

ALTER TABLE public.newsletter_table ADD CONSTRAINT newsletter_table_email_key UNIQUE (newsletter_email);

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_redeemable_id_key UNIQUE (redeemable_id);

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_transaction_id_key UNIQUE (transaction_id);

ALTER TABLE public.topics_table ADD CONSTRAINT topics_table_sort_created_id_key UNIQUE (sort_created_id);

ALTER TABLE public.pools_table ADD CONSTRAINT pools_table_pools_code_key UNIQUE (pools_code);

ALTER TABLE public.achievements_progress_table ADD CONSTRAINT achievements_progress_table_users_id_mission_id_key UNIQUE (users_id, achievements_id);

ALTER TABLE public.challenge_table ADD CONSTRAINT challenge_table_challenge_rank_key UNIQUE (challenge_rank);

ALTER TABLE public.users_table ADD CONSTRAINT users_table_users_username_key UNIQUE (users_username);

ALTER TABLE public.giveback_table ADD CONSTRAINT giveback_table_code_key UNIQUE (giveback_code);

ALTER TABLE public.features_table ADD CONSTRAINT features_table_features_checker_key UNIQUE (features_checker);

ALTER TABLE public.topic_settings_table ADD CONSTRAINT topic_settings_table_sort_updated_id_key UNIQUE (sort_updated_id);

ALTER TABLE public.redeem_code_table ADD CONSTRAINT redeem_code_table_sort_created_id_key UNIQUE (sort_created_id);

ALTER TABLE public.category_group_table ADD CONSTRAINT category_group_table_sort_id_key UNIQUE (sort_updated_id);

ALTER TABLE public.topic_settings_table ADD CONSTRAINT topic_settings_table_sort_created_id_key UNIQUE (sort_created_id);

ALTER TABLE public.daily_streaks_table ADD CONSTRAINT daily_streaks_table_2_users_id_streak_date_key UNIQUE (users_id, streak_date);

ALTER TABLE public.category_group_table ADD CONSTRAINT category_group_table_sort_created_id_key UNIQUE (sort_created_id);

ALTER TABLE public.engagement_levels_table ADD CONSTRAINT check_positive_points CHECK (((engagement_levels_max_points IS NULL) OR (engagement_levels_max_points >= (0)::numeric)));

ALTER TABLE public.suspicious_activities ADD CONSTRAINT suspicious_activities_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE public.giveback_table ADD CONSTRAINT giveback_unit_amount_positive CHECK ((giveback_unit_amount > (0)::numeric));

ALTER TABLE public.giveback_table ADD CONSTRAINT giveback_total_usage_positive CHECK ((giveback_total_usage > 0));

ALTER TABLE public.fraud_logs ADD CONSTRAINT fraud_logs_action_check CHECK ((action = ANY (ARRAY['join_pool'::text, 'submit_question'::text, 'withdraw'::text])));

ALTER TABLE public.suspicious_activities ADD CONSTRAINT suspicious_activities_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'false_positive'::text])));

ALTER TABLE public.transaction_table ADD CONSTRAINT transaction_ledger_status_check CHECK ((transaction_ledger_status = ANY (ARRAY['pending'::text, 'written'::text, 'failed'::text])));

ALTER TABLE public.giveback_table ADD CONSTRAINT giveback_redeem_code_rule_fkey FOREIGN KEY (redeem_code_rule_id) REFERENCES redeem_code_rule_table(redeem_code_rule_id) ON DELETE SET NULL;

ALTER TABLE public.challenge_table ADD CONSTRAINT challenge_table_game_mode_id_fkey FOREIGN KEY (game_mode_id) REFERENCES game_mode_table(game_mode_id) ON DELETE CASCADE;

ALTER TABLE public.pools_table ADD CONSTRAINT pools_table_topics_id_fkey FOREIGN KEY (topics_id) REFERENCES topics_table(topics_id) ON DELETE CASCADE;

ALTER TABLE public.reports_table ADD CONSTRAINT reports_table_reports_user_involved_fkey FOREIGN KEY (reports_user_involved) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.daily_streaks_table ADD CONSTRAINT daily_streaks_table_redeem_code_id_fkey FOREIGN KEY (redeem_code_id) REFERENCES redeem_code_table(redeem_code_id) ON DELETE CASCADE;

ALTER TABLE public.topic_settings_table ADD CONSTRAINT topic_settings_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.media_operation_table ADD CONSTRAINT media_operation_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.pools_table ADD CONSTRAINT pools_table_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES challenge_table(challenge_id) ON DELETE CASCADE;

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_pools_id_fkey FOREIGN KEY (pools_id) REFERENCES pools_table(pools_id) ON DELETE CASCADE;

ALTER TABLE public.mission_progress_table ADD CONSTRAINT mission_progress_table_redeem_code_id_fkey FOREIGN KEY (redeem_code_id) REFERENCES redeem_code_table(redeem_code_id) ON DELETE CASCADE;

ALTER TABLE public.question_tracker_table ADD CONSTRAINT question_tracker_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.daily_streaks_table ADD CONSTRAINT daily_streaks_table_2_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.mission_table ADD CONSTRAINT mission_table_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES reward_table(reward_id) ON DELETE CASCADE;

ALTER TABLE public.wallet_ledger_table ADD CONSTRAINT wallet_ledger_payment_wallet_fkey FOREIGN KEY (payment_wallet_id) REFERENCES payment_wallet_table(payment_wallet_id);

ALTER TABLE public.wallet_ledger_table ADD CONSTRAINT wallet_ledger_transaction_fkey FOREIGN KEY (transaction_id) REFERENCES transaction_table(transaction_id);

ALTER TABLE public.option_tracker_table ADD CONSTRAINT option_tracker_table_question_tracker_id_fkey FOREIGN KEY (question_tracker_id) REFERENCES question_tracker_table(question_tracker_id) ON DELETE CASCADE;

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_question_time_id_fkey FOREIGN KEY (question_time_id) REFERENCES question_time_table(question_time_id) ON DELETE CASCADE;

ALTER TABLE public.topics_table ADD CONSTRAINT topics_table_topic_category_id_fkey FOREIGN KEY (topic_category_id) REFERENCES topic_category_table(topic_category_id) ON DELETE CASCADE;

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_topics_id_fkey FOREIGN KEY (topics_id) REFERENCES topics_table(topics_id) ON DELETE CASCADE;

ALTER TABLE public.topic_category_table ADD CONSTRAINT topic_category_table_category_group_id_fkey FOREIGN KEY (category_group_id) REFERENCES category_group_table(category_group_id) ON DELETE SET NULL;

ALTER TABLE public.transaction_table ADD CONSTRAINT transaction_table_pools_id_fkey FOREIGN KEY (pools_id) REFERENCES pools_table(pools_id) ON DELETE CASCADE;

ALTER TABLE public.option_tracker_table ADD CONSTRAINT option_tracker_table_options_id_fkey FOREIGN KEY (options_id) REFERENCES options_table(options_id) ON DELETE CASCADE;

ALTER TABLE public.topics_metrics_table ADD CONSTRAINT topic_metrics_table_topics_id_fkey FOREIGN KEY (topics_id) REFERENCES topics_table(topics_id) ON DELETE CASCADE;

ALTER TABLE public.topics_metrics_table ADD CONSTRAINT topic_metrics_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.topic_settings_table ADD CONSTRAINT topic_settings_table_topic_category_id_fkey FOREIGN KEY (topic_category_id) REFERENCES topic_category_table(topic_category_id) ON DELETE CASCADE;

ALTER TABLE public.topic_settings_table ADD CONSTRAINT topic_settings_table_topics_id_fkey FOREIGN KEY (topics_id) REFERENCES topics_table(topics_id) ON DELETE CASCADE;

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_category_group_id_fkey FOREIGN KEY (category_group_id) REFERENCES category_group_table(category_group_id) ON DELETE CASCADE;

ALTER TABLE public.wallet_ledger_table ADD CONSTRAINT wallet_ledger_pools_fkey FOREIGN KEY (pools_id) REFERENCES pools_table(pools_id) ON DELETE SET NULL;

ALTER TABLE public.topics_table ADD CONSTRAINT topics_table_category_group_id_fkey FOREIGN KEY (category_group_id) REFERENCES category_group_table(category_group_id) ON DELETE CASCADE;

ALTER TABLE public.users_table ADD CONSTRAINT users_table_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction_table(transaction_id) ON DELETE SET NULL;

ALTER TABLE public.users_followers_table ADD CONSTRAINT users_followers_table_users_creator_id_fkey FOREIGN KEY (users_creator_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.users_followers_table ADD CONSTRAINT users_followers_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.users_settings_table ADD CONSTRAINT users_settings_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.users_table ADD CONSTRAINT users_table_country_id_fkey FOREIGN KEY (country_id) REFERENCES country_table(country_id) ON DELETE RESTRICT;

ALTER TABLE public.users_table ADD CONSTRAINT users_table_language_id_fkey FOREIGN KEY (language_id) REFERENCES language_table(language_id) ON DELETE RESTRICT;

ALTER TABLE public.users_table ADD CONSTRAINT users_table_roles_id_fkey FOREIGN KEY (roles_id) REFERENCES roles_table(roles_id) ON DELETE RESTRICT;

ALTER TABLE public.users_table ADD CONSTRAINT users_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_profile_table ADD CONSTRAINT payment_profile_table_payment_details_id_fkey FOREIGN KEY (payment_details_id) REFERENCES payment_details_table(payment_details_id) ON DELETE CASCADE;

ALTER TABLE public.wallet_balance_table ADD CONSTRAINT wallet_balance_table_wallet_fkey FOREIGN KEY (payment_wallet_id) REFERENCES payment_wallet_table(payment_wallet_id);

ALTER TABLE public.transaction_table ADD CONSTRAINT transaction_table_payment_profile_sender_id_fkey FOREIGN KEY (payment_profile_sender_id) REFERENCES payment_profile_table(payment_profile_id) ON DELETE CASCADE;

ALTER TABLE public.personalized_table ADD CONSTRAINT personalized_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_question_type_id_fkey FOREIGN KEY (question_type_id) REFERENCES question_type_table(question_type_id) ON DELETE CASCADE;

ALTER TABLE public.user_engagement_progress_table ADD CONSTRAINT user_engagement_progress_table_pools_id_fkey FOREIGN KEY (pools_id) REFERENCES pools_table(pools_id) ON DELETE CASCADE;

ALTER TABLE public.challenge_table ADD CONSTRAINT challenge_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.pools_question_table ADD CONSTRAINT pools_question_table_pools_id_fkey FOREIGN KEY (pools_id) REFERENCES pools_table(pools_id) ON DELETE CASCADE;

ALTER TABLE public.pools_question_table ADD CONSTRAINT pools_question_table_questions_id_fkey FOREIGN KEY (questions_id) REFERENCES questions_table(questions_id) ON DELETE CASCADE;

ALTER TABLE public.pools_question_table ADD CONSTRAINT pools_question_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.redeem_code_table ADD CONSTRAINT redeem_code_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.redeemable_table ADD CONSTRAINT redeemable_table_redeem_code_id_fkey FOREIGN KEY (redeem_code_id) REFERENCES redeem_code_table(redeem_code_id) ON DELETE CASCADE;

ALTER TABLE public.redeemable_table ADD CONSTRAINT redeemable_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.achievements_progress_table ADD CONSTRAINT achievements_progress_table_redeem_code_id_fkey FOREIGN KEY (redeem_code_id) REFERENCES redeem_code_table(redeem_code_id) ON DELETE SET NULL;

ALTER TABLE public.transaction_table ADD CONSTRAINT transaction_table_payment_profile_receiver_id_fkey FOREIGN KEY (payment_profile_receiver_id) REFERENCES payment_profile_table(payment_profile_id) ON DELETE CASCADE;

ALTER TABLE public.personalized_table ADD CONSTRAINT personalized_table_topics_id_fkey FOREIGN KEY (topics_id) REFERENCES topics_table(topics_id) ON DELETE CASCADE;

ALTER TABLE public.questions_table ADD CONSTRAINT questions_table_topic_category_id_fkey FOREIGN KEY (topic_category_id) REFERENCES topic_category_table(topic_category_id) ON DELETE CASCADE;

ALTER TABLE public.redirect_consume_table ADD CONSTRAINT redirect_consume_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.payment_method_table ADD CONSTRAINT payment_method_table_payment_wallet_id_fkey FOREIGN KEY (payment_wallet_id) REFERENCES payment_wallet_table(payment_wallet_id) ON DELETE CASCADE;

ALTER TABLE public.payment_profile_table ADD CONSTRAINT payment_profile_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.payment_profile_table ADD CONSTRAINT payment_profile_table_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES payment_method_table(payment_method_id) ON DELETE CASCADE;

ALTER TABLE public.user_engagement_progress_table ADD CONSTRAINT user_engagement_progress_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.achievements_progress_table ADD CONSTRAINT achievements_progress_table_achievements_id_fkey FOREIGN KEY (achievements_id) REFERENCES achievements_table(achievements_id) ON DELETE CASCADE;

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_redeemable_id_fkey FOREIGN KEY (redeemable_id) REFERENCES redeemable_table(redeemable_id) ON DELETE CASCADE;

ALTER TABLE public.redeem_code_table ADD CONSTRAINT redeem_code_table_redeem_code_rule_id_fkey FOREIGN KEY (redeem_code_rule_id) REFERENCES redeem_code_rule_table(redeem_code_rule_id) ON DELETE CASCADE;

ALTER TABLE public.redirect_consume_table ADD CONSTRAINT redirect_consume_table_redirect_link_id_fkey FOREIGN KEY (redirect_link_id) REFERENCES redirect_link_table(redirect_link_id) ON DELETE CASCADE;

ALTER TABLE public.question_tracker_table ADD CONSTRAINT question_tracker_table_pools_question_id_fkey FOREIGN KEY (pools_question_id) REFERENCES pools_question_table(pools_question_id) ON DELETE CASCADE;

ALTER TABLE public.options_table ADD CONSTRAINT options_table_questions_id_fkey FOREIGN KEY (questions_id) REFERENCES questions_table(questions_id) ON DELETE CASCADE;

ALTER TABLE public.wallet_ledger_table ADD CONSTRAINT wallet_ledger_table_redeem_code_id_fkey FOREIGN KEY (redeem_code_id) REFERENCES redeem_code_table(redeem_code_id) ON DELETE SET NULL;

ALTER TABLE public.users_table ADD CONSTRAINT users_table_users_referred_id_fkey FOREIGN KEY (users_referred_id) REFERENCES users_table(users_id) ON DELETE SET NULL;

ALTER TABLE public.mission_progress_table ADD CONSTRAINT mission_progress_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.mission_progress_table ADD CONSTRAINT mission_progress_table_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES mission_table(mission_id) ON DELETE CASCADE;

ALTER TABLE public.achievements_progress_table ADD CONSTRAINT achievements_progress_table_users_id_fkey FOREIGN KEY (users_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.payment_wallet_table ADD CONSTRAINT payment_wallet_table_country_id_fkey FOREIGN KEY (country_id) REFERENCES country_table(country_id) ON DELETE SET NULL;

ALTER TABLE public.achievements_table ADD CONSTRAINT achievements_table_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES reward_table(reward_id) ON DELETE CASCADE;

ALTER TABLE public.pools_members_table ADD CONSTRAINT pools_members_table_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction_table(transaction_id) ON DELETE CASCADE;

ALTER TABLE public.reports_table ADD CONSTRAINT reports_table_reports_by_fkey FOREIGN KEY (reports_by) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.fraud_logs ADD CONSTRAINT fraud_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.fraud_logs ADD CONSTRAINT fraud_logs_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES pools_table(pools_id) ON DELETE SET NULL;

ALTER TABLE public.suspicious_activities ADD CONSTRAINT suspicious_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users_table(users_id) ON DELETE CASCADE;

ALTER TABLE public.suspicious_activities ADD CONSTRAINT suspicious_activities_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users_table(users_id) ON DELETE SET NULL;

ALTER TABLE public.redeem_code_table ADD CONSTRAINT redeem_code_table_giveback_id_fkey FOREIGN KEY (giveback_id) REFERENCES giveback_table(giveback_id) ON DELETE SET NULL;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_category_group_table_id ON public.category_group_table USING btree (category_group_id);

CREATE INDEX idx_challenge_question_count ON public.challenge_table USING btree (challenge_question_count);

CREATE INDEX idx_followers_creator_id ON public.users_followers_table USING btree (users_creator_id);

CREATE INDEX idx_followers_user_id ON public.users_followers_table USING btree (users_id);

CREATE INDEX idx_followers_users_id ON public.users_followers_table USING btree (users_id) INCLUDE (users_creator_id);

CREATE INDEX idx_fraud_logs_action ON public.fraud_logs USING btree (action);

CREATE INDEX idx_fraud_logs_created_at ON public.fraud_logs USING btree (created_at DESC);

CREATE INDEX idx_fraud_logs_device_fingerprint ON public.fraud_logs USING btree (device_fingerprint);

CREATE INDEX idx_fraud_logs_ip_address ON public.fraud_logs USING btree (ip_address);

CREATE INDEX idx_fraud_logs_pool_id ON public.fraud_logs USING btree (pool_id);

CREATE INDEX idx_fraud_logs_user_id ON public.fraud_logs USING btree (user_id);

CREATE INDEX idx_giveback_code ON public.giveback_table USING btree (giveback_code);

CREATE INDEX idx_giveback_sort ON public.giveback_table USING btree (sort_created_id DESC);

CREATE INDEX idx_newsletter_email ON public.newsletter_table USING btree (newsletter_email);

CREATE INDEX idx_options_table_question_id ON public.options_table USING btree (questions_id);

CREATE INDEX idx_payment_profile_users_id ON public.payment_profile_table USING btree (users_id);

CREATE INDEX idx_personalized_users_id ON public.personalized_table USING btree (users_id) INCLUDE (topics_id);

CREATE INDEX idx_pools_code ON public.pools_table USING btree (pools_code) WHERE ((pools_status = 'Pools.open'::text) AND (pools_visible = true));

CREATE INDEX idx_pools_id_status_locale ON public.pools_table USING btree (pools_id, pools_status, pools_locale) WHERE (pools_status = ANY (ARRAY['Pools.active'::text, 'Pools.open'::text]));

CREATE INDEX idx_pools_members_pool_user ON public.pools_members_table USING btree (pools_id, users_id);

CREATE INDEX idx_pools_members_user_id ON public.pools_members_table USING btree (users_id) INCLUDE (pools_id);

CREATE INDEX idx_pools_members_user_pool ON public.pools_members_table USING btree (users_id, pools_id);

CREATE INDEX idx_pools_members_users_id ON public.pools_members_table USING btree (users_id);

CREATE INDEX idx_pools_question_pool_id ON public.pools_question_table USING btree (pools_id) INCLUDE (pools_question_id);

CREATE INDEX idx_pools_question_questions_id ON public.pools_question_table USING btree (questions_id) INCLUDE (pools_question_id);

CREATE INDEX idx_pools_sort_created_desc ON public.pools_table USING btree (sort_created_id DESC);

CREATE INDEX idx_pools_status_visible_starting ON public.pools_table USING btree (pools_status, pools_visible, pools_starting_at) WHERE ((pools_starting_at IS NULL) AND (pools_visible = true));

CREATE INDEX idx_pools_table_id_code ON public.pools_table USING btree (pools_id, pools_code);

CREATE INDEX idx_pools_table_status_job ON public.pools_table USING btree (pools_status, pools_job);

CREATE INDEX idx_pools_table_status_topics ON public.pools_table USING btree (pools_status, topics_id);

CREATE INDEX idx_pools_topic_status ON public.pools_table USING btree (topics_id, pools_status);

CREATE INDEX idx_questions_table_id ON public.questions_table USING btree (questions_id);

CREATE INDEX idx_questions_table_topic ON public.questions_table USING btree (topics_id);

CREATE INDEX idx_questions_topic_visible ON public.questions_table USING btree (topics_id, questions_visible);

CREATE INDEX idx_question_tracker_user_pool_question ON public.question_tracker_table USING btree (users_id, pools_question_id);

CREATE INDEX idx_question_tracker_user_status ON public.question_tracker_table USING btree (users_id, question_tracker_question_status) INCLUDE (pools_question_id);

CREATE INDEX idx_redeem_code_giveback ON public.redeem_code_table USING btree (giveback_id) WHERE (giveback_id IS NOT NULL);

CREATE INDEX idx_suspicious_activities_created_at ON public.suspicious_activities USING btree (created_at DESC);

CREATE INDEX idx_suspicious_activities_severity ON public.suspicious_activities USING btree (severity);

CREATE INDEX idx_suspicious_activities_status ON public.suspicious_activities USING btree (status);

CREATE INDEX idx_suspicious_activities_user_id ON public.suspicious_activities USING btree (user_id);

CREATE INDEX idx_topic_category_table_id ON public.topic_category_table USING btree (topic_category_id);

CREATE INDEX idx_topic_category_table_sort ON public.topic_category_table USING btree (sort_created_id);

CREATE INDEX idx_topics_id ON public.topics_table USING btree (topics_id);

CREATE INDEX idx_topics_sort_updated_desc ON public.topics_table USING btree (sort_updated_id DESC);

CREATE INDEX idx_topics_sort_updated ON public.topics_table USING btree (sort_updated_id DESC);

CREATE INDEX idx_topics_table_id ON public.topics_table USING btree (topics_id);

CREATE INDEX idx_transaction_ledger_reconcile ON public.transaction_table USING btree (transaction_updated_at) WHERE (transaction_ledger_status = ANY (ARRAY['pending'::text, 'failed'::text]));

CREATE INDEX idx_transaction_receiver_profile ON public.transaction_table USING btree (payment_profile_receiver_id, sort_created_id DESC);

CREATE INDEX idx_transaction_sender_profile ON public.transaction_table USING btree (payment_profile_sender_id, sort_created_id DESC);

CREATE INDEX idx_transaction_sort_created ON public.transaction_table USING btree (sort_created_id DESC);

CREATE INDEX idx_users_table_id ON public.users_table USING btree (users_id);

CREATE INDEX idx_wallet_balance_currency ON public.wallet_balance_table USING btree (currency);

CREATE INDEX idx_wallet_ledger_currency_date ON public.wallet_ledger_table USING btree (currency, sort_created_id DESC);

CREATE INDEX idx_wallet_ledger_pools ON public.wallet_ledger_table USING btree (pools_id) WHERE (pools_id IS NOT NULL);

CREATE INDEX idx_wallet_ledger_reconciled ON public.wallet_ledger_table USING btree (reconciled_at) WHERE (reconciled_at IS NOT NULL);

CREATE INDEX idx_wallet_ledger_redeem_code ON public.wallet_ledger_table USING btree (redeem_code_id) WHERE (redeem_code_id IS NOT NULL);

CREATE INDEX idx_wallet_ledger_transaction ON public.wallet_ledger_table USING btree (transaction_id) WHERE (transaction_id IS NOT NULL);

CREATE INDEX idx_wallet_ledger_treasury_type ON public.wallet_ledger_table USING btree (transaction_type, sort_created_id DESC) WHERE (transaction_type = ANY (ARRAY['TransactionType.quiz'::text, 'TransactionType.participation'::text, 'TransactionType.adc_cashout'::text, 'TransactionType.adc_add_from_fiat'::text]));

CREATE INDEX idx_wallet_ledger_wallet_created ON public.wallet_ledger_table USING btree (payment_wallet_id, sort_created_id DESC);

CREATE INDEX questions_table_category_group_id_idx ON public.questions_table USING btree (category_group_id);

CREATE INDEX questions_table_question_type_id_idx ON public.questions_table USING btree (question_type_id);

CREATE INDEX questions_table_topic_category_id_idx ON public.questions_table USING btree (topic_category_id);

CREATE INDEX topics_table_category_group_id_idx ON public.topics_table USING btree (category_group_id);

CREATE INDEX topics_table_topic_category_id_idx ON public.topics_table USING btree (topic_category_id);

CREATE UNIQUE INDEX giveback_table_sort_created_id_key ON public.giveback_table USING btree (sort_created_id);

CREATE UNIQUE INDEX idx_unique_open_pool_per_topic_challenge_in_locale ON public.pools_table USING btree (topics_id, challenge_id, pools_locale) WHERE (pools_status = 'Pools.open'::text);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.fraud_analytics AS
 SELECT fraud_logs.user_id,
    count(*) AS total_checks,
    avg(fraud_logs.risk_score) AS avg_risk_score,
    max(fraud_logs.risk_score) AS max_risk_score,
    count(
        CASE
            WHEN (fraud_logs.allowed = false) THEN 1
            ELSE NULL::integer
        END) AS blocked_count,
    count(DISTINCT fraud_logs.device_fingerprint) AS unique_devices,
    count(DISTINCT fraud_logs.ip_address) AS unique_ips,
    max(fraud_logs.created_at) AS last_check
   FROM fraud_logs
  GROUP BY fraud_logs.user_id;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER after_redeem_code_insert_referral_ledger AFTER INSERT ON public.redeem_code_table FOR EACH ROW WHEN (((new.redeem_code_source = 'REFERRAL'::text) AND (new.redeem_code_amount > 0))) EXECUTE FUNCTION trg_fn_referral_bonus_ledger();

CREATE TRIGGER detect_user_transaction_to_update_balance AFTER INSERT OR DELETE OR UPDATE OF transaction_sender_status, transaction_receiver_status ON public.transaction_table FOR EACH ROW EXECUTE FUNCTION update_user_balance();

CREATE TRIGGER enforce_pool_capacity BEFORE INSERT ON public.pools_members_table FOR EACH ROW EXECUTE FUNCTION check_pool_capacity();

CREATE TRIGGER pools_scheduler_hook AFTER INSERT ON public.pools_table FOR EACH ROW EXECUTE FUNCTION begin_pool_update();

CREATE TRIGGER trg_bonus_ledger_achievements_progress BEFORE UPDATE ON public.achievements_progress_table FOR EACH ROW EXECUTE FUNCTION handle_bonus_ledger_on_reward();

CREATE TRIGGER trg_bonus_ledger_daily_streaks BEFORE UPDATE ON public.daily_streaks_table FOR EACH ROW EXECUTE FUNCTION handle_bonus_ledger_on_reward();

CREATE TRIGGER trg_bonus_ledger_mission_progress BEFORE UPDATE ON public.mission_progress_table FOR EACH ROW EXECUTE FUNCTION handle_bonus_ledger_on_reward();

CREATE TRIGGER trigger_flag_suspicious_user AFTER INSERT ON public.fraud_logs FOR EACH ROW EXECUTE FUNCTION flag_suspicious_user();

CREATE TRIGGER update_wallet_balance_after_ledger_insert AFTER INSERT ON public.wallet_ledger_table FOR EACH ROW EXECUTE FUNCTION update_wallet_balance_from_ledger();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.achievements_progress_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.achievements_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.age_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.category_group_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.challenge_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.country_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.daily_streaks_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.engagement_levels_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.features_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.game_mode_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gender_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.giveback_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.language_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.media_operation_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mission_progress_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mission_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.option_tracker_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.options_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_details_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_method_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_profile_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_wallet_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personalized_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_config_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pools_members_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pools_question_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pools_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_time_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_tracker_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_type_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.questions_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.redeem_code_rule_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.redeem_code_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.redeemable_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.redirect_consume_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.redirect_link_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reports_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reward_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.topic_category_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.topic_settings_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.topics_metrics_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.topics_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transaction_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_engagement_progress_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users_followers_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users_settings_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_balance_table ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_ledger_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view fraud logs" ON public.fraud_logs AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (users_table u
     JOIN roles_table r ON ((u.roles_id = r.roles_id)))
  WHERE ((u.users_id = auth.uid()) AND (r.roles_checker = ANY (ARRAY['Roles.administrator'::text, 'Roles.manager'::text]))))));

CREATE POLICY "Admin can view suspicious activities" ON public.suspicious_activities AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (users_table u
     JOIN roles_table r ON ((u.roles_id = r.roles_id)))
  WHERE ((u.users_id = auth.uid()) AND (r.roles_checker = ANY (ARRAY['Roles.administrator'::text, 'Roles.manager'::text]))))));

CREATE POLICY "Enable delete for authenticated users only" ON public.media_operation_table AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.pools_members_table AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.pools_question_table AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.redeem_code_table AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.redeemable_table AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.transaction_table AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.achievements_progress_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.category_group_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.daily_streaks_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.giveback_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.media_operation_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.mission_progress_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.option_tracker_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.options_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.payment_details_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.payment_profile_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.personalized_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.pools_members_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.pools_question_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.pools_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.question_time_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.question_tracker_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.question_type_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.questions_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.redeem_code_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.redeemable_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.redirect_consume_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.topic_category_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.topic_settings_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.topics_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.transaction_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.user_engagement_progress_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.users_followers_table AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.achievements_progress_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.achievements_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.age_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.category_group_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.challenge_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.country_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.daily_streaks_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.engagement_levels_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.features_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.game_mode_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.gender_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.giveback_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.language_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.media_operation_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.mission_progress_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.mission_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.option_tracker_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.options_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.payment_details_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.payment_method_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.payment_profile_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.payment_wallet_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.personalized_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.pools_members_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.pools_question_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.pools_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.question_time_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.question_tracker_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.question_type_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.questions_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.redeem_code_rule_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.redeem_code_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.redeemable_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.redirect_consume_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.redirect_link_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.reward_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.roles_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.topic_category_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.topic_settings_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.topics_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.user_engagement_progress_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable read access for all users" ON public.users_followers_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable select for authenticated users only" ON public.transaction_table AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable select for authenticated users" ON public.giveback_table AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update for authenticated users only" ON public.achievements_progress_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.category_group_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.daily_streaks_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.features_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.mission_progress_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.options_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.payment_details_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.payment_profile_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.pools_members_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.pools_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.question_tracker_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.questions_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.redeem_code_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.redeemable_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.topic_category_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.topics_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.transaction_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.user_engagement_progress_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.giveback_table AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Public users are viewable by everyone." ON public.users_table AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Service Role For all" ON public.wallet_ledger_table AS PERMISSIVE FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can insert fraud logs" ON public.fraud_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users can insert their own profile." ON public.users_table AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = users_id));

CREATE POLICY "Users can update own profile." ON public.users_table AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = users_id));

CREATE POLICY platform_config_service_only ON public.platform_config_table AS PERMISSIVE FOR ALL TO service_role USING (true);
