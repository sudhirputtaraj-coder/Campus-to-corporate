-- Apply after 034, with the matching application release. Preserves existing history.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_admin_college_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT m.college_id FROM public.user_college_memberships m
 JOIN public.profiles p ON p.user_id=m.user_id JOIN public.colleges c ON c.id=m.college_id
 WHERE m.user_id=auth.uid() AND m.role='COLLEGE_ADMIN' AND m.status='ACTIVE'
 AND p.role='COLLEGE_ADMIN' AND p.status='ACTIVE' AND c.status='ACTIVE';
$$;
CREATE OR REPLACE FUNCTION public.is_college_admin(p_college_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p_college_id IN (SELECT public.get_admin_college_ids());
$$;

-- A profile email is a mirror, not a separately editable account identifier.
-- This also permits the Auth email-sync trigger once the actual address is confirmed.
CREATE OR REPLACE FUNCTION public.fn_guard_verified_profile_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.email IS DISTINCT FROM OLD.email THEN
   IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=NEW.user_id
     AND lower(NEW.email)=lower(u.email) AND (TG_OP='INSERT' OR u.email_confirmed_at IS NOT NULL)) THEN
     RAISE EXCEPTION 'Profile email must match the verified account email';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_verified_profile_email ON public.profiles;
CREATE TRIGGER guard_verified_profile_email BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_verified_profile_email();
REVOKE ALL ON FUNCTION public.fn_guard_verified_profile_email() FROM PUBLIC,anon,authenticated;

-- Table-level and any legacy column-level grants must both be removed.
REVOKE ALL ON public.assessment_attempts,public.assessment_answers FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t TEXT; cols TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['assessment_attempts','assessment_answers'] LOOP
 SELECT string_agg(quote_ident(column_name),',') INTO cols FROM information_schema.columns
 WHERE table_schema='public' AND table_name=t;
 EXECUTE format('REVOKE INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.%I FROM PUBLIC,anon,authenticated',cols,cols,cols,t);
 END LOOP;
END $$;
GRANT SELECT ON public.assessment_attempts,public.assessment_answers TO authenticated;

-- Protect evidence definitions, including keys/marks, once any attempt exists.
CREATE OR REPLACE FUNCTION public.fn_guard_assessment_definition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE aid UUID; ids UUID[];
BEGIN
 IF TG_TABLE_NAME='questions' THEN
   ids:=CASE WHEN TG_OP='INSERT' THEN ARRAY[NEW.assessment_id] WHEN TG_OP='DELETE' THEN ARRAY[OLD.assessment_id] ELSE ARRAY[OLD.assessment_id,NEW.assessment_id] END;
 ELSE
   IF TG_OP='UPDATE' AND (NEW.course_id,NEW.duration_minutes,NEW.passing_score,NEW.max_attempts,NEW.is_practice)
      IS NOT DISTINCT FROM (OLD.course_id,OLD.duration_minutes,OLD.passing_score,OLD.max_attempts,OLD.is_practice) THEN RETURN NEW; END IF;
   ids:=ARRAY[OLD.id];
 END IF;
 FOR aid IN SELECT DISTINCT x FROM unnest(ids) x ORDER BY x LOOP
   PERFORM 1 FROM public.assessments WHERE id=aid FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.assessment_attempts WHERE assessment_id=aid) THEN
     RAISE EXCEPTION 'Assessment definitions are locked after the first attempt. Create a new assessment.';
   END IF;
 END LOOP;
 RETURN COALESCE(NEW,OLD);
END;
$$;
DROP TRIGGER IF EXISTS guard_question_definition ON public.questions;
CREATE TRIGGER guard_question_definition BEFORE INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_assessment_definition();
DROP TRIGGER IF EXISTS guard_assessment_definition ON public.assessments;
CREATE TRIGGER guard_assessment_definition BEFORE UPDATE OR DELETE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_assessment_definition();
REVOKE ALL ON FUNCTION public.fn_guard_assessment_definition() FROM PUBLIC,anon,authenticated;

-- Internal helper: caller identity never comes from a client-supplied student ID.
CREATE OR REPLACE FUNCTION public.fn_assessment_student()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid UUID;
BEGIN
 SELECT s.id INTO sid FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id
 WHERE s.user_id=auth.uid() AND s.status='ACTIVE' AND p.status='ACTIVE' AND p.role='STUDENT'
 AND (s.account_type='INDIVIDUAL' OR EXISTS(SELECT 1 FROM public.colleges c WHERE c.id=s.college_id AND c.status='ACTIVE'))
 FOR UPDATE OF s;
 IF sid IS NULL OR NOT public.fn_has_learning_access() THEN RAISE EXCEPTION 'Active student learning access is required'; END IF;
 RETURN sid;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_assessment_student() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_start_assessment(p_assessment_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid UUID; a public.assessments; attempt public.assessment_attempts; n INTEGER; question_count INTEGER;
BEGIN
 sid:=public.fn_assessment_student();
 SELECT * INTO a FROM public.assessments WHERE id=p_assessment_id AND status='ACTIVE' FOR UPDATE;
 IF a.id IS NULL OR NOT public.fn_can_access_course(a.course_id) THEN RAISE EXCEPTION 'Assessment access denied'; END IF;
 SELECT count(*) INTO question_count FROM public.questions WHERE assessment_id=a.id;
 IF question_count NOT BETWEEN 1 AND 200 OR EXISTS(SELECT 1 FROM public.questions WHERE assessment_id=a.id
   AND (question_type NOT IN ('MCQ','MULTIPLE_CHOICE','TRUE_FALSE') OR correct_answer IS NULL OR btrim(correct_answer)='' OR marks<=0)) THEN
   RAISE EXCEPTION 'Assessment requires configured automatic grading (1 to 200 questions). Contact your administrator.';
 END IF;
 SELECT * INTO attempt FROM public.assessment_attempts WHERE student_id=sid AND assessment_id=a.id AND status='IN_PROGRESS' ORDER BY attempt_number LIMIT 1;
 IF attempt.id IS NOT NULL THEN RETURN jsonb_build_object('success',true,'attemptId',attempt.id,'attemptNumber',attempt.attempt_number); END IF;
 SELECT coalesce(max(attempt_number),0)+1 INTO n FROM public.assessment_attempts WHERE student_id=sid AND assessment_id=a.id;
 IF a.max_attempts IS NULL OR n>a.max_attempts THEN RAISE EXCEPTION 'Maximum assessment attempts reached'; END IF;
 INSERT INTO public.assessment_attempts(student_id,assessment_id,attempt_number,status) VALUES(sid,a.id,n,'IN_PROGRESS') RETURNING * INTO attempt;
 RETURN jsonb_build_object('success',true,'attemptId',attempt.id,'attemptNumber',n);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_submit_assessment(p_attempt_id UUID,p_answers JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid UUID; aid UUID; a public.assessments; attempt public.assessment_attempts;
 total NUMERIC; obtained NUMERIC; pct NUMERIC; question_count INTEGER; timed_out BOOLEAN;
BEGIN
 sid:=public.fn_assessment_student();
 SELECT assessment_id INTO aid FROM public.assessment_attempts WHERE id=p_attempt_id AND student_id=sid;
 SELECT * INTO a FROM public.assessments WHERE id=aid AND status='ACTIVE' FOR UPDATE;
 IF a.id IS NULL OR NOT public.fn_can_access_course(a.course_id) THEN RAISE EXCEPTION 'Assessment access denied'; END IF;
 SELECT * INTO attempt FROM public.assessment_attempts WHERE id=p_attempt_id AND student_id=sid FOR UPDATE;
 -- A retried request returns the committed result without accepting different answers.
 IF attempt.status='GRADED' THEN
   RETURN jsonb_build_object('success',true,'attemptId',attempt.id,'percentage',attempt.percentage,'obtainedMarks',attempt.obtained_marks,'totalMarks',attempt.total_marks,'passed',attempt.passed,'status',attempt.status);
 END IF;
 IF attempt.status<>'IN_PROGRESS' THEN RAISE EXCEPTION 'This attempt is already submitted and cannot be changed'; END IF;
 SELECT count(*) INTO question_count FROM public.questions WHERE assessment_id=a.id;
 IF question_count NOT BETWEEN 1 AND 200 OR EXISTS(SELECT 1 FROM public.questions WHERE assessment_id=a.id
   AND (question_type NOT IN ('MCQ','MULTIPLE_CHOICE','TRUE_FALSE') OR correct_answer IS NULL OR btrim(correct_answer)='' OR marks<=0)) THEN
   RAISE EXCEPTION 'Assessment requires configured automatic grading. Contact your administrator.';
 END IF;
 timed_out:=a.duration_minutes>0 AND clock_timestamp()>attempt.created_at+make_interval(mins=>a.duration_minutes+2);
 IF timed_out THEN
   UPDATE public.assessment_attempts SET status='SUBMITTED',score=0,percentage=0,obtained_marks=0,passed=false,completed_at=clock_timestamp() WHERE id=attempt.id;
   RETURN jsonb_build_object('error','Assessment time limit exceeded. Attempt marked as timed out.');
 END IF;
 IF p_answers IS NULL OR jsonb_typeof(p_answers)<>'array' THEN RAISE EXCEPTION 'Answers must be an array'; END IF;
 IF jsonb_array_length(p_answers)<>question_count OR octet_length(p_answers::text)>900000 THEN RAISE EXCEPTION 'Provide one answer for every question'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_answers) v WHERE jsonb_typeof(v)<>'object'
   OR jsonb_typeof(v->'questionId') IS DISTINCT FROM 'string' OR jsonb_typeof(v->'answerText') IS DISTINCT FROM 'string'
   OR length(btrim(v->>'answerText')) NOT BETWEEN 1 AND 4000) THEN RAISE EXCEPTION 'Invalid answer format'; END IF;
 IF (SELECT count(DISTINCT v->>'questionId') FROM jsonb_array_elements(p_answers) v)<>question_count
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_answers) v WHERE NOT EXISTS(SELECT 1 FROM public.questions q WHERE q.assessment_id=a.id AND q.id::text=v->>'questionId')) THEN
   RAISE EXCEPTION 'Answers must match this assessment without duplicates';
 END IF;
 INSERT INTO public.assessment_answers(attempt_id,question_id,answer_text,is_correct,marks_awarded)
 SELECT attempt.id,q.id,btrim(v->>'answerText'),lower(btrim(v->>'answerText'))=lower(btrim(q.correct_answer)),
 CASE WHEN lower(btrim(v->>'answerText'))=lower(btrim(q.correct_answer)) THEN q.marks ELSE 0 END
 FROM public.questions q JOIN jsonb_array_elements(p_answers) v ON q.id::text=v->>'questionId' WHERE q.assessment_id=a.id
 ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer_text=excluded.answer_text,is_correct=excluded.is_correct,marks_awarded=excluded.marks_awarded;
 SELECT sum(q.marks),sum(ans.marks_awarded) INTO total,obtained FROM public.questions q JOIN public.assessment_answers ans ON ans.question_id=q.id AND ans.attempt_id=attempt.id WHERE q.assessment_id=a.id;
 pct:=round(obtained/total*100,2);
 UPDATE public.assessment_attempts SET status='GRADED',score=obtained,percentage=pct,total_marks=total,obtained_marks=obtained,passed=pct>=a.passing_score,completed_at=clock_timestamp() WHERE id=attempt.id RETURNING * INTO attempt;
 -- Failures roll back the answers and grade too; the same attempt can safely be retried.
 PERFORM public.fn_process_attempt_skills(attempt.id);
 IF NOT a.is_practice THEN PERFORM public.fn_compute_employability_score(sid); END IF;
 PERFORM public.recalc_enrollment_progress(sid,a.course_id);
 PERFORM public.fn_issue_course_certificate(a.course_id);
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
 VALUES(auth.uid(),'ASSESSMENT_SUBMITTED','assessment_attempt',attempt.id,jsonb_build_object('assessment_id',a.id,'percentage',pct,'status','GRADED','attempt_number',attempt.attempt_number));
 RETURN jsonb_build_object('success',true,'attemptId',attempt.id,'percentage',pct,'obtainedMarks',obtained,'totalMarks',total,'passed',attempt.passed,'status',attempt.status);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_start_assessment(UUID),public.fn_submit_assessment(UUID,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_start_assessment(UUID),public.fn_submit_assessment(UUID,JSONB) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_setup_professional_account(p_email TEXT,p_kind TEXT,p_college_id UUID DEFAULT NULL,p_company_name TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target public.profiles; learner public.students; existing_trainer public.trainers;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access required.'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('TRAINER','EMPLOYER') THEN RAISE EXCEPTION 'Choose Trainer or Employer.'; END IF;
  IF (SELECT count(*) FROM auth.users WHERE lower(email)=lower(btrim(p_email)) AND email_confirmed_at IS NOT NULL)<>1 THEN
    RAISE EXCEPTION 'Choose one confirmed account email.';
  END IF;
  SELECT p.* INTO target FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
  WHERE lower(u.email)=lower(btrim(p_email)) AND u.email_confirmed_at IS NOT NULL FOR UPDATE OF p;
  IF target.user_id IS NULL OR target.status<>'ACTIVE' OR target.role::text NOT IN ('STUDENT',p_kind) THEN
    RAISE EXCEPTION 'Choose an active registered account with an eligible role.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target.user_id AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'The user must confirm their email first.';
  END IF;
  SELECT * INTO learner FROM public.students WHERE user_id=target.user_id FOR UPDATE;
  IF learner.id IS NOT NULL AND (learner.college_id IS NOT NULL
    OR EXISTS(SELECT 1 FROM public.enrollments WHERE student_id=learner.id)
    OR EXISTS(SELECT 1 FROM public.assessment_attempts WHERE student_id=learner.id)
    OR EXISTS(SELECT 1 FROM public.programme_purchases WHERE student_id=learner.id)) THEN
    RAISE EXCEPTION 'Existing student learning or college records require a separate transfer review.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.user_college_memberships WHERE user_id=target.user_id) THEN
    RAISE EXCEPTION 'This account has college responsibilities and requires a separate transfer review.';
  END IF;
  IF p_kind='TRAINER' THEN
    PERFORM 1 FROM public.colleges WHERE id=p_college_id AND status='ACTIVE' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active college.'; END IF;
    SELECT * INTO existing_trainer FROM public.trainers WHERE user_id=target.user_id FOR UPDATE;
    IF existing_trainer.id IS NOT NULL AND existing_trainer.college_id<>p_college_id THEN
      RAISE EXCEPTION 'Trainer college transfers require a separate review.';
    END IF;
    IF EXISTS(SELECT 1 FROM public.employer_companies WHERE user_id=target.user_id) THEN RAISE EXCEPTION 'Existing employer account cannot be reassigned here.'; END IF;
    INSERT INTO public.trainers(user_id,college_id) VALUES(target.user_id,p_college_id) ON CONFLICT(user_id) DO NOTHING;
  ELSE
    IF EXISTS(SELECT 1 FROM public.trainers WHERE user_id=target.user_id) THEN RAISE EXCEPTION 'Existing trainer account cannot be reassigned here.'; END IF;
    IF p_company_name IS NULL OR length(btrim(p_company_name)) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Enter a company name of 2 to 200 characters.'; END IF;
    INSERT INTO public.employer_companies(user_id,name) VALUES(target.user_id,btrim(p_company_name)) ON CONFLICT(user_id) DO NOTHING;
  END IF;
  UPDATE public.students SET status='INACTIVE' WHERE user_id=target.user_id;
  UPDATE public.profiles SET role=p_kind::public.user_role WHERE user_id=target.user_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'PROFESSIONAL_ACCOUNT_SETUP','user',target.user_id,jsonb_build_object('role',p_kind,'college_id',p_college_id));
END;
$$;
REVOKE ALL ON FUNCTION public.fn_setup_professional_account(TEXT,TEXT,UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_setup_professional_account(TEXT,TEXT,UUID,TEXT) TO authenticated;


COMMIT;
