-- Test-mode integration only. Apply after 007. No real payment is enabled.
BEGIN;
ALTER TABLE public.programme_settings ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'TEST' CHECK (payment_mode IN ('TEST', 'LIVE'));
ALTER TABLE public.programme_purchases ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'TEST' CHECK (payment_mode IN ('TEST', 'LIVE'));
ALTER TABLE public.programme_purchases ADD COLUMN provider_order_id TEXT UNIQUE;

CREATE FUNCTION public.fn_preserve_payment_identity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_mode IS DISTINCT FROM OLD.payment_mode
    OR (OLD.provider_order_id IS NOT NULL AND NEW.provider_order_id IS DISTINCT FROM OLD.provider_order_id)
    OR (OLD.provider_payment_id IS NOT NULL AND NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id)
    OR (OLD.status = 'REFUNDED' AND NEW.status <> 'REFUNDED') THEN
    RAISE EXCEPTION 'Payment identity and refunded status cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_payment_identity BEFORE UPDATE ON public.programme_purchases
FOR EACH ROW EXECUTE FUNCTION public.fn_preserve_payment_identity();

CREATE OR REPLACE FUNCTION public.fn_has_learning_access()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.status = 'ACTIVE'
      AND (p.role IN ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER') OR
        (p.role = 'STUDENT' AND EXISTS (
          SELECT 1 FROM public.students s WHERE s.user_id = p.user_id AND s.status = 'ACTIVE'
            AND (s.account_type = 'COLLEGE' OR (s.account_type = 'INDIVIDUAL' AND EXISTS (
              SELECT 1 FROM public.programme_purchases pp JOIN public.programme_settings ps ON ps.id = pp.programme_id
              WHERE pp.student_id = s.id AND pp.programme_id = 'corporate-readiness'
                AND pp.payment_mode = ps.payment_mode AND pp.status = 'PAID'
                AND pp.activated_at <= now() AND pp.expires_at > now()
            )))
        )))
  );
$$;

-- These two RPCs are exclusively for trusted server code, never browser callers.
CREATE FUNCTION public.fn_reserve_programme_purchase(p_user_id UUID)
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

CREATE FUNCTION public.fn_apply_verified_payment(
  p_order_id TEXT, p_payment_id TEXT, p_amount INTEGER, p_currency TEXT, p_refunded BOOLEAN
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  purchase public.programme_purchases;
  starts TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO purchase FROM public.programme_purchases WHERE provider_order_id = p_order_id FOR UPDATE;
  IF purchase.id IS NULL OR purchase.payment_mode <> 'TEST' THEN RAISE EXCEPTION 'Unknown test order'; END IF;
  IF p_amount IS DISTINCT FROM purchase.price_paise OR p_currency IS DISTINCT FROM purchase.currency
    OR p_payment_id IS NULL OR p_payment_id = '' OR p_refunded IS NULL THEN
    RAISE EXCEPTION 'Payment does not match agreed terms';
  END IF;
  IF purchase.provider_payment_id IS NOT NULL AND purchase.provider_payment_id <> p_payment_id THEN
    RAISE EXCEPTION 'Order already has a different payment';
  END IF;
  IF purchase.status = 'REFUNDED' THEN RETURN purchase.id; END IF;
  IF p_refunded THEN
    UPDATE public.programme_purchases SET status = 'REFUNDED', provider_payment_id = p_payment_id WHERE id = purchase.id;
    RETURN purchase.id;
  END IF;
  IF purchase.status = 'PAID' THEN RETURN purchase.id; END IF;
  UPDATE public.programme_purchases SET status = 'PAID', provider_payment_id = p_payment_id,
    activated_at = starts,
    expires_at = ((starts AT TIME ZONE 'Asia/Kolkata') + make_interval(months => purchase.access_months)) AT TIME ZONE 'Asia/Kolkata'
    WHERE id = purchase.id;
  -- Initial programme catalogue: all currently active courses. Do not reset prior progress.
  INSERT INTO public.enrollments(student_id, course_id, status)
    SELECT purchase.student_id, id, 'ACTIVE'::public.enrollment_status FROM public.courses WHERE status = 'ACTIVE'
    ON CONFLICT (student_id, course_id) DO NOTHING;
  RETURN purchase.id;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_reserve_programme_purchase(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_apply_verified_payment(TEXT, TEXT, INTEGER, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reserve_programme_purchase(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_apply_verified_payment(TEXT, TEXT, INTEGER, TEXT, BOOLEAN) TO service_role;
COMMIT;
