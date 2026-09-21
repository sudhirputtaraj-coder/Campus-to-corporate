-- Apply after 006. Paid entitlement is checked using database time on every request.
BEGIN;

CREATE FUNCTION public.fn_has_learning_access()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.status = 'ACTIVE'
      AND (p.role IN ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER') OR
        (p.role = 'STUDENT' AND EXISTS (
          SELECT 1 FROM public.students s WHERE s.user_id = p.user_id AND s.status = 'ACTIVE'
            AND (s.account_type = 'COLLEGE' OR (s.account_type = 'INDIVIDUAL' AND EXISTS (
              SELECT 1 FROM public.programme_purchases pp
              WHERE pp.student_id = s.id AND pp.programme_id = 'corporate-readiness'
                AND pp.status = 'PAID' AND pp.activated_at <= now() AND pp.expires_at > now()
            )))
        )))
  );
$$;
REVOKE ALL ON FUNCTION public.fn_has_learning_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_has_learning_access() TO authenticated;

CREATE FUNCTION public.fn_can_access_course(p_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.fn_has_learning_access() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
      AND (p.role IN ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER') OR EXISTS (
        SELECT 1 FROM public.students s JOIN public.enrollments e ON e.student_id = s.id
        JOIN public.courses c ON c.id = e.course_id
        WHERE s.user_id = p.user_id AND e.course_id = p_course_id
          AND e.status IN ('ACTIVE', 'COMPLETED') AND c.status = 'ACTIVE'
      ))
  );
$$;
REVOKE ALL ON FUNCTION public.fn_can_access_course(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_can_access_course(UUID) TO authenticated;

-- Old policies expose lessons/modules to any caller who can see active courses.
-- Restrictive policies also intersect any other existing permissive SELECT policy.
REVOKE ALL ON public.modules, public.lessons FROM anon;
CREATE POLICY "Course access required for module content" ON public.modules
AS RESTRICTIVE FOR SELECT TO authenticated USING (public.fn_can_access_course(course_id));
CREATE POLICY "Course access required for lesson content" ON public.lessons
AS RESTRICTIVE FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.modules m WHERE m.id = lessons.module_id AND public.fn_can_access_course(m.course_id)
));

-- Owner-executed views bypass table RLS; explicitly apply the entitlement filter.
CREATE OR REPLACE VIEW public.questions_public AS
SELECT q.id, q.assessment_id, q.question_text, q.question_type, q.options,
       q.marks, q.skill_category, q.sequence
FROM public.questions q JOIN public.assessments a ON a.id = q.assessment_id
WHERE a.status = 'ACTIVE' AND public.fn_can_access_course(a.course_id)
  AND (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.students s JOIN public.enrollments e ON e.student_id = s.id
    WHERE s.user_id = auth.uid() AND e.course_id = a.course_id AND e.status IN ('ACTIVE', 'COMPLETED')
  ));
REVOKE ALL ON public.questions_public FROM PUBLIC, anon;
GRANT SELECT ON public.questions_public TO authenticated;

-- Preserve read access to the student's history, but block learning writes after expiry.
CREATE FUNCTION public.fn_guard_learning_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_course UUID;
  target_student UUID;
  target_lesson UUID;
  target_assessment UUID;
  target_attempt UUID;
  row_data JSONB;
BEGIN
  -- Background service jobs have no end-user JWT. Client roles must always pass.
  IF auth.role() = 'service_role' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.fn_has_learning_access() THEN RAISE EXCEPTION 'Programme access is not active'; END IF;
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_TABLE_NAME = 'lesson_progress' THEN
    target_course := (row_data->>'course_id')::uuid;
    target_lesson := (row_data->>'lesson_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
                   WHERE l.id = target_lesson AND m.course_id = target_course AND l.status = 'ACTIVE' AND m.status = 'ACTIVE') THEN
      RAISE EXCEPTION 'Lesson does not belong to this active course';
    END IF;
  ELSIF TG_TABLE_NAME = 'assessment_attempts' THEN
    target_assessment := (row_data->>'assessment_id')::uuid;
    SELECT course_id INTO target_course FROM public.assessments WHERE id = target_assessment AND status = 'ACTIVE';
  ELSE
    target_attempt := (row_data->>'attempt_id')::uuid;
    SELECT a.course_id INTO target_course FROM public.assessment_attempts aa
    JOIN public.assessments a ON a.id = aa.assessment_id WHERE aa.id = target_attempt AND a.status = 'ACTIVE';
  END IF;
  IF target_course IS NULL OR NOT public.fn_can_access_course(target_course) THEN
    RAISE EXCEPTION 'Course access is not available';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_guard_learning_write() FROM PUBLIC;
CREATE TRIGGER guard_lesson_progress_access BEFORE INSERT OR UPDATE OR DELETE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_learning_write();
CREATE TRIGGER guard_assessment_attempt_access BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_attempts
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_learning_write();
CREATE TRIGGER guard_assessment_answer_access BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_answers
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_learning_write();

-- Wrap the existing security-definer RPC: it must not bypass expiry or accept an anonymous caller.
ALTER FUNCTION public.recalc_enrollment_progress(UUID, UUID) RENAME TO recalc_enrollment_progress_internal;
REVOKE ALL ON FUNCTION public.recalc_enrollment_progress_internal(UUID, UUID) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.recalc_enrollment_progress(p_student_id UUID, p_course_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.fn_can_access_course(p_course_id) THEN
    RAISE EXCEPTION 'Active course access is required';
  END IF;
  IF NOT public.is_super_admin() AND NOT EXISTS (
    SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Student ownership required'; END IF;
  RETURN public.recalc_enrollment_progress_internal(p_student_id, p_course_id);
END;
$$;
REVOKE ALL ON FUNCTION public.recalc_enrollment_progress(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalc_enrollment_progress(UUID, UUID) TO authenticated;
COMMIT;
