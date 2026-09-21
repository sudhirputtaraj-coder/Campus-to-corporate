BEGIN;
-- Serialize mapping changes and attempt creation on the assessment row. Once an
-- assessment has been used, retain its evidence definition for historical scores.
CREATE FUNCTION public.fn_lock_question_skill_definition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assessment UUID; qid UUID;
BEGIN
  FOR qid IN SELECT DISTINCT x FROM unnest(CASE WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.question_id]
    WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.question_id] ELSE ARRAY[OLD.question_id, NEW.question_id] END) x ORDER BY x LOOP
    SELECT assessment_id INTO assessment FROM public.questions WHERE id = qid;
    PERFORM 1 FROM public.assessments WHERE id = assessment FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.assessment_attempts WHERE assessment_id = assessment) THEN
      RAISE EXCEPTION 'Skill mappings are locked after the first attempt. Create a new assessment to change them.';
    END IF;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER lock_question_skill_definition BEFORE INSERT OR UPDATE OR DELETE ON public.question_skills
FOR EACH ROW EXECUTE FUNCTION public.fn_lock_question_skill_definition();

CREATE FUNCTION public.fn_lock_assessment_start()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.assessments WHERE id = NEW.assessment_id FOR UPDATE;
  RETURN NEW;
END;
$$;
CREATE TRIGGER lock_assessment_start BEFORE INSERT ON public.assessment_attempts
FOR EACH ROW EXECUTE FUNCTION public.fn_lock_assessment_start();

CREATE FUNCTION public.fn_set_question_skills(p_question_id UUID, p_mappings JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE assessment UUID;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin required'; END IF;
  IF jsonb_typeof(p_mappings) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Mappings must be an array'; END IF;
  IF jsonb_array_length(p_mappings) > 100 THEN RAISE EXCEPTION 'Too many skill mappings'; END IF;
  SELECT assessment_id INTO assessment FROM public.questions WHERE id = p_question_id;
  IF assessment IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;
  PERFORM 1 FROM public.assessments WHERE id = assessment FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.assessment_attempts WHERE assessment_id = assessment) THEN
    RAISE EXCEPTION 'Skill mappings are locked after the first attempt. Create a new assessment to change them.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_mappings) AS m(skill_id UUID, weight NUMERIC)
    LEFT JOIN public.skills s ON s.id = m.skill_id
    WHERE s.id IS NULL OR s.status <> 'ACTIVE' OR m.weight IS NULL OR m.weight <= 0 OR m.weight > 1
      OR m.weight <> round(m.weight,4)) THEN RAISE EXCEPTION 'Choose active skills and valid weights'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_mappings) AS m(skill_id UUID, weight NUMERIC)
    GROUP BY skill_id HAVING count(*) > 1) THEN RAISE EXCEPTION 'Duplicate skill'; END IF;
  IF jsonb_array_length(p_mappings) > 0 AND (SELECT sum(weight) FROM jsonb_to_recordset(p_mappings) AS m(skill_id UUID, weight NUMERIC)) <> 1 THEN
    RAISE EXCEPTION 'Skill percentages must total 100';
  END IF;
  DELETE FROM public.question_skills WHERE question_id = p_question_id;
  INSERT INTO public.question_skills(question_id,skill_id,weight)
    SELECT p_question_id, skill_id, weight FROM jsonb_to_recordset(p_mappings) AS m(skill_id UUID,weight NUMERIC);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_set_question_skills(UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_set_question_skills(UUID,JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_lock_question_skill_definition(), public.fn_lock_assessment_start() FROM PUBLIC;
COMMIT;
