BEGIN;
CREATE OR REPLACE FUNCTION public.fn_setup_college_account(p_user_id UUID, p_college_id UUID, p_kind TEXT, p_register_number TEXT DEFAULT '')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.profiles%ROWTYPE;
  student public.students%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Active Super Admin access is required.'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('COLLEGE_ADMIN','COLLEGE_STUDENT') THEN RAISE EXCEPTION 'Choose a college account type.'; END IF;
  SELECT * INTO target FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND OR target.status <> 'ACTIVE' OR target.role NOT IN ('STUDENT','COLLEGE_ADMIN') THEN
    RAISE EXCEPTION 'Choose an active student or college administrator account.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'The user must confirm their email first.';
  END IF;
  PERFORM 1 FROM public.colleges WHERE id=p_college_id AND status='ACTIVE' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active college.'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_college_memberships WHERE user_id=p_user_id AND college_id<>p_college_id)
     OR EXISTS(SELECT 1 FROM public.trainers WHERE user_id=p_user_id) THEN
    RAISE EXCEPTION 'This account needs a separate college transfer review.';
  END IF;
  SELECT * INTO student FROM public.students WHERE user_id=p_user_id FOR UPDATE;
  IF student.id IS NOT NULL THEN
    IF student.college_id IS NOT NULL AND (student.college_id<>p_college_id OR p_kind<>'COLLEGE_STUDENT') THEN
      RAISE EXCEPTION 'Existing college students need a separate transfer review.';
    END IF;
    IF student.account_type='INDIVIDUAL' AND (
      EXISTS(SELECT 1 FROM public.programme_purchases WHERE student_id=student.id)
      OR EXISTS(SELECT 1 FROM public.enrollments WHERE student_id=student.id)
      OR EXISTS(SELECT 1 FROM public.assessment_attempts WHERE student_id=student.id)
    ) THEN RAISE EXCEPTION 'Existing purchases or learning records need a separate transfer review.'; END IF;
    IF target.role='STUDENT' AND student.status<>'ACTIVE' THEN RAISE EXCEPTION 'The student profile must be active first.'; END IF;
  END IF;
  IF p_kind='COLLEGE_STUDENT' THEN
    IF target.role<>'STUDENT' THEN RAISE EXCEPTION 'Changing an administrator to a student needs a separate review.'; END IF;
    IF p_register_number IS NULL OR length(btrim(p_register_number)) NOT BETWEEN 1 AND 80 THEN
      RAISE EXCEPTION 'Enter a register number of 1 to 80 characters.';
    END IF;
    INSERT INTO public.students(user_id,college_id,account_type,register_number,status)
      VALUES(p_user_id,p_college_id,'COLLEGE',btrim(p_register_number),'ACTIVE')
    ON CONFLICT(user_id) DO UPDATE SET college_id=EXCLUDED.college_id,account_type='COLLEGE',register_number=EXCLUDED.register_number;
  ELSE
    IF student.id IS NOT NULL THEN UPDATE public.students SET status='INACTIVE' WHERE id=student.id; END IF;
    INSERT INTO public.user_college_memberships(user_id,college_id,role,status)
      VALUES(p_user_id,p_college_id,'COLLEGE_ADMIN','ACTIVE')
    ON CONFLICT(user_id,college_id,role) DO UPDATE SET status='ACTIVE';
    UPDATE public.profiles SET role='COLLEGE_ADMIN' WHERE user_id=p_user_id;
  END IF;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'COLLEGE_ACCOUNT_SETUP','user',p_user_id,
      jsonb_build_object('college_id',p_college_id,'account_type',p_kind));
END;
$$;
REVOKE ALL ON FUNCTION public.fn_setup_college_account(UUID,UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_setup_college_account(UUID,UUID,TEXT,TEXT) TO authenticated;
COMMIT;
