-- schema:   public
-- function: update_user_engagement_progress(p_pool_member_id uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.update_user_engagement_progress(p_pool_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  o_questions INT;
  o_points NUMERIC;
  o_time NUMERIC;
  o_quiz INT;
  o_sort_id TEXT;
  o_t_questions NUMERIC;
  o_t_quiz NUMERIC;
  o_t_time NUMERIC;

  user_id UUID;
  n_questions INT;
  n_points NUMERIC;
  n_time NUMERIC;
  n_quiz NUMERIC;
  n_pool_id UUID;
  n_sort_id TEXT;
  n_t_questions NUMERIC;
  n_t_quiz NUMERIC;
  n_t_time NUMERIC;

  v_result JSONB := '{"status": "success"}';
BEGIN
  -- Validate input
  IF p_pool_member_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Invalid input parameters');
  END IF;

  -- Fetch new pool data
  SELECT pmt.users_id,
         pt.sort_updated_id,
         pmt.pools_id,
         pmt.pools_members_points,
         pmt.pools_completed_question_tracker_size,
         pmt.pools_completed_question_tracker_time,
         pt.pools_duration,
         (SELECT COUNT(*) FROM pools_question_table pqt WHERE pqt.pools_id = pt.pools_id),
         CASE WHEN pmt.pools_members_category = 'Position.top' THEN 1 ELSE 0 END,
         1
  INTO user_id,
       n_sort_id,
       n_pool_id,
       n_points,
       n_questions,
       n_time,
       n_t_time,
       n_t_questions,
       n_t_quiz,
       n_quiz
  FROM pools_members_table pmt
  LEFT JOIN pools_table pt ON pt.pools_id = pmt.pools_id
  WHERE pmt.pools_members_id = p_pool_member_id;

  IF user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'No User Found');
  END IF;

  -- Fetch existing progress
  SELECT pt.sort_updated_id,
         upt.user_engagement_progress_questions,
         upt.user_engagement_progress_points,
         upt.user_engagement_progress_time,
         upt.user_engagement_progress_win_count,
         upt.user_engagement_total_time,
         upt.user_engagement_progress_quiz_count,
         upt.user_engagement_total_questions
  INTO o_sort_id,
       o_questions,
       o_points,
       o_time,
       o_quiz,
       o_t_time,
       o_t_quiz,
       o_t_questions
  FROM user_engagement_progress_table upt
  LEFT JOIN pools_table pt ON pt.pools_id = upt.pools_id
  WHERE upt.users_id = user_id
    AND upt.pools_id = n_pool_id;

  IF o_sort_id IS NULL THEN
    -- Insert new record (if no previous entry)
    INSERT INTO user_engagement_progress_table (
      users_id,
      pools_id,
      user_engagement_progress_questions,
      user_engagement_progress_points,
      user_engagement_progress_time,
      user_engagement_progress_win_count,
      user_engagement_progress_quiz_count,
      user_engagement_total_time,
      user_engagement_total_questions
    ) VALUES (
      user_id,
      n_pool_id,
      COALESCE(n_questions, 0),
      COALESCE(n_points, 0),
      COALESCE(n_time, 0),
      COALESCE(n_quiz, 0),
      COALESCE(n_t_quiz, 0),
      COALESCE(n_t_time, 0),
      COALESCE(n_t_questions, 0)
    )
    ON CONFLICT (users_id) DO NOTHING;  -- graceful handling of unique constraint
  ELSE
    -- Update if the new sort is more recent
    IF n_sort_id > o_sort_id THEN
      UPDATE user_engagement_progress_table
      SET
        pools_id = n_pool_id,
        user_engagement_progress_questions = COALESCE(n_questions, 0) + COALESCE(o_questions, 0),
        user_engagement_progress_points = COALESCE(n_points, 0) + COALESCE(o_points, 0),
        user_engagement_progress_time = COALESCE(n_time, 0) + COALESCE(o_time, 0),
        user_engagement_progress_quiz_count = COALESCE(n_t_quiz, 0) + COALESCE(o_t_quiz, 0),
        user_engagement_progress_win_count = COALESCE(n_quiz, 0) + COALESCE(o_quiz, 0),
        user_engagement_total_time = COALESCE(n_t_time, 0) + COALESCE(o_t_time, 0),
        user_engagement_total_questions = COALESCE(n_t_questions, 0) + COALESCE(o_t_questions, 0)
      WHERE users_id = user_id;
    END IF;
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$function$

