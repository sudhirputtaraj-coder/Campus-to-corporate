BEGIN;
CREATE TABLE IF NOT EXISTS public.employer_jobs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES public.employer_companies(id),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 2 AND 200),
 location TEXT NOT NULL CHECK(length(btrim(location)) BETWEEN 2 AND 200),
 requirements TEXT NOT NULL CHECK(length(btrim(requirements)) BETWEEN 20 AND 10000),
 minimum_score NUMERIC(5,2) NOT NULL CHECK(minimum_score BETWEEN 0 AND 100),
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','CLOSED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employer_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.employer_jobs TO authenticated;
DROP POLICY IF EXISTS "Employers read own job posts" ON public.employer_jobs;
CREATE POLICY "Employers read own job posts" ON public.employer_jobs FOR SELECT TO authenticated USING (
 public.is_super_admin() OR EXISTS(SELECT 1 FROM public.employer_companies c JOIN public.profiles p ON p.user_id=c.user_id
 WHERE c.id=company_id AND c.user_id=auth.uid() AND c.status='ACTIVE' AND p.role='EMPLOYER' AND p.status='ACTIVE')
);

CREATE OR REPLACE FUNCTION public.fn_save_employer_job(p_id UUID,p_title TEXT,p_location TEXT,p_requirements TEXT,p_minimum_score NUMERIC,p_status TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE company UUID; result UUID;
BEGIN
 SELECT c.id INTO company FROM public.employer_companies c JOIN public.profiles p ON p.user_id=c.user_id
 WHERE c.user_id=auth.uid() AND c.status='ACTIVE' AND p.role='EMPLOYER' AND p.status='ACTIVE' FOR SHARE OF c,p;
 IF company IS NULL THEN RAISE EXCEPTION 'Active approved employer access required.'; END IF;
 IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 2 AND 200 OR p_location IS NULL OR length(btrim(p_location)) NOT BETWEEN 2 AND 200
 OR p_requirements IS NULL OR length(btrim(p_requirements)) NOT BETWEEN 20 AND 10000 OR p_minimum_score IS NULL OR NOT (p_minimum_score BETWEEN 0 AND 100)
 OR p_status IS NULL OR p_status NOT IN ('DRAFT','PUBLISHED','CLOSED') THEN RAISE EXCEPTION 'Check the job details and score threshold.'; END IF;
 IF p_id IS NULL THEN
 INSERT INTO public.employer_jobs(company_id,title,location,requirements,minimum_score,status)
 VALUES(company,btrim(p_title),btrim(p_location),btrim(p_requirements),p_minimum_score,p_status) RETURNING id INTO result;
 ELSE
 UPDATE public.employer_jobs SET title=btrim(p_title),location=btrim(p_location),requirements=btrim(p_requirements),minimum_score=p_minimum_score,status=p_status,updated_at=now()
 WHERE id=p_id AND company_id=company RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Job post is not available to this employer.'; END IF;
 END IF;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'EMPLOYER_JOB_SAVED','job',result,jsonb_build_object('status',p_status));
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_save_employer_job(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_employer_job(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT) TO authenticated;

-- Aggregate-only: no student names, IDs, contact details or individual score records.
-- Existing Phase 3 schema must be installed; never substitute an invented score.
CREATE OR REPLACE FUNCTION public.fn_employer_college_readiness(p_minimum_score NUMERIC,p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.employer_companies c JOIN public.profiles p ON p.user_id=c.user_id
   WHERE c.user_id=auth.uid() AND c.status='ACTIVE' AND p.role='EMPLOYER' AND p.status='ACTIVE') THEN RAISE EXCEPTION 'Active approved employer access required.'; END IF;
 IF p_minimum_score IS NULL OR NOT (p_minimum_score BETWEEN 0 AND 100) OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Invalid filter.'; END IF;
 IF to_regclass('public.student_employability_scores') IS NULL THEN
   RETURN jsonb_build_object('available',false,'colleges','[]'::jsonb);
 END IF;
 EXECUTE $query$
 WITH latest AS (
   SELECT DISTINCT ON (student_id) student_id,score,is_provisional,computed_at
   FROM public.student_employability_scores ORDER BY student_id,computed_at DESC,id DESC
 ), counts AS (
   SELECT c.id,c.name,c.code,count(s.id) AS active_students,
     count(s.id) FILTER(WHERE l.is_provisional=false AND l.score BETWEEN 0 AND 100) AS measured_students,
     count(s.id) FILTER(WHERE l.is_provisional=false AND l.score BETWEEN $1 AND 100) AS qualifying_students,
     max(l.computed_at) FILTER(WHERE l.is_provisional=false AND l.score BETWEEN 0 AND 100) AS latest_measurement
   FROM public.colleges c
   LEFT JOIN (public.students s JOIN public.profiles p ON p.user_id=s.user_id AND p.role='STUDENT' AND p.status='ACTIVE')
     ON s.college_id=c.id AND s.account_type='COLLEGE' AND s.status='ACTIVE'
   LEFT JOIN latest l ON l.student_id=s.id
   WHERE c.status='ACTIVE' GROUP BY c.id,c.name,c.code
 ), page AS (SELECT * FROM counts ORDER BY qualifying_students DESC,name,id LIMIT 25 OFFSET ($2-1)*25)
 SELECT jsonb_build_object('available',true,'total',(SELECT count(*) FROM counts),'colleges',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb))
 $query$ INTO result USING p_minimum_score,p_page;
 RETURN result;
EXCEPTION WHEN undefined_column THEN
 RETURN jsonb_build_object('available',false,'colleges','[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_employer_college_readiness(NUMERIC,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_employer_college_readiness(NUMERIC,INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_student_job_posts(p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.students s ON s.user_id=p.user_id
 WHERE p.user_id=auth.uid() AND p.role='STUDENT' AND p.status='ACTIVE' AND s.status='ACTIVE') THEN RAISE EXCEPTION 'Active student access required.'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Invalid page.'; END IF;
 WITH visible AS (
 SELECT j.id,j.title,j.location,j.requirements,j.minimum_score,j.created_at,c.name AS company_name
 FROM public.employer_jobs j JOIN public.employer_companies c ON c.id=j.company_id JOIN public.profiles p ON p.user_id=c.user_id
 WHERE j.status='PUBLISHED' AND c.status='ACTIVE' AND p.role='EMPLOYER' AND p.status='ACTIVE'
 ), page AS(SELECT * FROM visible ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM visible),'jobs',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_student_job_posts(INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_student_job_posts(INTEGER) TO authenticated;
COMMIT;
