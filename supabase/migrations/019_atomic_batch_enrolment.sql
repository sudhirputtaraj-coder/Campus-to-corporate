BEGIN;
DROP POLICY IF EXISTS "College Admin views own course assignments" ON public.college_courses;
CREATE POLICY "College Admin views own course assignments" ON public.college_courses
FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='COLLEGE_ADMIN' AND status='ACTIVE')
  AND public.is_college_admin(college_id)
);
CREATE OR REPLACE FUNCTION public.fn_enrol_batch_course(p_batch_id UUID,p_course_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_college UUID; eligible_count INTEGER; added_count INTEGER; admin_role user_role;
BEGIN
  SELECT role INTO admin_role FROM profiles WHERE user_id=auth.uid() AND status='ACTIVE';
  IF admin_role IS NULL OR admin_role NOT IN ('SUPER_ADMIN','COLLEGE_ADMIN') THEN RAISE EXCEPTION 'Active administrator access is required.'; END IF;
  SELECT college_id INTO owner_college FROM batches WHERE id=p_batch_id AND status='ACTIVE';
  IF owner_college IS NULL OR (admin_role='COLLEGE_ADMIN' AND NOT is_college_admin(owner_college)) THEN RAISE EXCEPTION 'Choose an active batch in your college.'; END IF;
  -- Match the college-first lock order used by structure and college enrolment.
  PERFORM 1 FROM colleges WHERE id=owner_college AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The college must be active.'; END IF;
  PERFORM 1 FROM batches WHERE id=p_batch_id AND college_id=owner_college AND status='ACTIVE' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The batch changed. Refresh and try again.'; END IF;
  PERFORM 1 FROM courses WHERE id=p_course_id AND status='ACTIVE' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active course.'; END IF;
  IF admin_role='COLLEGE_ADMIN' AND NOT EXISTS(SELECT 1 FROM college_courses WHERE college_id=owner_college AND course_id=p_course_id) THEN
    RAISE EXCEPTION 'Ask the platform administrator to assign this course to your college first.';
  END IF;
  WITH eligible AS MATERIALIZED (
    SELECT s.id FROM students s JOIN profiles p ON p.user_id=s.user_id
    WHERE s.batch_id=p_batch_id AND s.college_id=owner_college AND s.account_type='COLLEGE'
      AND s.status='ACTIVE' AND p.role='STUDENT' AND p.status='ACTIVE'
    ORDER BY s.id FOR SHARE OF s,p
  ), added AS (
    INSERT INTO enrollments(student_id,course_id,batch_id)
      SELECT id,p_course_id,p_batch_id FROM eligible
      ON CONFLICT(student_id,course_id) DO NOTHING RETURNING id
  ) SELECT (SELECT count(*) FROM eligible),(SELECT count(*) FROM added) INTO eligible_count,added_count;
  IF eligible_count=0 THEN RAISE EXCEPTION 'No active student accounts are assigned to this batch.'; END IF;
  INSERT INTO batch_course_assignments(batch_id,course_id,assigned_by,status)
    VALUES(p_batch_id,p_course_id,auth.uid(),'ACTIVE')
    ON CONFLICT(batch_id,course_id) DO UPDATE SET status='ACTIVE';
  INSERT INTO audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'BATCH_COURSE_ENROLLED','batch',p_batch_id,jsonb_build_object('course_id',p_course_id,'added',added_count,'existing',eligible_count-added_count));
  RETURN jsonb_build_object('enrolled',added_count,'existing',eligible_count-added_count);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_enrol_batch_course(UUID,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_enrol_batch_course(UUID,UUID) TO authenticated;
COMMIT;
