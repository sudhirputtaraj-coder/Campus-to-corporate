-- Apply after 035. Email-bound invitations do not create passwords or send email.
BEGIN;
CREATE TABLE IF NOT EXISTS public.college_student_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email=lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
  register_number TEXT NOT NULL CHECK (length(register_number) BETWEEN 1 AND 80),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','CANCELLED')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS college_student_invite_email ON public.college_student_invitations(college_id,email) WHERE status='PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS college_student_invite_register ON public.college_student_invitations(college_id,register_number) WHERE status='PENDING';
ALTER TABLE public.college_student_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.college_student_invitations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.college_student_invitations TO authenticated;
GRANT ALL ON public.college_student_invitations TO service_role;
DROP POLICY IF EXISTS "College admins view student invitations" ON public.college_student_invitations;
CREATE POLICY "College admins view student invitations" ON public.college_student_invitations FOR SELECT TO authenticated
USING (public.is_super_admin() OR public.is_college_admin(college_id));

-- Checked SECURITY DEFINER workflows may update affiliation. Direct browser writes
-- still cannot change identity, college membership, or their own access/placement.
CREATE OR REPLACE FUNCTION public.fn_guard_student_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_super_admin() THEN
    IF (NEW.user_id,NEW.account_type,NEW.college_id,NEW.status) IS DISTINCT FROM
       (OLD.user_id,OLD.account_type,OLD.college_id,OLD.status) THEN
      RAISE EXCEPTION 'Use the student access workflow to change membership or access.';
    END IF;
    IF OLD.user_id=auth.uid() AND (NEW.department_id,NEW.batch_id,NEW.register_number) IS DISTINCT FROM
       (OLD.department_id,OLD.batch_id,OLD.register_number) THEN
      RAISE EXCEPTION 'Student affiliation must be managed by an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Account creation and removal go through checked functions; no history deletion.
REVOKE INSERT,DELETE ON public.students FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_manage_college_student(
  p_college_id UUID,p_action TEXT,p_id UUID DEFAULT NULL,p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id UUID; v_email TEXT; v_name TEXT; v_register TEXT; v_dept UUID; v_batch UUID; v_student public.students%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_super_admin() OR public.is_college_admin(p_college_id)) THEN
    RAISE EXCEPTION 'Active administrator access to this college is required.';
  END IF;
  PERFORM 1 FROM public.colleges WHERE id=p_college_id AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This college is not active.'; END IF;
  IF p_action='add' THEN
    v_email:=lower(btrim(p_data->>'email')); v_name:=btrim(p_data->>'full_name'); v_register:=btrim(p_data->>'register_number');
    IF v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 200 OR v_register IS NULL OR length(v_register) NOT BETWEEN 1 AND 80 THEN
      RAISE EXCEPTION 'Enter a valid name, email and register number.';
    END IF;
    v_dept:=nullif(p_data->>'department_id','')::uuid; v_batch:=nullif(p_data->>'batch_id','')::uuid;
    IF v_dept IS NOT NULL THEN
      PERFORM 1 FROM public.departments WHERE id=v_dept AND college_id=p_college_id AND status='ACTIVE' FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active department in this college.'; END IF;
    END IF;
    IF v_batch IS NOT NULL THEN
      PERFORM 1 FROM public.batches WHERE id=v_batch AND college_id=p_college_id AND status='ACTIVE' AND department_id IS NOT DISTINCT FROM v_dept FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active batch belonging to the selected department.'; END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM public.students s JOIN auth.users u ON u.id=s.user_id
      WHERE s.college_id=p_college_id AND (s.register_number=v_register OR lower(u.email)=v_email)) THEN
      RAISE EXCEPTION 'This student or register number is already in your college. Find the existing student to manage their access.';
    END IF;
    INSERT INTO public.college_student_invitations(college_id,email,full_name,register_number,department_id,batch_id,created_by)
      VALUES(p_college_id,v_email,v_name,v_register,v_dept,v_batch,auth.uid()) RETURNING id INTO v_id;
  ELSIF p_action='cancel' THEN
    UPDATE public.college_student_invitations SET status='CANCELLED',cancelled_at=now()
      WHERE id=p_id AND college_id=p_college_id AND status='PENDING' RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'This invitation is no longer pending. Refresh the student list.'; END IF;
  ELSIF p_action IN ('remove','restore') THEN
    SELECT * INTO v_student FROM public.students WHERE id=p_id AND college_id=p_college_id AND account_type='COLLEGE' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student not found in this college.'; END IF;
    IF (p_action='remove' AND v_student.status<>'ACTIVE') OR (p_action='restore' AND v_student.status<>'INACTIVE') THEN
      RAISE EXCEPTION 'The student status has changed or requires platform administrator help. Refresh the list.';
    END IF;
    IF p_action='restore' THEN
      PERFORM 1 FROM public.profiles WHERE user_id=v_student.user_id AND role='STUDENT' AND status='ACTIVE' FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'The platform account is restricted. Contact the platform administrator.'; END IF;
    END IF;
    UPDATE public.students SET status=CASE WHEN p_action='remove' THEN 'INACTIVE'::public.entity_status ELSE 'ACTIVE'::public.entity_status END WHERE id=p_id;
    v_id:=p_id;
  ELSE RAISE EXCEPTION 'Unknown student access action.';
  END IF;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'COLLEGE_STUDENT_'||upper(p_action),'college',p_college_id,jsonb_build_object('record_id',v_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_my_college_invitations()
RETURNS TABLE(id UUID,college_name TEXT,register_number TEXT,department_name TEXT,batch_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT i.id,c.name,i.register_number,d.name,b.name
  FROM public.college_student_invitations i JOIN public.colleges c ON c.id=i.college_id AND c.status='ACTIVE'
  JOIN auth.users u ON u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email)=i.email
  LEFT JOIN public.departments d ON d.id=i.department_id LEFT JOIN public.batches b ON b.id=i.batch_id
  WHERE i.status='PENDING' ORDER BY i.created_at DESC,i.id;
$$;

CREATE OR REPLACE FUNCTION public.fn_accept_college_invitation(p_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_college UUID; v_inv public.college_student_invitations%ROWTYPE; v_student public.students%ROWTYPE;
  v_email TEXT; v_name TEXT; v_id UUID; v_courses INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to join your college.'; END IF;
  SELECT lower(email),coalesce(nullif(btrim(raw_user_meta_data->>'full_name'),''),'Student') INTO v_email,v_name
    FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL FOR SHARE;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Verify your email before joining your college.'; END IF;
  SELECT college_id INTO v_college FROM public.college_student_invitations WHERE id=p_id AND email=v_email;
  IF v_college IS NULL THEN RAISE EXCEPTION 'No matching invitation. Use the email your college administrator added.'; END IF;
  PERFORM 1 FROM public.colleges WHERE id=v_college AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Your college is not active. Contact your college administrator.'; END IF;
  INSERT INTO public.profiles(user_id,email,full_name,role,status) VALUES(auth.uid(),v_email,left(v_name,200),'STUDENT','ACTIVE') ON CONFLICT(user_id) DO NOTHING;
  PERFORM 1 FROM public.profiles WHERE user_id=auth.uid() AND role='STUDENT' AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active student account is required. Staff accounts cannot accept student access.'; END IF;
  SELECT * INTO v_inv FROM public.college_student_invitations WHERE id=p_id AND email=v_email FOR UPDATE;
  SELECT * INTO v_student FROM public.students WHERE user_id=auth.uid() FOR UPDATE;
  IF v_inv.status='ACCEPTED' AND v_inv.accepted_by=auth.uid() AND v_student.college_id=v_college AND v_student.status='ACTIVE' THEN
    RETURN jsonb_build_object('student_id',v_student.id,'already_joined',true);
  END IF;
  IF v_inv.status<>'PENDING' THEN RAISE EXCEPTION 'This invitation is no longer available. Contact your college administrator.'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_college_memberships WHERE user_id=auth.uid() AND status='ACTIVE')
    OR EXISTS(SELECT 1 FROM public.trainers WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'This account has a staff affiliation. Contact the platform administrator.';
  END IF;
  IF v_student.id IS NOT NULL THEN
    IF v_student.account_type='COLLEGE' OR v_student.status<>'ACTIVE' THEN
      RAISE EXCEPTION 'This account already has college access or is restricted. Contact the platform administrator for a transfer.';
    END IF;
    IF EXISTS(SELECT 1 FROM public.enrollments WHERE student_id=v_student.id)
      OR EXISTS(SELECT 1 FROM public.programme_purchases WHERE student_id=v_student.id)
      OR EXISTS(SELECT 1 FROM public.assessment_attempts WHERE student_id=v_student.id)
      OR EXISTS(SELECT 1 FROM public.programme_free_access WHERE student_id=v_student.id) THEN
      RAISE EXCEPTION 'Your individual account has learning or purchase history. Contact the platform administrator to review a transfer.';
    END IF;
  END IF;
  IF v_inv.department_id IS NOT NULL THEN
    PERFORM 1 FROM public.departments WHERE id=v_inv.department_id AND college_id=v_college AND status='ACTIVE' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Your department has changed. Ask your college administrator to cancel and add this invitation again.'; END IF;
  END IF;
  IF v_inv.batch_id IS NOT NULL THEN
    PERFORM 1 FROM public.batches WHERE id=v_inv.batch_id AND college_id=v_college AND status='ACTIVE' AND department_id IS NOT DISTINCT FROM v_inv.department_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Your batch has changed. Ask your college administrator to cancel and add this invitation again.'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.students WHERE college_id=v_college AND register_number=v_inv.register_number) THEN
    RAISE EXCEPTION 'This register number is already assigned. Contact your college administrator.';
  END IF;
  INSERT INTO public.students(user_id,account_type,college_id,register_number,department_id,batch_id)
    VALUES(auth.uid(),'COLLEGE',v_college,v_inv.register_number,v_inv.department_id,v_inv.batch_id)
    ON CONFLICT(user_id) DO UPDATE SET account_type='COLLEGE',college_id=EXCLUDED.college_id,register_number=EXCLUDED.register_number,
      department_id=EXCLUDED.department_id,batch_id=EXCLUDED.batch_id RETURNING id INTO v_id;
  INSERT INTO public.enrollments(student_id,course_id,batch_id)
    SELECT v_id,cc.course_id,v_inv.batch_id FROM public.college_courses cc JOIN public.courses c ON c.id=cc.course_id
    WHERE cc.college_id=v_college AND c.status='ACTIVE' ON CONFLICT(student_id,course_id) DO NOTHING;
  GET DIAGNOSTICS v_courses=ROW_COUNT;
  UPDATE public.college_student_invitations SET status='ACCEPTED',accepted_by=auth.uid(),accepted_at=now() WHERE id=p_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
    VALUES(auth.uid(),'COLLEGE_STUDENT_JOIN','student',v_id,jsonb_build_object('college_id',v_college,'invitation_id',p_id,'courses_added',v_courses));
  RETURN jsonb_build_object('student_id',v_id,'courses_added',v_courses);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_college_student_access_list(p_college_id UUID,p_search TEXT DEFAULT '',p_filter TEXT DEFAULT 'all',p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_super_admin() OR public.is_college_admin(p_college_id)) THEN
    RAISE EXCEPTION 'Active administrator access to this college is required.';
  END IF;
  IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR p_filter IS NULL OR p_filter NOT IN ('all','pending','active','removed') OR length(p_search)>100 THEN
    RAISE EXCEPTION 'Invalid student list filter.';
  END IF;
  WITH records AS (
    SELECT i.id,'invitation'::text AS kind,i.full_name,i.email,i.register_number,'PENDING'::text AS status,
      d.name AS department,b.name AS batch,i.created_at FROM public.college_student_invitations i
      LEFT JOIN public.departments d ON d.id=i.department_id LEFT JOIN public.batches b ON b.id=i.batch_id
      WHERE i.college_id=p_college_id AND i.status='PENDING'
    UNION ALL
    SELECT s.id,'student',p.full_name,u.email,s.register_number,
      CASE WHEN p.status<>'ACTIVE' OR p.role<>'STUDENT' THEN 'RESTRICTED' ELSE s.status::text END,
      d.name,b.name,s.created_at FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id JOIN auth.users u ON u.id=s.user_id
      LEFT JOIN public.departments d ON d.id=s.department_id LEFT JOIN public.batches b ON b.id=s.batch_id
      WHERE s.college_id=p_college_id AND s.account_type='COLLEGE'
  ), filtered AS (
    SELECT * FROM records WHERE (p_filter='all' OR (p_filter='pending' AND kind='invitation') OR
      (p_filter='active' AND kind='student' AND status='ACTIVE') OR (p_filter='removed' AND kind='student' AND status='INACTIVE'))
      AND (coalesce(p_search,'')='' OR position(lower(p_search) in lower(full_name||' '||coalesce(email,'')||' '||register_number))>0)
  ), page AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]'::jsonb)) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_manage_college_student(UUID,TEXT,UUID,JSONB),public.fn_my_college_invitations(),public.fn_accept_college_invitation(UUID),public.fn_college_student_access_list(UUID,TEXT,TEXT,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_manage_college_student(UUID,TEXT,UUID,JSONB),public.fn_my_college_invitations(),public.fn_accept_college_invitation(UUID),public.fn_college_student_access_list(UUID,TEXT,TEXT,INTEGER) TO authenticated;
COMMIT;
