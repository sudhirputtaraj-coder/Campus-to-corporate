BEGIN;
CREATE TABLE IF NOT EXISTS public.college_courses (
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(college_id,course_id)
);
ALTER TABLE public.college_courses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.college_courses FROM anon, authenticated;
GRANT SELECT ON public.college_courses TO authenticated;
DROP POLICY IF EXISTS "Super Admin views college courses" ON public.college_courses;
CREATE POLICY "Super Admin views college courses" ON public.college_courses
FOR SELECT TO authenticated USING(public.is_super_admin());

CREATE OR REPLACE FUNCTION public.fn_enrol_college_course(p_college_id UUID,p_course_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eligible_count INTEGER; added_count INTEGER;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
  PERFORM 1 FROM public.colleges WHERE id=p_college_id AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active college.'; END IF;
  PERFORM 1 FROM public.courses WHERE id=p_course_id AND status='ACTIVE' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active course.'; END IF;
  INSERT INTO public.college_courses(college_id,course_id,assigned_by)
    VALUES(p_college_id,p_course_id,auth.uid()) ON CONFLICT DO NOTHING;
  -- Lock eligible accounts during enrolment. Existing progress/status is untouched.
  WITH eligible AS MATERIALIZED (
    SELECT s.id,s.batch_id FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id
    WHERE s.college_id=p_college_id AND s.account_type='COLLEGE' AND s.status='ACTIVE'
      AND p.role='STUDENT' AND p.status='ACTIVE'
    ORDER BY s.id FOR SHARE OF s,p
  ), added AS (
    INSERT INTO public.enrollments(student_id,course_id,batch_id)
      SELECT id,p_course_id,batch_id FROM eligible
      ON CONFLICT(student_id,course_id) DO NOTHING RETURNING id
  ) SELECT (SELECT count(*) FROM eligible),(SELECT count(*) FROM added) INTO eligible_count,added_count;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'COLLEGE_COURSE_ENROLMENT','college',p_college_id,
      jsonb_build_object('course_id',p_course_id,'eligible',eligible_count,'added',added_count));
  RETURN jsonb_build_object('eligible',eligible_count,'added',added_count,'existing',eligible_count-added_count);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_enrol_college_course(UUID,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_enrol_college_course(UUID,UUID) TO authenticated;
COMMIT;
