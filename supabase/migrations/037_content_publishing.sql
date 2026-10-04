-- Apply after 036. Existing content and student records keep their current state.
BEGIN;
ALTER TABLE public.courses ALTER COLUMN status SET DEFAULT 'INACTIVE';
ALTER TABLE public.modules ALTER COLUMN status SET DEFAULT 'INACTIVE';
ALTER TABLE public.lessons ALTER COLUMN status SET DEFAULT 'INACTIVE';
ALTER TABLE public.assessments ALTER COLUMN status SET DEFAULT 'INACTIVE';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS source_assessment_id UUID REFERENCES public.assessments(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.fn_validate_assessment_publication()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count INTEGER;
BEGIN
  IF NEW.status<>'ACTIVE' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status='ACTIVE' THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count FROM public.questions WHERE assessment_id=NEW.id;
  IF v_count NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Add between 1 and 200 questions before publishing.'; END IF;
  IF NEW.duration_minutes IS NULL OR NEW.duration_minutes NOT BETWEEN 1 AND 240 OR NEW.max_attempts NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Set a duration of 1–240 minutes and 1–20 attempts.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.questions q WHERE q.assessment_id=NEW.id AND
    (q.question_type NOT IN ('MCQ','MULTIPLE_CHOICE','TRUE_FALSE') OR coalesce(btrim(q.question_text),'')='' OR coalesce(btrim(q.correct_answer),'')=''
      OR q.marks<=0 OR q.marks::text='NaN' OR jsonb_typeof(q.options) IS DISTINCT FROM 'array')) THEN
    RAISE EXCEPTION 'Every question needs text, positive marks, choices and an automatic answer key.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.questions q WHERE q.assessment_id=NEW.id AND
    (jsonb_array_length(q.options) NOT BETWEEN 2 AND 10 OR
      (SELECT count(DISTINCT lower(btrim(value))) FROM jsonb_array_elements_text(q.options))<>jsonb_array_length(q.options) OR
      EXISTS(SELECT 1 FROM jsonb_array_elements(q.options) v WHERE jsonb_typeof(v)<>'string' OR length(btrim(v#>>'{}'))=0) OR
      NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(q.options) v WHERE lower(btrim(v))=lower(btrim(q.correct_answer))))) THEN
    RAISE EXCEPTION 'Use 2–10 distinct text choices and an answer matching one of them.';
  END IF;
  IF NOT NEW.is_practice THEN
    IF EXISTS(SELECT 1 FROM public.questions q WHERE q.assessment_id=NEW.id AND NOT EXISTS(
      SELECT 1 FROM public.question_skills qs JOIN public.skills s ON s.id=qs.skill_id WHERE qs.question_id=q.id AND s.status='ACTIVE')) THEN
      RAISE EXCEPTION 'Map every formal question to an active skill before publishing.';
    END IF;
    IF EXISTS(SELECT qs.skill_id FROM public.question_skills qs JOIN public.questions q ON q.id=qs.question_id
      WHERE q.assessment_id=NEW.id GROUP BY qs.skill_id HAVING count(*)<3) THEN
      RAISE EXCEPTION 'Each measured skill needs at least three mapped questions. Add evidence or use a practice assessment.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_assessment_publication ON public.assessments;
CREATE TRIGGER validate_assessment_publication BEFORE INSERT OR UPDATE OF status ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_assessment_publication();

-- Questions of published assessments are edited only after hiding the assessment.
-- Migration 035 still locks all attempted definitions, even after hiding.
CREATE OR REPLACE FUNCTION public.fn_guard_published_question()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id UUID; v_ids UUID[];
BEGIN
  v_ids:=CASE WHEN TG_OP='INSERT' THEN ARRAY[NEW.assessment_id] WHEN TG_OP='DELETE' THEN ARRAY[OLD.assessment_id] ELSE ARRAY[OLD.assessment_id,NEW.assessment_id] END;
  FOR v_id IN SELECT DISTINCT x FROM unnest(v_ids) x ORDER BY x LOOP
    PERFORM 1 FROM public.assessments WHERE id=v_id AND status='ACTIVE' FOR UPDATE;
    IF FOUND THEN RAISE EXCEPTION 'Hide this assessment before editing questions, or create a draft copy if it has attempts.'; END IF;
  END LOOP;
  RETURN coalesce(NEW,OLD);
END;
$$;
DROP TRIGGER IF EXISTS guard_published_question ON public.questions;
CREATE TRIGGER guard_published_question BEFORE INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_published_question();

CREATE OR REPLACE FUNCTION public.fn_set_content_visibility(p_kind TEXT,p_id UUID,p_publish BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status public.entity_status; v_course UUID;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
  IF p_publish IS NULL THEN RAISE EXCEPTION 'Choose publish or hide.'; END IF;
  v_status:=CASE WHEN p_publish THEN 'ACTIVE'::public.entity_status ELSE 'INACTIVE'::public.entity_status END;
  IF p_kind='course' THEN
    PERFORM 1 FROM public.courses WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Course not found.'; END IF;
    IF p_publish AND NOT EXISTS(SELECT 1 FROM public.modules m JOIN public.lessons l ON l.module_id=m.id
      WHERE m.course_id=p_id AND m.status='ACTIVE' AND l.status='ACTIVE' AND
        (m.skill_id IS NULL OR EXISTS(SELECT 1 FROM public.skills s WHERE s.id=m.skill_id AND s.status='ACTIVE'))) THEN
      RAISE EXCEPTION 'Publish at least one module and lesson before publishing the course.';
    END IF;
    IF NOT p_publish AND EXISTS(SELECT 1 FROM public.assessment_attempts a JOIN public.assessments s ON s.id=a.assessment_id WHERE s.course_id=p_id AND a.status='IN_PROGRESS') THEN
      RAISE EXCEPTION 'An assessment is in progress. Keep this course available until it is resolved.';
    END IF;
    UPDATE public.courses SET status=v_status WHERE id=p_id;
  ELSIF p_kind='assessment' THEN
    SELECT course_id INTO v_course FROM public.assessments WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found.'; END IF;
    IF NOT p_publish AND EXISTS(SELECT 1 FROM public.assessment_attempts WHERE assessment_id=p_id AND status='IN_PROGRESS') THEN
      RAISE EXCEPTION 'An attempt is in progress. Keep this assessment available until it is resolved.';
    END IF;
    UPDATE public.assessments SET status=v_status WHERE id=p_id;
  ELSE RAISE EXCEPTION 'Unknown content type.'; END IF;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'CONTENT_VISIBILITY',p_kind,p_id,jsonb_build_object('status',v_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_copy_assessment_draft(p_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.assessments%ROWTYPE; q public.questions%ROWTYPE; v_id UUID; v_question UUID;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
  SELECT * INTO a FROM public.assessments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found.'; END IF;
  INSERT INTO public.assessments(course_id,title,description,type,duration_minutes,passing_score,max_attempts,status,created_by,is_practice,source_assessment_id)
    VALUES(a.course_id,left(a.title,180)||' — draft copy',a.description,a.type,a.duration_minutes,a.passing_score,a.max_attempts,'INACTIVE',auth.uid(),a.is_practice,a.id) RETURNING id INTO v_id;
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
DROP POLICY IF EXISTS "Published assessment content only" ON public.assessments;
CREATE POLICY "Published assessment content only" ON public.assessments AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING(public.is_super_admin() OR (status='ACTIVE' AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.status='ACTIVE')));
REVOKE ALL ON FUNCTION public.fn_validate_assessment_publication(),public.fn_guard_published_question() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fn_set_content_visibility(TEXT,UUID,BOOLEAN),public.fn_copy_assessment_draft(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_set_content_visibility(TEXT,UUID,BOOLEAN),public.fn_copy_assessment_draft(UUID) TO authenticated;
COMMIT;
