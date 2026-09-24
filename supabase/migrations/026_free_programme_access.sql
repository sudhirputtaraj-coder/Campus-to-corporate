-- Free enrolment keeps the configured duration. Apply the entire file once.
BEGIN;
ALTER TABLE public.programme_settings DROP CONSTRAINT IF EXISTS programme_settings_price_paise_check;
ALTER TABLE public.programme_settings ADD CONSTRAINT programme_settings_price_paise_check CHECK (price_paise BETWEEN 0 AND 100000000);
CREATE TABLE IF NOT EXISTS public.programme_free_access (
 student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE RESTRICT,
 activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL,
 access_months INTEGER NOT NULL CHECK (access_months BETWEEN 1 AND 120),
 CHECK (expires_at > activated_at)
);
ALTER TABLE public.programme_free_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.programme_free_access FROM anon, authenticated;
GRANT SELECT ON public.programme_free_access TO authenticated;
DROP POLICY IF EXISTS "Read own free access" ON public.programme_free_access;
CREATE POLICY "Read own free access" ON public.programme_free_access FOR SELECT TO authenticated USING (
 public.is_super_admin() OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);
CREATE OR REPLACE FUNCTION public.fn_activate_free_programme()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st UUID; months INTEGER; price INTEGER;
BEGIN
 SELECT s.id INTO st FROM public.students s JOIN public.profiles p ON p.user_id = s.user_id
 WHERE s.user_id = auth.uid() AND s.account_type = 'INDIVIDUAL' AND s.status = 'ACTIVE'
 AND p.role = 'STUDENT' AND p.status = 'ACTIVE' FOR UPDATE OF s;
 IF st IS NULL THEN RAISE EXCEPTION 'Complete your active individual student profile first'; END IF;
 SELECT price_paise, access_months INTO price, months FROM public.programme_settings WHERE id = 'corporate-readiness' FOR SHARE;
 IF price IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Free enrolment is not available'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.courses WHERE status = 'ACTIVE') THEN RAISE EXCEPTION 'No active courses'; END IF;
 INSERT INTO public.programme_free_access(student_id, access_months, expires_at)
 VALUES(st, months, now() + make_interval(months => months)) ON CONFLICT (student_id) DO NOTHING;
 IF NOT EXISTS (SELECT 1 FROM public.programme_free_access WHERE student_id = st AND expires_at > now()) THEN
 RAISE EXCEPTION 'Your free access period has ended'; END IF;
 INSERT INTO public.enrollments(student_id,course_id,status)
 SELECT st,id,'ACTIVE'::public.enrollment_status FROM public.courses WHERE status = 'ACTIVE'
 ON CONFLICT (student_id,course_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_activate_free_programme() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_activate_free_programme() TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_has_learning_access()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.status = 'ACTIVE'
      AND (p.role IN ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER') OR
        (p.role = 'STUDENT' AND EXISTS (
          SELECT 1 FROM public.students s WHERE s.user_id = p.user_id AND s.status = 'ACTIVE'
            AND (s.account_type = 'COLLEGE' OR (s.account_type = 'INDIVIDUAL' AND (EXISTS (SELECT 1 FROM public.programme_free_access f WHERE f.student_id = s.id AND f.activated_at <= now() AND f.expires_at > now()) OR EXISTS (
              SELECT 1 FROM public.programme_purchases pp JOIN public.programme_settings ps ON ps.id = pp.programme_id
              WHERE pp.student_id = s.id AND pp.programme_id = 'corporate-readiness'
                AND pp.payment_mode = ps.payment_mode AND pp.status = 'PAID'
                AND pp.activated_at <= now() AND pp.expires_at > now()
            ))))
        )))
  );
$$;


CREATE OR REPLACE FUNCTION public.fn_reserve_programme_purchase(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  st public.students;
  offer public.programme_settings;
  result public.programme_purchases;
BEGIN
  SELECT s.* INTO st FROM public.students s JOIN public.profiles p ON p.user_id = s.user_id
    WHERE s.user_id = p_user_id AND s.account_type = 'INDIVIDUAL' AND s.status = 'ACTIVE'
      AND p.role = 'STUDENT' AND p.status = 'ACTIVE' FOR UPDATE OF s;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Active individual student required'; END IF;
  SELECT * INTO offer FROM public.programme_settings WHERE id = 'corporate-readiness';
  IF offer.price_paise = 0 THEN RAISE EXCEPTION 'Use free enrolment instead of checkout'; END IF;
  IF offer.payment_mode <> 'TEST' THEN RAISE EXCEPTION 'Only test checkout is enabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE status = 'ACTIVE') THEN RAISE EXCEPTION 'Programme has no active courses'; END IF;
  IF EXISTS (SELECT 1 FROM public.programme_purchases WHERE student_id = st.id AND programme_id = offer.id
    AND status = 'PAID' AND payment_mode = offer.payment_mode AND expires_at > now()) THEN
    RAISE EXCEPTION 'Programme access is already active';
  END IF;
  SELECT * INTO result FROM public.programme_purchases WHERE student_id = st.id AND programme_id = offer.id
    AND status = 'PENDING' AND payment_mode = offer.payment_mode ORDER BY created_at DESC LIMIT 1;
  IF result.id IS NULL THEN
    INSERT INTO public.programme_purchases(student_id, programme_id, price_paise, currency, access_months, payment_mode)
    VALUES(st.id, offer.id, offer.price_paise, offer.currency, offer.access_months, offer.payment_mode) RETURNING * INTO result;
  END IF;
  RETURN to_jsonb(result);
END;
$$;


-- Requested current offer: free. Future price changes are made in Super Admin settings.
UPDATE public.programme_settings SET price_paise = 0 WHERE id = 'corporate-readiness';
COMMIT;
