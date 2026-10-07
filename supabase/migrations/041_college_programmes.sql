-- One college programme, configured explicitly by its administrator.
-- Existing colleges keep legacy access until they save Programs. History is never deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS public.college_programmes (
 college_id uuid PRIMARY KEY REFERENCES public.colleges(id) ON DELETE CASCADE,
 all_skills boolean NOT NULL DEFAULT false,
 updated_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.college_programme_skills (
 college_id uuid NOT NULL REFERENCES public.college_programmes(college_id) ON DELETE CASCADE,
 skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
 PRIMARY KEY(college_id,skill_id)
);
ALTER TABLE public.college_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_programme_skills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.college_programmes,public.college_programme_skills FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.college_programmes,public.college_programme_skills TO authenticated;
GRANT ALL ON public.college_programmes,public.college_programme_skills TO service_role;
DROP POLICY IF EXISTS programme_admin_read ON public.college_programmes;
CREATE POLICY programme_admin_read ON public.college_programmes FOR SELECT TO authenticated USING(public.is_super_admin() OR public.is_college_admin(college_id));
DROP POLICY IF EXISTS programme_skills_admin_read ON public.college_programme_skills;
CREATE POLICY programme_skills_admin_read ON public.college_programme_skills FOR SELECT TO authenticated USING(public.is_super_admin() OR public.is_college_admin(college_id));

CREATE OR REPLACE FUNCTION public.fn_college_programme_has_skill(p_college uuid,p_skill uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM college_programmes cp JOIN colleges c ON c.id=cp.college_id JOIN skills s ON s.id=p_skill
 WHERE cp.college_id=p_college AND c.status='ACTIVE' AND s.status='ACTIVE' AND
 EXISTS(SELECT 1 FROM college_programme_skills cs WHERE cs.college_id=p_college AND cs.skill_id=p_skill));
$$;
-- Helpers operate on the current authenticated student, never a supplied student identity.
CREATE OR REPLACE FUNCTION public.fn_programme_skill_allowed(p_skill uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT NOT EXISTS(SELECT 1 FROM students s JOIN college_programmes cp ON cp.college_id=s.college_id WHERE s.user_id=auth.uid() AND s.account_type='COLLEGE')
 OR EXISTS(SELECT 1 FROM students s WHERE s.user_id=auth.uid() AND s.account_type='COLLEGE' AND public.fn_college_programme_has_skill(s.college_id,p_skill));
$$;
CREATE OR REPLACE FUNCTION public.fn_programme_course_allowed(p_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT NOT EXISTS(SELECT 1 FROM students s JOIN college_programmes cp ON cp.college_id=s.college_id WHERE s.user_id=auth.uid() AND s.account_type='COLLEGE')
 OR EXISTS(SELECT 1 FROM modules m JOIN courses c ON c.id=m.course_id WHERE c.id=p_course AND m.status='ACTIVE' AND public.fn_programme_skill_allowed(coalesce(m.skill_id,c.skill_id)));
$$;
CREATE OR REPLACE FUNCTION public.fn_programme_module_allowed(p_module uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM modules m JOIN courses c ON c.id=m.course_id WHERE m.id=p_module AND public.fn_programme_skill_allowed(coalesce(m.skill_id,c.skill_id)));
$$;
CREATE OR REPLACE FUNCTION public.fn_programme_assessment_allowed(p_assessment uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM assessments a WHERE a.id=p_assessment AND
 CASE WHEN a.lesson_id IS NOT NULL THEN EXISTS(SELECT 1 FROM lessons l WHERE l.id=a.lesson_id AND public.fn_programme_module_allowed(l.module_id))
 ELSE public.fn_programme_course_allowed(a.course_id) AND NOT EXISTS(SELECT 1 FROM modules m WHERE m.course_id=a.course_id AND m.status='ACTIVE' AND NOT public.fn_programme_module_allowed(m.id)) END);
$$;
REVOKE ALL ON FUNCTION public.fn_college_programme_has_skill(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fn_programme_skill_allowed(uuid),public.fn_programme_course_allowed(uuid),public.fn_programme_module_allowed(uuid),public.fn_programme_assessment_allowed(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_programme_skill_allowed(uuid),public.fn_programme_course_allowed(uuid),public.fn_programme_module_allowed(uuid),public.fn_programme_assessment_allowed(uuid) TO authenticated;

DROP POLICY IF EXISTS college_programme_skill_scope ON public.skills;
CREATE POLICY college_programme_skill_scope ON public.skills AS RESTRICTIVE FOR SELECT TO authenticated USING(public.fn_programme_skill_allowed(id));
DROP POLICY IF EXISTS college_programme_course_scope ON public.courses;
CREATE POLICY college_programme_course_scope ON public.courses AS RESTRICTIVE FOR SELECT TO authenticated USING(public.fn_programme_course_allowed(id));
DROP POLICY IF EXISTS college_programme_module_scope ON public.modules;
CREATE POLICY college_programme_module_scope ON public.modules AS RESTRICTIVE FOR SELECT TO authenticated USING(public.fn_programme_module_allowed(id));
DROP POLICY IF EXISTS college_programme_lesson_scope ON public.lessons;
CREATE POLICY college_programme_lesson_scope ON public.lessons AS RESTRICTIVE FOR SELECT TO authenticated USING(public.fn_programme_module_allowed(module_id));
DROP POLICY IF EXISTS college_programme_assessment_scope ON public.assessments;
CREATE POLICY college_programme_assessment_scope ON public.assessments AS RESTRICTIVE FOR SELECT TO authenticated USING(public.fn_programme_assessment_allowed(id));

-- Both read policies and SECURITY DEFINER learning writes must enforce skill selection.
CREATE OR REPLACE FUNCTION public.fn_guard_college_programme_learning()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a uuid; m uuid; row_data jsonb;
BEGIN
 IF auth.role()='service_role' THEN RETURN coalesce(NEW,OLD); END IF;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME='lesson_progress' THEN
  SELECT module_id INTO m FROM lessons WHERE id=(row_data->>'lesson_id')::uuid;
  IF NOT coalesce(public.fn_programme_module_allowed(m),false) THEN RAISE EXCEPTION 'This skill is not included in your college programme.'; END IF;
 ELSE
  IF TG_TABLE_NAME='assessment_attempts' THEN a:=(row_data->>'assessment_id')::uuid;
  ELSE SELECT assessment_id INTO a FROM assessment_attempts WHERE id=(row_data->>'attempt_id')::uuid; END IF;
  IF NOT coalesce(public.fn_programme_assessment_allowed(a),false) THEN RAISE EXCEPTION 'This assessment is not included in your college programme.'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_guard_college_programme_learning() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_programme_lesson ON public.lesson_progress;
CREATE TRIGGER guard_programme_lesson BEFORE INSERT OR UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.fn_guard_college_programme_learning();
DROP TRIGGER IF EXISTS guard_programme_attempt ON public.assessment_attempts;
CREATE TRIGGER guard_programme_attempt BEFORE INSERT OR UPDATE ON public.assessment_attempts FOR EACH ROW EXECUTE FUNCTION public.fn_guard_college_programme_learning();
DROP TRIGGER IF EXISTS guard_programme_answer ON public.assessment_answers;
CREATE TRIGGER guard_programme_answer BEFORE INSERT OR UPDATE ON public.assessment_answers FOR EACH ROW EXECUTE FUNCTION public.fn_guard_college_programme_learning();
CREATE OR REPLACE VIEW public.questions_public AS
SELECT q.id,q.assessment_id,q.question_text,q.question_type,q.options,q.marks,q.skill_category,q.sequence
FROM public.questions q JOIN public.assessments a ON a.id=q.assessment_id
WHERE a.status='ACTIVE' AND public.fn_can_access_course(a.course_id) AND public.fn_programme_assessment_allowed(a.id)
 AND (public.is_super_admin() OR public.fn_lesson_assessment_visible(a.lesson_id))
 AND (public.is_super_admin() OR EXISTS(SELECT 1 FROM students s JOIN enrollments e ON e.student_id=s.id WHERE s.user_id=auth.uid() AND e.course_id=a.course_id AND e.status IN ('ACTIVE','COMPLETED')));
REVOKE ALL ON public.questions_public FROM PUBLIC,anon;
GRANT SELECT ON public.questions_public TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sync_college_programme(p_college uuid,p_student uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM college_programmes WHERE college_id=p_college) THEN RETURN 0; END IF;
 INSERT INTO college_courses(college_id,course_id)
 SELECT DISTINCT p_college,c.id FROM courses c JOIN modules m ON m.course_id=c.id
 WHERE c.status='ACTIVE' AND m.status='ACTIVE' AND public.fn_college_programme_has_skill(p_college,coalesce(m.skill_id,c.skill_id))
 ON CONFLICT(college_id,course_id) DO NOTHING;
 INSERT INTO enrollments(student_id,course_id,batch_id)
 SELECT DISTINCT s.id,c.id,s.batch_id FROM students s JOIN profiles p ON p.user_id=s.user_id CROSS JOIN courses c JOIN modules m ON m.course_id=c.id
 WHERE s.college_id=p_college AND s.account_type='COLLEGE' AND s.status='ACTIVE' AND p.status='ACTIVE' AND p.role='STUDENT'
 AND (p_student IS NULL OR s.id=p_student) AND c.status='ACTIVE' AND m.status='ACTIVE'
 AND public.fn_college_programme_has_skill(p_college,coalesce(m.skill_id,c.skill_id))
 ON CONFLICT(student_id,course_id) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_sync_college_programme(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_set_college_programme(p_college uuid,p_all_skills boolean,p_skills uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; v_count integer;
BEGIN
 IF auth.uid() IS NULL OR NOT(public.is_super_admin() OR public.is_college_admin(p_college)) THEN RAISE EXCEPTION 'Active administrator access to this college is required.'; END IF;
 PERFORM 1 FROM colleges WHERE id=p_college AND status='ACTIVE' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active college.'; END IF;
 IF p_all_skills IS NULL OR p_skills IS NULL OR cardinality(p_skills)>500 THEN RAISE EXCEPTION 'Choose all skills or a valid skill list.'; END IF;
 IF p_all_skills AND NOT EXISTS(SELECT 1 FROM skills WHERE status='ACTIVE') THEN RAISE EXCEPTION 'Choose at least one active skill.'; END IF;
 IF NOT p_all_skills AND (cardinality(p_skills)=0 OR EXISTS(SELECT 1 FROM unnest(p_skills) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM skills WHERE id=x AND status='ACTIVE'))) THEN RAISE EXCEPTION 'Choose at least one active skill.'; END IF;
 -- Assessment start/submit lock the same student rows; do not change access mid-attempt.
 PERFORM 1 FROM students WHERE college_id=p_college ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM assessment_attempts a JOIN students s ON s.id=a.student_id WHERE s.college_id=p_college AND a.status='IN_PROGRESS') THEN
  RAISE EXCEPTION 'A student assessment is in progress. Save programme changes after it is completed.';
 END IF;
 -- "Select all" is a snapshot. Skills added later require an explicit selection.
 INSERT INTO college_programmes(college_id,all_skills,updated_by) VALUES(p_college,false,auth.uid())
 ON CONFLICT(college_id) DO UPDATE SET all_skills=false,updated_by=auth.uid(),updated_at=now();
 DELETE FROM college_programme_skills WHERE college_id=p_college;
 IF p_all_skills THEN INSERT INTO college_programme_skills SELECT p_college,id FROM skills WHERE status='ACTIVE';
 ELSE INSERT INTO college_programme_skills SELECT DISTINCT p_college,x FROM unnest(p_skills) x; END IF;
 n:=public.fn_sync_college_programme(p_college);
 SELECT count(*) INTO v_count FROM skills WHERE public.fn_college_programme_has_skill(p_college,id);
 INSERT INTO audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'COLLEGE_PROGRAMME_SAVED','college',p_college,jsonb_build_object('all_skills',p_all_skills,'skills',p_skills,'enrolments_added',n));
 RETURN jsonb_build_object('skills',v_count,'enrolments_added',n);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_set_college_programme(uuid,boolean,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_set_college_programme(uuid,boolean,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sync_programme_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.account_type='COLLEGE' AND NEW.status='ACTIVE' AND NEW.college_id IS NOT NULL THEN PERFORM public.fn_sync_college_programme(NEW.college_id,NEW.id); END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_programme_membership ON public.students;
CREATE TRIGGER sync_programme_membership AFTER INSERT OR UPDATE OF college_id,account_type,status ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_sync_programme_membership();
CREATE OR REPLACE FUNCTION public.fn_sync_published_programmes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid;
BEGIN
 IF NEW.status='ACTIVE' THEN
  FOR c IN SELECT college_id FROM college_programmes ORDER BY college_id LOOP PERFORM public.fn_sync_college_programme(c); END LOOP;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_sync_programme_membership(),public.fn_sync_published_programmes() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_published_programmes ON public.modules;
CREATE TRIGGER sync_published_programmes AFTER INSERT OR UPDATE OF status,skill_id,course_id ON public.modules FOR EACH ROW EXECUTE FUNCTION public.fn_sync_published_programmes();
DROP TRIGGER IF EXISTS sync_published_programmes ON public.courses;
CREATE TRIGGER sync_published_programmes AFTER INSERT OR UPDATE OF status,skill_id ON public.courses FOR EACH ROW EXECUTE FUNCTION public.fn_sync_published_programmes();
DROP TRIGGER IF EXISTS sync_published_programmes ON public.skills;
CREATE TRIGGER sync_published_programmes AFTER INSERT OR UPDATE OF status ON public.skills FOR EACH ROW EXECUTE FUNCTION public.fn_sync_published_programmes();
COMMIT;
