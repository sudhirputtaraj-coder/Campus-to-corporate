-- Individual registration and programme settings. No payment activation or enrollments.
-- Apply after 005 in the Supabase SQL Editor. Existing students remain COLLEGE.
BEGIN;

ALTER TABLE public.students ADD COLUMN account_type TEXT NOT NULL DEFAULT 'COLLEGE';
ALTER TABLE public.students ALTER COLUMN college_id DROP NOT NULL;
ALTER TABLE public.students ADD CONSTRAINT students_account_type_check CHECK (
  (account_type = 'COLLEGE' AND college_id IS NOT NULL)
  OR (account_type = 'INDIVIDUAL' AND college_id IS NULL AND department_id IS NULL AND batch_id IS NULL)
);

-- Existing self-update policies do not restrict columns. Protect affiliation and
-- role fields so personal-profile edits cannot grant college or admin access.
CREATE FUNCTION public.fn_guard_profile_access_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin()
     AND (NEW.user_id, NEW.role, NEW.status) IS DISTINCT FROM (OLD.user_id, OLD.role, OLD.status) THEN
    RAISE EXCEPTION 'Only a platform administrator can change account access.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_profile_access_fields BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_profile_access_fields();

CREATE FUNCTION public.fn_guard_student_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.account_type IS DISTINCT FROM OLD.account_type
       OR NEW.college_id IS DISTINCT FROM OLD.college_id THEN
      RAISE EXCEPTION 'Only a platform administrator can change student membership.';
    END IF;
    IF OLD.user_id = auth.uid() AND
       (NEW.department_id, NEW.batch_id, NEW.status, NEW.register_number) IS DISTINCT FROM
       (OLD.department_id, OLD.batch_id, OLD.status, OLD.register_number) THEN
      RAISE EXCEPTION 'Student affiliation must be managed by an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_student_membership BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_student_membership();

CREATE TABLE public.programme_settings (
  id TEXT PRIMARY KEY CHECK (id = 'corporate-readiness'),
  name TEXT NOT NULL,
  price_paise INTEGER NOT NULL CHECK (price_paise > 0 AND price_paise <= 100000000),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  access_months INTEGER NOT NULL CHECK (access_months BETWEEN 1 AND 120),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.programme_settings (id, name, price_paise, access_months)
VALUES ('corporate-readiness', 'Corporate Readiness Programme', 50000, 6);
CREATE TRIGGER set_programme_settings_updated_at BEFORE UPDATE ON public.programme_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.programme_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.programme_settings FROM anon, authenticated;
GRANT SELECT ON public.programme_settings TO anon, authenticated;
GRANT UPDATE ON public.programme_settings TO authenticated;
CREATE POLICY "Read programme offer" ON public.programme_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super Admin update programme offer" ON public.programme_settings FOR UPDATE TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Purchase terms are copied, never derived from today's settings. No client can
-- create/activate a purchase. Verified provider integration is a later step.
CREATE TABLE public.programme_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  programme_id TEXT NOT NULL REFERENCES public.programme_settings(id),
  price_paise INTEGER NOT NULL CHECK (price_paise > 0),
  currency TEXT NOT NULL CHECK (currency = 'INR'),
  access_months INTEGER NOT NULL CHECK (access_months BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  provider_payment_id TEXT UNIQUE,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((activated_at IS NULL AND expires_at IS NULL) OR
    (activated_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > activated_at)),
  CHECK (status <> 'PAID' OR (provider_payment_id IS NOT NULL AND activated_at IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE INDEX idx_programme_purchases_student ON public.programme_purchases(student_id);
ALTER TABLE public.programme_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.programme_purchases FROM anon, authenticated;
GRANT SELECT ON public.programme_purchases TO authenticated;
GRANT ALL ON public.programme_purchases TO service_role;
CREATE POLICY "Read own programme purchases" ON public.programme_purchases FOR SELECT TO authenticated
USING (public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()
));
CREATE FUNCTION public.fn_preserve_purchase_terms()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.student_id, NEW.programme_id, NEW.price_paise, NEW.currency, NEW.access_months)
     IS DISTINCT FROM (OLD.student_id, OLD.programme_id, OLD.price_paise, OLD.currency, OLD.access_months) THEN
    RAISE EXCEPTION 'Purchase owner and agreed terms cannot be changed.';
  END IF;
  IF OLD.activated_at IS NOT NULL AND
     (NEW.activated_at, NEW.expires_at) IS DISTINCT FROM (OLD.activated_at, OLD.expires_at) THEN
    RAISE EXCEPTION 'Activated access dates cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_purchase_terms BEFORE UPDATE ON public.programme_purchases
FOR EACH ROW EXECUTE FUNCTION public.fn_preserve_purchase_terms();

-- Explicit self-onboarding: confirmed STUDENT accounts only, no target-user input.
-- College students return unchanged. Concurrent/repeated requests are idempotent.
CREATE FUNCTION public.fn_register_individual_student()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller UUID := auth.uid();
  account_email TEXT;
  account_name TEXT;
  student_id UUID;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to complete your student profile.'; END IF;
  SELECT email, COALESCE(NULLIF(BTRIM(raw_user_meta_data->>'full_name'), ''), 'Student')
  INTO account_email, account_name FROM auth.users
  WHERE id = caller AND email_confirmed_at IS NOT NULL;
  IF account_email IS NULL THEN RAISE EXCEPTION 'Confirm your email before completing your profile.'; END IF;

  INSERT INTO public.profiles (user_id, email, full_name, role, status)
  VALUES (caller, account_email, account_name, 'STUDENT', 'ACTIVE')
  ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM public.profiles WHERE user_id = caller AND role = 'STUDENT' AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active student account is required.'; END IF;

  SELECT id INTO student_id FROM public.students WHERE user_id = caller;
  IF student_id IS NOT NULL THEN RETURN student_id; END IF;
  -- Do not turn college-invited accounts into independent accounts implicitly.
  IF EXISTS (SELECT 1 FROM public.user_college_memberships WHERE user_id = caller AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Contact your college administrator to complete your student record.';
  END IF;
  INSERT INTO public.students (user_id, account_type, college_id, register_number)
  VALUES (caller, 'INDIVIDUAL', NULL, 'IND-' || caller::text)
  RETURNING id INTO student_id;
  RETURN student_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_register_individual_student() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_register_individual_student() TO authenticated;
COMMIT;
