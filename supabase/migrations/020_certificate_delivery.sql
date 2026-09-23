BEGIN;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS course_title TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS verification_token UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS public_verification BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS certificates_verification_token_idx ON public.certificates(verification_token);
UPDATE certificates c SET recipient_name=p.full_name,course_title=co.title
FROM students s JOIN profiles p ON p.user_id=s.user_id, courses co
WHERE c.student_id=s.id AND c.course_id=co.id AND (c.recipient_name IS NULL OR c.course_title IS NULL);

CREATE OR REPLACE FUNCTION public.fn_issue_course_certificate(p_course_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid UUID; recipient TEXT; title TEXT; cert_id UUID; lesson_count INTEGER;
BEGIN
  IF NOT public.fn_can_access_course(p_course_id) THEN RAISE EXCEPTION 'Active course access is required.'; END IF;
  SELECT s.id,p.full_name INTO sid,recipient FROM students s JOIN profiles p ON p.user_id=s.user_id
    WHERE s.user_id=auth.uid() AND s.status='ACTIVE' AND p.role='STUDENT' AND p.status='ACTIVE';
  IF sid IS NULL THEN RAISE EXCEPTION 'Active student account is required.'; END IF;
  PERFORM 1 FROM enrollments WHERE student_id=sid AND course_id=p_course_id AND status IN ('ACTIVE','COMPLETED') FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT id INTO cert_id FROM certificates WHERE student_id=sid AND course_id=p_course_id;
  IF cert_id IS NOT NULL THEN RETURN cert_id; END IF;
  SELECT c.title INTO title FROM courses c WHERE id=p_course_id AND status='ACTIVE';
  IF title IS NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO lesson_count FROM lessons l JOIN modules m ON m.id=l.module_id
    WHERE m.course_id=p_course_id AND m.status='ACTIVE' AND l.status='ACTIVE';
  IF lesson_count=0 OR EXISTS(
    SELECT 1 FROM lessons l JOIN modules m ON m.id=l.module_id
    WHERE m.course_id=p_course_id AND m.status='ACTIVE' AND l.status='ACTIVE'
      AND NOT EXISTS(SELECT 1 FROM lesson_progress lp WHERE lp.student_id=sid AND lp.lesson_id=l.id AND lp.course_id=p_course_id AND lp.status='COMPLETED')
  ) THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM assessments a WHERE a.course_id=p_course_id AND a.status='ACTIVE' AND NOT a.is_practice
    AND NOT EXISTS(SELECT 1 FROM assessment_attempts aa WHERE aa.assessment_id=a.id AND aa.student_id=sid AND aa.status='GRADED' AND aa.passed=true)) THEN RETURN NULL; END IF;
  INSERT INTO certificates(student_id,course_id,certificate_number,recipient_name,course_title)
    VALUES(sid,p_course_id,'CTC-'||upper(gen_random_uuid()::text),recipient,title)
    ON CONFLICT(student_id,course_id) DO NOTHING RETURNING id INTO cert_id;
  IF cert_id IS NULL THEN SELECT id INTO cert_id FROM certificates WHERE student_id=sid AND course_id=p_course_id; END IF;
  RETURN cert_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.fn_set_certificate_sharing(p_certificate_id UUID,p_enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'Choose sharing on or off.'; END IF;
  UPDATE certificates c SET public_verification=p_enabled
    WHERE c.id=p_certificate_id AND EXISTS(SELECT 1 FROM students s JOIN profiles p ON p.user_id=s.user_id
      WHERE s.id=c.student_id AND s.user_id=auth.uid() AND p.status='ACTIVE');
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificate not available for this account.'; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.fn_verify_certificate(p_token UUID)
RETURNS TABLE(certificate_number TEXT,recipient_name TEXT,course_title TEXT,issue_date TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT c.certificate_number,c.recipient_name,c.course_title,c.issue_date FROM certificates c
  WHERE c.verification_token=p_token AND c.public_verification=true;
$$;
REVOKE ALL ON FUNCTION public.fn_issue_course_certificate(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fn_set_certificate_sharing(UUID,BOOLEAN) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fn_verify_certificate(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_issue_course_certificate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_certificate_sharing(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_certificate(UUID) TO anon,authenticated;
REVOKE ALL ON public.certificates FROM anon;
COMMIT;
