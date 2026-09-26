-- Usage counters only. No student audio, transcripts or feedback are stored.
BEGIN;
CREATE TABLE IF NOT EXISTS public.voice_coach_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);
CREATE INDEX IF NOT EXISTS voice_coach_usage_date_idx ON public.voice_coach_usage(usage_date);
ALTER TABLE public.voice_coach_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_coach_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.voice_coach_usage TO authenticated;
DROP POLICY IF EXISTS "Students read own voice usage" ON public.voice_coach_usage;
CREATE POLICY "Students read own voice usage" ON public.voice_coach_usage FOR SELECT TO authenticated
USING (user_id=auth.uid() AND EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND role='STUDENT' AND status='ACTIVE'
));

-- Only the server may reserve usage after checking the caller and programme access.
CREATE OR REPLACE FUNCTION public.fn_reserve_voice_coach_request(p_user_id UUID, p_student_limit INTEGER, p_platform_limit INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  used INTEGER; total BIGINT; last_at TIMESTAMPTZ;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF;
  IF p_student_limit IS NULL OR p_student_limit NOT BETWEEN 1 AND 100 OR
     p_platform_limit IS NULL OR p_platform_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Invalid usage limits';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN public.students s ON s.user_id=p.user_id
    WHERE p.user_id=p_user_id AND p.role='STUDENT' AND p.status='ACTIVE' AND s.status='ACTIVE') THEN
    RAISE EXCEPTION 'Active student required';
  END IF;
  -- Serialize reservations across instances, including the platform-wide cap.
  PERFORM pg_advisory_xact_lock(330026);
  SELECT requests,last_request_at INTO used,last_at FROM public.voice_coach_usage WHERE user_id=p_user_id AND usage_date=today;
  used := coalesce(used,0);
  IF used >= p_student_limit THEN RETURN jsonb_build_object('allowed',false,'reason','student_limit','remaining',0); END IF;
  SELECT coalesce(sum(requests),0) INTO total FROM public.voice_coach_usage WHERE usage_date=today;
  IF total >= p_platform_limit THEN RETURN jsonb_build_object('allowed',false,'reason','platform_limit','remaining',0); END IF;
  IF last_at > now()-interval '5 seconds' THEN RETURN jsonb_build_object('allowed',false,'reason','cooldown','remaining',p_student_limit-used); END IF;
  INSERT INTO public.voice_coach_usage(user_id,usage_date,requests,last_request_at) VALUES(p_user_id,today,1,now())
  ON CONFLICT(user_id,usage_date) DO UPDATE SET requests=voice_coach_usage.requests+1,last_request_at=now();
  RETURN jsonb_build_object('allowed',true,'remaining',p_student_limit-used-1);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_reserve_voice_coach_request(UUID,INTEGER,INTEGER) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reserve_voice_coach_request(UUID,INTEGER,INTEGER) TO service_role;
COMMIT;
