-- Apply after 039. Invitations remain email-bound; no passwords are created.
BEGIN;
CREATE TABLE IF NOT EXISTS public.college_invitation_mail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL UNIQUE REFERENCES public.college_student_invitations(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SENDING','SENT','FAILED','UNCERTAIN','CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS college_invitation_mail_queue ON public.college_invitation_mail(college_id,status,created_at);
ALTER TABLE public.college_invitation_mail ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.college_invitation_mail FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.college_invitation_mail TO authenticated;
GRANT ALL ON public.college_invitation_mail TO service_role;
DROP POLICY IF EXISTS "College mail visibility" ON public.college_invitation_mail;
CREATE POLICY "College mail visibility" ON public.college_invitation_mail FOR SELECT TO authenticated
USING(public.is_super_admin() OR public.is_college_admin(college_id));

CREATE OR REPLACE FUNCTION public.fn_bulk_invite_students(p_college_id UUID,p_rows JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r JSONB; v_id UUID; result JSONB:='[]'::jsonb; n INTEGER:=0;
BEGIN
  IF auth.uid() IS NULL OR NOT(public.is_super_admin() OR public.is_college_admin(p_college_id)) THEN
    RAISE EXCEPTION 'Active college administrator access required.';
  END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 OR octet_length(p_rows::text)>500000 THEN
    RAISE EXCEPTION 'Include 1 to 500 students.';
  END IF;
  PERFORM 1 FROM public.colleges WHERE id=p_college_id AND status='ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This college is not active.'; END IF;
  IF (SELECT count(*) FROM public.college_invitation_mail WHERE college_id=p_college_id AND created_at>now()-interval '24 hours') + jsonb_array_length(p_rows)>1000 THEN
    RAISE EXCEPTION 'The college limit is 1,000 bulk invitations per 24 hours. Try again later.';
  END IF;
  -- The existing workflow serializes changes for this college and validates placement.
  FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    n:=n+1;
    BEGIN
      v_id:=public.fn_manage_college_student(p_college_id,'add',NULL,r);
      INSERT INTO public.college_invitation_mail(invitation_id,college_id) VALUES(v_id,p_college_id);
      result:=result||jsonb_build_array(jsonb_build_object('row',n,'email',r->>'email','status','QUEUED','message','Invitation created; email queued.'));
    EXCEPTION
      WHEN unique_violation THEN
        result:=result||jsonb_build_array(jsonb_build_object('row',n,'email',r->>'email','status','SKIPPED','message','Email or register number already has a pending invitation. Existing details were kept.'));
      WHEN raise_exception OR invalid_text_representation THEN
        result:=result||jsonb_build_array(jsonb_build_object('row',n,'email',r->>'email','status','ERROR','message',SQLERRM));
    END;
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_bulk_invite_students(UUID,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_bulk_invite_students(UUID,JSONB) TO authenticated;

-- Only the server can claim mail. A lost response is never automatically resent.
CREATE OR REPLACE FUNCTION public.fn_claim_college_invitation_mail(p_college_id UUID,p_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.college_invitation_mail%ROWTYPE; i public.college_student_invitations%ROWTYPE; c TEXT;
BEGIN
  SELECT * INTO m FROM public.college_invitation_mail WHERE id=p_id AND college_id=p_college_id FOR UPDATE;
  IF NOT FOUND OR m.status NOT IN ('QUEUED','FAILED') OR m.attempts>=5 THEN RETURN NULL; END IF;
  SELECT * INTO i FROM public.college_student_invitations WHERE id=m.invitation_id FOR SHARE;
  SELECT name INTO c FROM public.colleges WHERE id=p_college_id AND status='ACTIVE' FOR SHARE;
  IF i.status<>'PENDING' OR c IS NULL THEN
    UPDATE public.college_invitation_mail SET status='CANCELLED',detail='Invitation no longer pending or college inactive.',updated_at=now() WHERE id=m.id;
    RETURN NULL;
  END IF;
  UPDATE public.college_invitation_mail SET status='SENDING',attempts=attempts+1,detail=NULL,updated_at=now() WHERE id=m.id;
  RETURN jsonb_build_object('id',m.id,'email',i.email,'college',c,'attempt',m.attempts+1);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_claim_college_invitation_mail(UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_college_invitation_mail(UUID,UUID) TO service_role;
COMMIT;
