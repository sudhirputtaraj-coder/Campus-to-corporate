-- Employer access is aggregate college readiness only. Preserve historical records.
BEGIN;
REVOKE ALL ON TABLE public.employer_jobs, public.job_applications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_save_employer_job(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_save_employer_job_details(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT,DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_student_job_posts(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_apply_for_job(UUID,TEXT,BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_change_application_status(UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_my_job_applications(INTEGER) FROM PUBLIC, anon, authenticated;
-- Existing RLS remains enabled; owner/service-role maintenance access is retained.
-- fn_employer_college_readiness continues to enforce active approved employer access.
COMMIT;
