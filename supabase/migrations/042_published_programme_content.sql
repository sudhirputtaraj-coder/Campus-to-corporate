-- Keep active individual programme enrolments in sync with published content.
-- College access continues to use the explicit skill selections from 041.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_sync_individual_programme(p_student uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO enrollments(student_id,course_id,status)
 SELECT s.id,c.id,'ACTIVE'::enrollment_status
 FROM students s JOIN profiles p ON p.user_id=s.user_id CROSS JOIN courses c
 WHERE s.account_type='INDIVIDUAL' AND s.status='ACTIVE' AND p.role='STUDENT' AND p.status='ACTIVE'
 AND (p_student IS NULL OR s.id=p_student) AND c.status='ACTIVE'
 AND (EXISTS(SELECT 1 FROM programme_free_access f WHERE f.student_id=s.id AND f.activated_at<=now() AND f.expires_at>now())
 OR EXISTS(SELECT 1 FROM programme_purchases pp JOIN programme_settings ps ON ps.id=pp.programme_id
 WHERE pp.student_id=s.id AND pp.programme_id='corporate-readiness' AND pp.status='PAID'
 AND pp.payment_mode=ps.payment_mode AND pp.activated_at<=now() AND pp.expires_at>now()))
 ON CONFLICT(student_id,course_id) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.fn_sync_individual_programme(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_sync_individual_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='ACTIVE' THEN PERFORM public.fn_sync_individual_programme(); END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.fn_sync_individual_publication() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_individual_publication ON public.courses;
CREATE TRIGGER sync_individual_publication AFTER INSERT OR UPDATE OF status ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_individual_publication();

CREATE OR REPLACE FUNCTION public.fn_sync_individual_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
 IF TG_TABLE_NAME='students' THEN sid:=NEW.id;
 ELSIF TG_TABLE_NAME='profiles' THEN SELECT id INTO sid FROM students WHERE user_id=NEW.user_id;
 ELSE sid:=NEW.student_id; END IF;
 IF sid IS NOT NULL THEN PERFORM public.fn_sync_individual_programme(sid); END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.fn_sync_individual_access() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_individual_access ON public.programme_free_access;
CREATE TRIGGER sync_individual_access AFTER INSERT OR UPDATE ON public.programme_free_access FOR EACH ROW EXECUTE FUNCTION public.fn_sync_individual_access();
DROP TRIGGER IF EXISTS sync_individual_access ON public.programme_purchases;
CREATE TRIGGER sync_individual_access AFTER INSERT OR UPDATE ON public.programme_purchases FOR EACH ROW EXECUTE FUNCTION public.fn_sync_individual_access();
DROP TRIGGER IF EXISTS sync_individual_access ON public.students;
CREATE TRIGGER sync_individual_access AFTER INSERT OR UPDATE OF status,account_type ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_sync_individual_access();
DROP TRIGGER IF EXISTS sync_individual_access ON public.profiles;
CREATE TRIGGER sync_individual_access AFTER UPDATE OF status,role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_sync_individual_access();

-- Backfill missing access only. Preserve completed, withdrawn and existing enrolments.
SELECT public.fn_sync_individual_programme();
DO $$ DECLARE c uuid; BEGIN
 FOR c IN SELECT college_id FROM public.college_programmes LOOP PERFORM public.fn_sync_college_programme(c); END LOOP;
END $$;
COMMIT;
