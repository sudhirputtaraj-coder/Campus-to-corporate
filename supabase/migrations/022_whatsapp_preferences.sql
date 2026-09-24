-- Preferences only: this migration cannot verify numbers or send messages.
BEGIN;
CREATE TABLE IF NOT EXISTS public.student_whatsapp_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$'),
  enabled BOOLEAN NOT NULL DEFAULT false,
  learning BOOLEAN NOT NULL DEFAULT false,
  scores BOOLEAN NOT NULL DEFAULT false,
  employability BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT,
  consent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT enabled OR (phone IS NOT NULL AND consent_at IS NOT NULL AND consent_version IS NOT NULL AND (learning OR scores OR employability)))
);
ALTER TABLE public.student_whatsapp_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_whatsapp_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_whatsapp_preferences TO authenticated;
DROP POLICY IF EXISTS "Students read own WhatsApp preferences" ON public.student_whatsapp_preferences;
CREATE POLICY "Students read own WhatsApp preferences" ON public.student_whatsapp_preferences
FOR SELECT TO authenticated USING (user_id=auth.uid() AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.role='STUDENT' AND p.status='ACTIVE'
));

CREATE OR REPLACE FUNCTION public.fn_save_whatsapp_preferences(
  p_phone TEXT, p_enabled BOOLEAN, p_learning BOOLEAN, p_scores BOOLEAN, p_employability BOOLEAN
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.students s ON s.user_id=p.user_id
    WHERE p.user_id=auth.uid() AND p.role='STUDENT' AND p.status='ACTIVE' AND s.status='ACTIVE'
  ) THEN RAISE EXCEPTION 'Active student access required.'; END IF;
  IF p_enabled IS NULL OR p_learning IS NULL OR p_scores IS NULL OR p_employability IS NULL THEN
    RAISE EXCEPTION 'Preferences must be specified.';
  END IF;
  IF p_enabled AND (p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{7,14}$' OR NOT (p_learning OR p_scores OR p_employability)) THEN
    RAISE EXCEPTION 'A valid international number and at least one update type are required.';
  END IF;
  INSERT INTO public.student_whatsapp_preferences(user_id,phone,enabled,learning,scores,employability,consent_version,consent_at)
  VALUES(auth.uid(),CASE WHEN p_enabled THEN p_phone ELSE NULL END,p_enabled,
    p_enabled AND p_learning,p_enabled AND p_scores,p_enabled AND p_employability,
    CASE WHEN p_enabled THEN 'progress-updates-v1' ELSE NULL END,CASE WHEN p_enabled THEN now() ELSE NULL END)
  ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,enabled=excluded.enabled,
    learning=excluded.learning,scores=excluded.scores,employability=excluded.employability,
    consent_version=excluded.consent_version,consent_at=excluded.consent_at,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.fn_save_whatsapp_preferences(TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_whatsapp_preferences(TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN) TO authenticated;
COMMIT;
