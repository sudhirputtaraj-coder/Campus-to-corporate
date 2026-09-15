-- Migration 003: Security Fixes for Questions RLS and recalc_enrollment_progress Function

-- 1. Secure questions table direct SELECT (Admins only)
DROP POLICY IF EXISTS "View questions for active assessments" ON questions;

CREATE POLICY "Admins view all questions"
  ON questions FOR SELECT
  USING (is_super_admin());

-- 2. Create questions_public view with strict enrollment scoping & active assessment check
CREATE OR REPLACE VIEW public.questions_public AS
SELECT 
  q.id,
  q.assessment_id,
  q.question_text,
  q.question_type,
  q.options,
  q.marks,
  q.skill_category,
  q.sequence
FROM questions q
JOIN assessments a ON a.id = q.assessment_id
WHERE a.status = 'ACTIVE'
  AND (
    is_super_admin()
    OR EXISTS (
      SELECT 1 
      FROM students s
      JOIN enrollments e ON e.student_id = s.id
      WHERE s.user_id = auth.uid()
        AND e.course_id = a.course_id
        AND e.status IN ('ACTIVE', 'COMPLETED')
    )
  );

-- 3. Grant SELECT access ONLY to authenticated users (NO anon access)
REVOKE ALL ON public.questions_public FROM anon;
GRANT SELECT ON public.questions_public TO authenticated;

-- 4. Secure recalc_enrollment_progress function against unauthorized execution
CREATE OR REPLACE FUNCTION recalc_enrollment_progress(p_student_id UUID, p_course_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_student_user_id UUID;
  v_total_lessons INT;
  v_completed_lessons INT;
  v_pct NUMERIC(5,2);
BEGIN
  -- Authorization check: Caller must be Super Admin OR own the target student profile
  IF NOT is_super_admin() THEN
    SELECT user_id INTO v_student_user_id
    FROM students
    WHERE id = p_student_id;

    IF v_student_user_id IS NULL OR v_student_user_id != v_caller_user_id THEN
      RAISE EXCEPTION 'Unauthorized: You can only recalculate your own enrollment progress.';
    END IF;
  END IF;

  -- Count total lessons in active course modules
  SELECT COUNT(l.id) INTO v_total_lessons
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id
    AND m.status = 'ACTIVE'
    AND l.status = 'ACTIVE';

  IF v_total_lessons IS NULL OR v_total_lessons = 0 THEN
    v_pct := 0.00;
  ELSE
    SELECT COUNT(lp.id) INTO v_completed_lessons
    FROM lesson_progress lp
    WHERE lp.student_id = p_student_id
      AND lp.course_id = p_course_id
      AND lp.status = 'COMPLETED';

    v_pct := ROUND((v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100, 2);
  END IF;

  -- Update enrollment record
  UPDATE enrollments
  SET completion_percentage = v_pct,
      status = CASE WHEN v_pct >= 100 THEN 'COMPLETED'::enrollment_status ELSE status END,
      updated_at = NOW()
  WHERE student_id = p_student_id AND course_id = p_course_id;

  RETURN v_pct;
END;
$$;