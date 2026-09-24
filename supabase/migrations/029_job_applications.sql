BEGIN;
ALTER TABLE public.employer_jobs ADD COLUMN IF NOT EXISTS qualifications TEXT NOT NULL DEFAULT '';
ALTER TABLE public.employer_jobs ADD COLUMN IF NOT EXISTS required_skills TEXT NOT NULL DEFAULT '';
ALTER TABLE public.employer_jobs ADD COLUMN IF NOT EXISTS openings INTEGER NOT NULL DEFAULT 1 CHECK(openings BETWEEN 1 AND 10000);
ALTER TABLE public.employer_jobs ADD COLUMN IF NOT EXISTS experience_months INTEGER NOT NULL DEFAULT 0 CHECK(experience_months BETWEEN 0 AND 600);
ALTER TABLE public.employer_jobs ADD COLUMN IF NOT EXISTS work_mode TEXT NOT NULL DEFAULT 'ONSITE' CHECK(work_mode IN ('ONSITE','HYBRID','REMOTE'));
ALTER TABLE public.employer_jobs ADD COLUMN IF NOT EXISTS application_deadline DATE;
CREATE TABLE IF NOT EXISTS public.job_applications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),job_id UUID NOT NULL REFERENCES public.employer_jobs(id),
 student_id UUID NOT NULL REFERENCES public.students(id),cover_note TEXT NOT NULL DEFAULT '' CHECK(length(cover_note)<=4000),
 status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','UNDER_REVIEW','SHORTLISTED','REJECTED','WITHDRAWN')),
 consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),consent_version TEXT NOT NULL DEFAULT 'job-application-v1',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(job_id,student_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_applications FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS job_applications_student ON public.job_applications(student_id);
CREATE OR REPLACE FUNCTION public.fn_save_employer_job_details(p_id UUID,p_title TEXT,p_location TEXT,p_requirements TEXT,p_minimum_score NUMERIC,p_status TEXT,p_qualifications TEXT,p_required_skills TEXT,p_openings INTEGER,p_experience_months INTEGER,p_work_mode TEXT,p_deadline DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result UUID;
BEGIN
 IF length(coalesce(p_qualifications,''))>2000 OR length(coalesce(p_required_skills,''))>2000 OR p_openings IS NULL OR p_openings NOT BETWEEN 1 AND 10000 OR p_experience_months IS NULL OR p_experience_months NOT BETWEEN 0 AND 600 OR p_work_mode IS NULL OR p_work_mode NOT IN ('ONSITE','HYBRID','REMOTE') THEN RAISE EXCEPTION 'Invalid job details'; END IF;
 IF p_status='PUBLISHED' AND p_deadline IS NOT NULL AND p_deadline < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Choose a current or future application deadline'; END IF;
 result:=public.fn_save_employer_job(p_id,p_title,p_location,p_requirements,p_minimum_score,p_status);
 UPDATE public.employer_jobs SET qualifications=coalesce(p_qualifications,''),required_skills=coalesce(p_required_skills,''),openings=p_openings,experience_months=p_experience_months,work_mode=p_work_mode,application_deadline=p_deadline WHERE id=result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.fn_apply_for_job(p_job_id UUID,p_cover_note TEXT,p_consent BOOLEAN)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE student UUID; result UUID;
BEGIN
 IF p_consent IS DISTINCT FROM true OR length(coalesce(p_cover_note,''))>4000 THEN RAISE EXCEPTION 'Consent and a valid application note are required'; END IF;
 SELECT s.id INTO student FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id WHERE s.user_id=auth.uid() AND s.status='ACTIVE' AND p.role='STUDENT' AND p.status='ACTIVE' FOR UPDATE OF s;
 IF student IS NULL THEN RAISE EXCEPTION 'Active student access required'; END IF;
 PERFORM 1 FROM public.employer_jobs j JOIN public.employer_companies c ON c.id=j.company_id JOIN public.profiles p ON p.user_id=c.user_id WHERE j.id=p_job_id AND j.status='PUBLISHED' AND c.status='ACTIVE' AND p.role='EMPLOYER' AND p.status='ACTIVE' AND (j.application_deadline IS NULL OR j.application_deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date) FOR SHARE OF j;
 IF NOT FOUND THEN RAISE EXCEPTION 'This job is not open for applications'; END IF;
 INSERT INTO public.job_applications(job_id,student_id,cover_note) VALUES(p_job_id,student,coalesce(p_cover_note,'')) ON CONFLICT(job_id,student_id) DO NOTHING;
 SELECT id INTO result FROM public.job_applications WHERE job_id=p_job_id AND student_id=student;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.fn_change_application_status(p_id UUID,p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE application public.job_applications; caller_role public.user_role;
BEGIN
 SELECT p.role INTO caller_role FROM public.profiles p WHERE user_id=auth.uid() AND status='ACTIVE';
 SELECT * INTO application FROM public.job_applications WHERE id=p_id FOR UPDATE;
 IF application.id IS NULL THEN RAISE EXCEPTION 'Application not available'; END IF;
 IF caller_role='STUDENT' AND p_status='WITHDRAWN' AND EXISTS(SELECT 1 FROM public.students WHERE id=application.student_id AND user_id=auth.uid() AND status='ACTIVE') THEN NULL;
 ELSIF caller_role='EMPLOYER' AND p_status IN ('UNDER_REVIEW','SHORTLISTED','REJECTED') AND application.status<>'WITHDRAWN' AND EXISTS(SELECT 1 FROM public.employer_jobs j JOIN public.employer_companies c ON c.id=j.company_id WHERE j.id=application.job_id AND c.user_id=auth.uid() AND c.status='ACTIVE') THEN NULL;
 ELSE RAISE EXCEPTION 'Application update not permitted'; END IF;
 UPDATE public.job_applications SET status=p_status,updated_at=now() WHERE id=p_id;
END $$;
CREATE OR REPLACE FUNCTION public.fn_my_job_applications(p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE caller_role public.user_role; result JSONB;
BEGIN
 SELECT p.role INTO caller_role FROM public.profiles p WHERE user_id=auth.uid() AND status='ACTIVE';
 IF caller_role IS NULL OR caller_role NOT IN ('STUDENT','EMPLOYER') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Application access denied'; END IF;
 WITH visible AS (
 SELECT a.id,a.job_id,j.title,c.name AS company_name,a.status,a.created_at,a.cover_note,
 CASE WHEN caller_role='EMPLOYER' AND a.status<>'WITHDRAWN' THEN p.full_name ELSE NULL END AS applicant_name,
 CASE WHEN caller_role='EMPLOYER' AND a.status<>'WITHDRAWN' THEN p.email ELSE NULL END AS applicant_email
 FROM public.job_applications a JOIN public.students s ON s.id=a.student_id JOIN public.profiles p ON p.user_id=s.user_id
 JOIN public.employer_jobs j ON j.id=a.job_id JOIN public.employer_companies c ON c.id=j.company_id
 WHERE (caller_role='STUDENT' AND s.user_id=auth.uid() AND s.status='ACTIVE') OR (caller_role='EMPLOYER' AND c.user_id=auth.uid() AND c.status='ACTIVE' AND a.status<>'WITHDRAWN' AND s.status='ACTIVE' AND p.status='ACTIVE')
 ), page AS(SELECT * FROM visible ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM visible),'applications',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.fn_student_job_posts(p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.students s ON s.user_id=p.user_id
 WHERE p.user_id=auth.uid() AND p.role='STUDENT' AND p.status='ACTIVE' AND s.status='ACTIVE') THEN RAISE EXCEPTION 'Active student access required.'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Invalid page.'; END IF;
 WITH visible AS (
 SELECT j.id,j.title,j.location,j.requirements,j.minimum_score,j.created_at,j.qualifications,j.required_skills,j.openings,j.experience_months,j.work_mode,j.application_deadline,c.name AS company_name
 FROM public.employer_jobs j JOIN public.employer_companies c ON c.id=j.company_id JOIN public.profiles p ON p.user_id=c.user_id
 WHERE (j.application_deadline IS NULL OR j.application_deadline >= (now() AT TIME ZONE 'Asia/Kolkata')::date) AND j.status='PUBLISHED' AND c.status='ACTIVE' AND p.role='EMPLOYER' AND p.status='ACTIVE'
 ), page AS(SELECT * FROM visible ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM visible),'jobs',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_student_job_posts(INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_student_job_posts(INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_save_employer_job_details(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT,DATE) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_employer_job_details(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT,DATE) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_apply_for_job(UUID,TEXT,BOOLEAN) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_apply_for_job(UUID,TEXT,BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_change_application_status(UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_change_application_status(UUID,TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_my_job_applications(INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_my_job_applications(INTEGER) TO authenticated;
COMMIT;
