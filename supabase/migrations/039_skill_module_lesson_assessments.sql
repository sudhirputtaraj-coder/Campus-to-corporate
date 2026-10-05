-- Apply after 038. Preserve existing content IDs, enrolments and assessment history.
BEGIN;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS assessments_lesson_id_idx ON public.assessments(lesson_id);

CREATE OR REPLACE FUNCTION public.fn_guard_assessment_lesson()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.lesson_id IS DISTINCT FROM OLD.lesson_id AND EXISTS(SELECT 1 FROM assessment_attempts WHERE assessment_id=OLD.id) THEN
  RAISE EXCEPTION 'An attempted assessment cannot move to another lesson. Create a draft copy.';
 END IF;
 IF NEW.lesson_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=NEW.lesson_id AND m.course_id=NEW.course_id) THEN
  RAISE EXCEPTION 'The assessment and lesson must belong to the same learning content.';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_assessment_lesson ON public.assessments;
CREATE TRIGGER guard_assessment_lesson BEFORE INSERT OR UPDATE OF lesson_id,course_id ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.fn_guard_assessment_lesson();

CREATE OR REPLACE FUNCTION public.fn_lesson_assessment_visible(p_lesson uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p_lesson IS NULL OR EXISTS(SELECT 1 FROM lessons l JOIN modules m ON m.id=l.module_id JOIN skills s ON s.id=m.skill_id
 WHERE l.id=p_lesson AND l.status='ACTIVE' AND m.status='ACTIVE' AND s.status='ACTIVE' AND public.fn_can_access_course(m.course_id));
$$;
REVOKE ALL ON FUNCTION public.fn_lesson_assessment_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_lesson_assessment_visible(uuid) TO authenticated;
DROP POLICY IF EXISTS lesson_assessment_visibility ON public.assessments;
CREATE POLICY lesson_assessment_visibility ON public.assessments AS RESTRICTIVE FOR SELECT TO authenticated
USING(public.is_super_admin() OR public.fn_lesson_assessment_visible(lesson_id));

-- Content authoring creates modules under skills; the course record is retained
-- solely for compatibility with programme access, enrolment and certificates.
CREATE OR REPLACE FUNCTION public.fn_create_skill_module(p_skill uuid,p_title text,p_description text,p_sequence integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.skills; c uuid; result uuid;
BEGIN
 IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
 SELECT * INTO s FROM skills WHERE id=p_skill FOR UPDATE;
 IF s.id IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 200 OR p_sequence NOT BETWEEN 1 AND 100000 OR p_sequence IS NULL THEN RAISE EXCEPTION 'Choose a skill, module name and display order.'; END IF;
 -- Prefer the existing access container used for this skill. Do not enrol anybody automatically.
 SELECT course_id INTO c FROM modules WHERE skill_id=p_skill ORDER BY created_at,id LIMIT 1;
 IF c IS NULL THEN SELECT id INTO c FROM courses WHERE skill_id=p_skill ORDER BY created_at,id LIMIT 1; END IF;
 IF c IS NULL THEN
  INSERT INTO courses(title,category,skill_id,status,created_by) VALUES(s.name,s.name,s.id,'INACTIVE',auth.uid()) RETURNING id INTO c;
 END IF;
 INSERT INTO modules(course_id,skill_id,title,description,sequence,status) VALUES(c,p_skill,btrim(p_title),p_description,p_sequence,'INACTIVE') RETURNING id INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.fn_create_skill_module(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_create_skill_module(uuid,text,text,integer) TO authenticated;

-- Publishing a complete module makes its access container available without a second content hierarchy.
CREATE OR REPLACE FUNCTION public.fn_sync_module_container()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid;
BEGIN
 IF TG_TABLE_NAME='modules' THEN c:=NEW.course_id;
 ELSE SELECT course_id INTO c FROM modules WHERE id=NEW.module_id; END IF;
 IF NEW.status='ACTIVE' AND EXISTS(SELECT 1 FROM modules m JOIN lessons l ON l.module_id=m.id WHERE m.course_id=c AND m.status='ACTIVE' AND l.status='ACTIVE') THEN
  UPDATE courses SET status='ACTIVE' WHERE id=c AND status='INACTIVE';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sync_module_container ON public.modules;
CREATE TRIGGER sync_module_container AFTER INSERT OR UPDATE OF status ON public.modules FOR EACH ROW EXECUTE FUNCTION public.fn_sync_module_container();
DROP TRIGGER IF EXISTS sync_lesson_container ON public.lessons;
CREATE TRIGGER sync_lesson_container AFTER INSERT OR UPDATE OF status ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.fn_sync_module_container();
CREATE OR REPLACE FUNCTION public.fn_start_assessment(p_assessment_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid UUID; a public.assessments; attempt public.assessment_attempts; n INTEGER; question_count INTEGER;
BEGIN
 sid:=public.fn_assessment_student();
 SELECT * INTO a FROM public.assessments WHERE id=p_assessment_id AND status='ACTIVE' FOR UPDATE;
 IF a.id IS NULL OR NOT public.fn_can_access_course(a.course_id) OR NOT public.fn_lesson_assessment_visible(a.lesson_id) THEN RAISE EXCEPTION 'Assessment access denied'; END IF;
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

CREATE OR REPLACE FUNCTION public.fn_copy_assessment_draft(p_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.assessments%ROWTYPE; q public.questions%ROWTYPE; v_id UUID; v_question UUID;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
  SELECT * INTO a FROM public.assessments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found.'; END IF;
  INSERT INTO public.assessments(lesson_id,course_id,title,description,type,duration_minutes,passing_score,max_attempts,status,created_by,is_practice,source_assessment_id)
    VALUES(a.lesson_id,a.course_id,left(a.title,180)||' — draft copy',a.description,a.type,a.duration_minutes,a.passing_score,a.max_attempts,'INACTIVE',auth.uid(),a.is_practice,a.id) RETURNING id INTO v_id;
  FOR q IN SELECT * FROM public.questions WHERE assessment_id=a.id ORDER BY sequence,id LOOP
    INSERT INTO public.questions(assessment_id,question_text,question_type,options,correct_answer,marks,skill_category,sequence)
      VALUES(v_id,q.question_text,q.question_type,q.options,q.correct_answer,q.marks,q.skill_category,q.sequence) RETURNING id INTO v_question;
    INSERT INTO public.question_skills(question_id,skill_id,weight) SELECT v_question,skill_id,weight FROM public.question_skills WHERE question_id=q.id;
  END LOOP;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'ASSESSMENT_DRAFT_COPY','assessment',v_id,jsonb_build_object('source_assessment_id',a.id));
  RETURN v_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.fn_copy_assessment_to_lesson(p_assessment uuid,p_lesson uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid; result uuid;
BEGIN
 IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
 SELECT m.course_id INTO c FROM lessons l JOIN modules m ON m.id=l.module_id WHERE l.id=p_lesson;
 IF c IS NULL OR NOT EXISTS(SELECT 1 FROM assessments WHERE id=p_assessment AND course_id=c) THEN RAISE EXCEPTION 'Choose an assessment from the same learning content.'; END IF;
 result:=public.fn_copy_assessment_draft(p_assessment);
 UPDATE assessments SET lesson_id=p_lesson WHERE id=result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.fn_copy_assessment_to_lesson(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_copy_assessment_to_lesson(uuid,uuid) TO authenticated;
COMMIT;
