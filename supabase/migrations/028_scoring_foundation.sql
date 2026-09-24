-- Reconcile Phase 3 scoring without deleting history or overwriting configured weights.
BEGIN;
CREATE TABLE IF NOT EXISTS public.employability_score_weights (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),skill_id UUID NOT NULL UNIQUE REFERENCES public.skills(id),
 weight_percent NUMERIC NOT NULL CHECK(weight_percent BETWEEN 0 AND 100),is_active BOOLEAN NOT NULL DEFAULT true,
 updated_by UUID REFERENCES auth.users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.employability_classifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),code TEXT NOT NULL UNIQUE,label TEXT NOT NULL,
 min_score NUMERIC NOT NULL CHECK(min_score BETWEEN 0 AND 100),max_score NUMERIC NOT NULL CHECK(max_score BETWEEN 0 AND 100),
 sort_order INTEGER NOT NULL DEFAULT 0,is_active BOOLEAN NOT NULL DEFAULT true,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK(min_score<=max_score)
);
CREATE TABLE IF NOT EXISTS public.skill_gap_targets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),skill_id UUID NOT NULL UNIQUE REFERENCES public.skills(id),
 target_proficiency NUMERIC NOT NULL DEFAULT 70 CHECK(target_proficiency BETWEEN 0 AND 100),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.student_employability_scores (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID NOT NULL REFERENCES public.students(id),
 score NUMERIC NOT NULL CHECK(score BETWEEN 0 AND 100),classification_code TEXT,classification_label TEXT,
 is_provisional BOOLEAN NOT NULL DEFAULT true,skills_measured INTEGER NOT NULL DEFAULT 0,skills_weighted INTEGER NOT NULL DEFAULT 0,
 breakdown JSONB NOT NULL DEFAULT '[]',computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employability_latest ON public.student_employability_scores(student_id,computed_at DESC,id DESC);
INSERT INTO public.employability_score_weights(skill_id,weight_percent)
SELECT id,CASE code WHEN 'COMM' THEN 25 WHEN 'CRT' THEN 20 WHEN 'PROB' THEN 15 ELSE 10 END FROM public.skills
WHERE code IN ('COMM','CRT','PROB','TEAM','TIME','ADAPT','PROF') ON CONFLICT(skill_id) DO NOTHING;
INSERT INTO public.skill_gap_targets(skill_id,target_proficiency) SELECT id,70 FROM public.skills ON CONFLICT(skill_id) DO NOTHING;
INSERT INTO public.employability_classifications(code,label,min_score,max_score,sort_order) VALUES
('PLACEMENT_READY','Placement Ready',85,100,1),('NEAR_READY','Near Ready',70,84.99,2),
('NEEDS_IMPROVEMENT','Needs Improvement',50,69.99,3),('HIGH_PRIORITY','High Priority Intervention',0,49.99,4)
ON CONFLICT(code) DO NOTHING;
-- Restrictive policies also constrain any older permissive hosted policies.
DO $policy$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['employability_score_weights','employability_classifications','skill_gap_targets'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
 EXECUTE format('DROP POLICY IF EXISTS scoring_read ON public.%I',t);
 EXECUTE format('CREATE POLICY scoring_read ON public.%I FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND status=''ACTIVE''))',t);
 EXECUTE format('DROP POLICY IF EXISTS scoring_admin_write ON public.%I',t);
 EXECUTE format('CREATE POLICY scoring_admin_write ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK(public.is_super_admin())',t);
 EXECUTE format('DROP POLICY IF EXISTS scoring_insert_guard ON public.%I',t);
 EXECUTE format('CREATE POLICY scoring_insert_guard ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.is_super_admin())',t);
 EXECUTE format('DROP POLICY IF EXISTS scoring_update_guard ON public.%I',t);
 EXECUTE format('CREATE POLICY scoring_update_guard ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin())',t);
 EXECUTE format('DROP POLICY IF EXISTS scoring_delete_guard ON public.%I',t);
 EXECUTE format('CREATE POLICY scoring_delete_guard ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(public.is_super_admin())',t);
 END LOOP;
END $policy$;
ALTER TABLE public.student_employability_scores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_employability_scores FROM anon,authenticated;
GRANT SELECT ON public.student_employability_scores TO authenticated;
DROP POLICY IF EXISTS scoring_history_scope ON public.student_employability_scores;
CREATE POLICY scoring_history_scope ON public.student_employability_scores AS RESTRICTIVE FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.profiles p JOIN public.students s ON s.id=student_id WHERE p.user_id=auth.uid() AND p.status='ACTIVE'
 AND (p.role='SUPER_ADMIN' OR (p.role='STUDENT' AND s.user_id=p.user_id) OR (p.role='COLLEGE_ADMIN' AND s.college_id IN(SELECT public.get_admin_college_ids()))))
);
DROP POLICY IF EXISTS scoring_history_read ON public.student_employability_scores;
CREATE POLICY scoring_history_read ON public.student_employability_scores FOR SELECT TO authenticated USING(true);
-- Replace the implementation, preserving the existing signature, configuration and history.
CREATE OR REPLACE FUNCTION public.fn_compute_employability_score(p_student_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE st public.students; caller public.profiles; items JSONB; weighted INTEGER; measured INTEGER; total_weight NUMERIC; measured_weight NUMERIC; result_score NUMERIC; provisional BOOLEAN; band public.employability_classifications; previous public.student_employability_scores; history UUID;
BEGIN
 SELECT * INTO caller FROM public.profiles WHERE user_id=auth.uid() AND status='ACTIVE';
 SELECT * INTO st FROM public.students WHERE id=p_student_id AND status='ACTIVE' FOR UPDATE;
 IF caller.user_id IS NULL OR st.id IS NULL OR NOT (caller.role='SUPER_ADMIN' OR (caller.role='STUDENT' AND st.user_id=caller.user_id) OR (caller.role='COLLEGE_ADMIN' AND st.college_id IN(SELECT public.get_admin_college_ids()))) THEN RAISE EXCEPTION 'Student scoring access denied'; END IF;
 WITH evidence AS (
 SELECT sk.id,sk.code,sk.name,w.weight_percent,coalesce(t.target_proficiency,70) AS target,
 CASE WHEN snap.is_valid AND snap.student_id=st.id AND snap.skill_id=sk.id AND a.student_id=st.id AND a.status='GRADED' AND ass.is_practice=false THEN snap.proficiency ELSE NULL END AS proficiency
 FROM public.employability_score_weights w JOIN public.skills sk ON sk.id=w.skill_id AND sk.status='ACTIVE'
 LEFT JOIN public.student_skill_summaries ss ON ss.student_id=st.id AND ss.skill_id=sk.id
 LEFT JOIN public.student_skill_snapshots snap ON snap.id=ss.last_valid_snapshot_id
 LEFT JOIN public.assessment_attempts a ON a.id=snap.attempt_id LEFT JOIN public.assessments ass ON ass.id=a.assessment_id
 LEFT JOIN public.skill_gap_targets t ON t.skill_id=sk.id
 WHERE w.is_active AND w.weight_percent>0
 ) SELECT count(*),count(proficiency),coalesce(sum(weight_percent),0),coalesce(sum(weight_percent) FILTER(WHERE proficiency IS NOT NULL),0),
 coalesce(round(sum(proficiency*weight_percent)/nullif(sum(weight_percent) FILTER(WHERE proficiency IS NOT NULL),0),2),0),
 coalesce(jsonb_agg(jsonb_build_object('skill_id',id,'code',code,'name',name,'weight_percent',weight_percent,'proficiency',proficiency,'target',target,'gap',CASE WHEN proficiency IS NULL THEN NULL ELSE greatest(0,target-proficiency) END,'included',proficiency IS NOT NULL) ORDER BY code),'[]')
 INTO weighted,measured,total_weight,measured_weight,result_score,items FROM evidence;
 provisional := weighted=0 OR measured<weighted OR total_weight<>100;
 IF NOT provisional THEN SELECT * INTO band FROM public.employability_classifications WHERE is_active AND result_score BETWEEN min_score AND max_score ORDER BY sort_order,code LIMIT 1; END IF;
 SELECT * INTO previous FROM public.student_employability_scores WHERE student_id=st.id ORDER BY computed_at DESC,id DESC LIMIT 1;
 IF previous.id IS NOT NULL AND (previous.score,previous.is_provisional,previous.breakdown,previous.classification_code,previous.classification_label) IS NOT DISTINCT FROM (result_score,provisional,items,band.code,band.label) THEN history:=previous.id;
 ELSE INSERT INTO public.student_employability_scores(student_id,score,is_provisional,skills_measured,skills_weighted,breakdown,classification_code,classification_label)
 VALUES(st.id,result_score,provisional,measured,weighted,items,band.code,band.label) RETURNING id INTO history; END IF;
 UPDATE public.students SET employability_score=result_score WHERE id=st.id;
 RETURN jsonb_build_object('student_id',st.id,'score',result_score,'is_provisional',provisional,'skills_measured',measured,'skills_weighted',weighted,'breakdown',items,'classification_code',band.code,'classification_label',band.label,'history_id',history);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_compute_employability_score(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_compute_employability_score(UUID) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_guard_cached_score() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND NEW.employability_score IS DISTINCT FROM OLD.employability_score THEN RAISE EXCEPTION 'Employability scores must be computed from assessment evidence'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_cached_employability_score ON public.students;
CREATE TRIGGER guard_cached_employability_score BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_guard_cached_score();
COMMIT;
