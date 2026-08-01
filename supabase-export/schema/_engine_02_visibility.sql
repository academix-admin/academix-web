-- Academix Engine — Migration 02: first-class `visibility` on the content tables.
-- DECISION (Academix_Engine_plan §2.1): visibility ∈ {public, private}, orthogonal to approval_status.
--   public  = academix-guarded, usable in public paid pools once approval_status='approved'.
--   private = owner-scoped (personal); never in a public paid pool.
--
-- DEFAULT = 'public' (NOT 'private'): the EXISTING public-contribution path (submit_category_content /
-- submit_topic_content / submit_question_content) inserts explicit columns and does NOT set visibility,
-- so it relies on the default — those submissions must stay public. The NEW private-authoring RPCs will
-- set visibility='private' EXPLICITLY. All EXISTING rows predate the split and are backfilled to public.
-- ADD COLUMN with a constant default is metadata-only (fast) on PG11+. Idempotent. RLS private-scoping is
-- deferred to the migration that introduces private authoring (so current public reads are untouched).

-- topic_category
ALTER TABLE public.topic_category_table
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public','private'));
ALTER TABLE public.topic_category_table ALTER COLUMN visibility SET DEFAULT 'public';
UPDATE public.topic_category_table SET visibility = 'public' WHERE visibility <> 'public';
CREATE INDEX IF NOT EXISTS topic_category_visibility_approval_idx
  ON public.topic_category_table (visibility, approval_status);

-- topics
ALTER TABLE public.topics_table
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public','private'));
ALTER TABLE public.topics_table ALTER COLUMN visibility SET DEFAULT 'public';
UPDATE public.topics_table SET visibility = 'public' WHERE visibility <> 'public';
CREATE INDEX IF NOT EXISTS topics_visibility_approval_idx
  ON public.topics_table (visibility, approval_status, topic_category_id);

-- questions
ALTER TABLE public.questions_table
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public','private'));
ALTER TABLE public.questions_table ALTER COLUMN visibility SET DEFAULT 'public';
UPDATE public.questions_table SET visibility = 'public' WHERE visibility <> 'public';
CREATE INDEX IF NOT EXISTS questions_visibility_approval_idx
  ON public.questions_table (visibility, approval_status, topics_id);
