BEGIN;
CREATE TABLE IF NOT EXISTS public.employer_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 200),
  website TEXT CHECK(website IS NULL OR (website LIKE 'https://%' AND length(website)<=2048)),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=5000),
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employer_companies FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.employer_companies TO authenticated;
DROP POLICY IF EXISTS "Company owner or platform admin reads company" ON public.employer_companies;
CREATE POLICY "Company owner or platform admin reads company" ON public.employer_companies FOR SELECT TO authenticated
USING(public.is_super_admin() OR (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.role='EMPLOYER' AND p.status='ACTIVE')));

CREATE OR REPLACE FUNCTION public.fn_setup_professional_account(p_email TEXT,p_kind TEXT,p_college_id UUID DEFAULT NULL,p_company_name TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target public.profiles; learner public.students; existing_trainer public.trainers;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access required.'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('TRAINER','EMPLOYER') THEN RAISE EXCEPTION 'Choose Trainer or Employer.'; END IF;
  SELECT * INTO target FROM public.profiles WHERE lower(email)=lower(btrim(p_email)) FOR UPDATE;
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

CREATE OR REPLACE FUNCTION public.fn_update_employer_company(p_name TEXT,p_website TEXT,p_description TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='EMPLOYER' AND status='ACTIVE') THEN RAISE EXCEPTION 'Active employer access required.'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 2 AND 200 OR p_description IS NULL OR length(p_description)>5000
    OR (p_website IS NOT NULL AND (p_website NOT LIKE 'https://%' OR length(p_website)>2048)) THEN RAISE EXCEPTION 'Check the company details.'; END IF;
  UPDATE public.employer_companies SET name=btrim(p_name),website=p_website,description=p_description WHERE user_id=auth.uid() AND status='ACTIVE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Company access is not active.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_update_employer_company(TEXT,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_update_employer_company(TEXT,TEXT,TEXT) TO authenticated;

-- Replace permissive legacy trainer self-updates and assignment writes with a checked RPC.
REVOKE INSERT,UPDATE,DELETE ON public.trainers,public.trainer_batch_assignments FROM authenticated;
CREATE OR REPLACE FUNCTION public.is_trainer_of_batch(p_batch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.trainer_batch_assignments a
 JOIN public.trainers t ON t.id=a.trainer_id JOIN public.profiles p ON p.user_id=t.user_id
 JOIN public.batches b ON b.id=a.batch_id JOIN public.colleges c ON c.id=t.college_id
 WHERE t.user_id=auth.uid() AND p.role='TRAINER' AND p.status='ACTIVE' AND t.status='ACTIVE'
 AND a.status='ACTIVE' AND b.status='ACTIVE' AND c.status='ACTIVE' AND b.college_id=t.college_id AND a.batch_id=p_batch_id);
$$;
CREATE OR REPLACE FUNCTION public.get_trainer_batch_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT b.id FROM public.batches b WHERE public.is_trainer_of_batch(b.id);
$$;
CREATE OR REPLACE FUNCTION public.fn_assign_trainer_batch(p_trainer_id UUID,p_batch_id UUID,p_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE trainer public.trainers; batch public.batches;
BEGIN
 SELECT * INTO trainer FROM public.trainers WHERE id=p_trainer_id FOR UPDATE;
 SELECT * INTO batch FROM public.batches WHERE id=p_batch_id FOR SHARE;
 IF trainer.id IS NULL OR batch.id IS NULL OR trainer.college_id<>batch.college_id THEN RAISE EXCEPTION 'Choose a trainer and batch from the same college.'; END IF;
 IF NOT(public.is_super_admin() OR trainer.college_id IN (SELECT public.get_admin_college_ids())) THEN RAISE EXCEPTION 'College administrator access required.'; END IF;
 IF p_active IS NULL THEN RAISE EXCEPTION 'Choose assignment status.'; END IF;
 IF p_active AND (trainer.status<>'ACTIVE' OR batch.status<>'ACTIVE'
   OR NOT EXISTS(SELECT 1 FROM public.colleges WHERE id=trainer.college_id AND status='ACTIVE')
   OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=trainer.user_id AND role='TRAINER' AND status='ACTIVE')) THEN RAISE EXCEPTION 'Trainer, account, batch and college must be active.'; END IF;
 INSERT INTO public.trainer_batch_assignments(trainer_id,batch_id,status)
 VALUES(p_trainer_id,p_batch_id,CASE WHEN p_active THEN 'ACTIVE'::public.entity_status ELSE 'INACTIVE'::public.entity_status END)
 ON CONFLICT(trainer_id,batch_id) DO UPDATE SET status=excluded.status;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
 VALUES(auth.uid(),'TRAINER_BATCH_ASSIGNMENT','trainer',p_trainer_id,jsonb_build_object('batch_id',p_batch_id,'active',p_active));
END;
$$;
REVOKE ALL ON FUNCTION public.fn_assign_trainer_batch(UUID,UUID,BOOLEAN) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_assign_trainer_batch(UUID,UUID,BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_trainer_batch_progress(p_batch_id UUID,p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB; total INTEGER;
BEGIN
 IF NOT public.is_trainer_of_batch(p_batch_id) THEN RAISE EXCEPTION 'An active assignment to this batch is required.'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Invalid page.'; END IF;
 SELECT count(*) INTO total FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id
 WHERE s.batch_id=p_batch_id AND s.college_id=(SELECT college_id FROM public.batches WHERE id=p_batch_id)
 AND s.status='ACTIVE' AND s.account_type='COLLEGE' AND p.status='ACTIVE' AND p.role='STUDENT';
 SELECT coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) INTO result FROM (
   SELECT s.id,p.full_name,s.register_number,
    (SELECT count(*) FROM public.enrollments e WHERE e.student_id=s.id AND e.status IN ('ACTIVE','COMPLETED')) AS course_count,
    (SELECT round(avg(e.completion_percentage),2) FROM public.enrollments e WHERE e.student_id=s.id AND e.status IN ('ACTIVE','COMPLETED')) AS average_progress,
    (SELECT count(*) FROM public.assessment_attempts a WHERE a.student_id=s.id AND a.status='GRADED') AS graded_attempts
   FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id
   WHERE s.batch_id=p_batch_id AND s.college_id=(SELECT college_id FROM public.batches WHERE id=p_batch_id)
   AND s.status='ACTIVE' AND s.account_type='COLLEGE' AND p.status='ACTIVE' AND p.role='STUDENT'
   ORDER BY p.full_name,s.id LIMIT 25 OFFSET (p_page-1)*25
 ) rows;
 RETURN jsonb_build_object('students',result,'total',total);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_trainer_batch_progress(UUID,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_trainer_batch_progress(UUID,INTEGER) TO authenticated;
COMMIT;
