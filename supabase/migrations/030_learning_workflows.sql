-- Aggregate analytics; no student identities are returned. Apply after 026.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_learning_analytics_filtered(p_college_id UUID DEFAULT NULL,p_department_id UUID DEFAULT NULL,p_batch_id UUID DEFAULT NULL,p_course_id UUID DEFAULT NULL,p_from DATE DEFAULT NULL,p_to DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE platform_admin BOOLEAN; scores_available BOOLEAN; score_source TEXT; result JSONB;
BEGIN
 IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from>p_to THEN RAISE EXCEPTION 'Start date must precede end date'; END IF;
 SELECT role='SUPER_ADMIN' INTO platform_admin FROM public.profiles
 WHERE user_id=auth.uid() AND status='ACTIVE' AND role IN ('SUPER_ADMIN','COLLEGE_ADMIN');
 IF platform_admin IS NULL THEN RAISE EXCEPTION 'Active administrator access required'; END IF;
 IF p_college_id IS NOT NULL AND NOT platform_admin AND p_college_id NOT IN (SELECT public.get_admin_college_ids()) THEN
   RAISE EXCEPTION 'College access denied';
 END IF;
 scores_available := to_regclass('public.student_employability_scores') IS NOT NULL;
 score_source := 'SELECT NULL::uuid AS student_id, NULL::numeric AS score, NULL::boolean AS is_provisional, NULL::text AS classification_label, NULL::timestamptz AS computed_at, NULL::jsonb AS breakdown WHERE false';
 IF scores_available THEN
   score_source := 'SELECT DISTINCT ON (student_id) student_id,score,is_provisional,classification_label,computed_at,breakdown FROM public.student_employability_scores WHERE ($8 IS NULL OR computed_at < (($8+1)::timestamp AT TIME ZONE ''Asia/Kolkata'')) ORDER BY student_id,computed_at DESC,id DESC';
 END IF;
 EXECUTE '
 WITH scoped AS (
 SELECT s.id,s.college_id,s.department_id,s.batch_id,s.account_type FROM public.students s
 JOIN public.profiles p ON p.user_id=s.user_id AND p.role=''STUDENT'' AND p.status=''ACTIVE''
 LEFT JOIN public.colleges c ON c.id=s.college_id
 WHERE s.status=''ACTIVE'' AND (s.account_type=''INDIVIDUAL'' OR c.status=''ACTIVE'')
 AND ($1 OR s.college_id IN (SELECT public.get_admin_college_ids()))
 AND ($2 IS NULL OR s.college_id=$2)
 AND ($4 IS NULL OR s.department_id=$4) AND ($5 IS NULL OR s.batch_id=$5)
 AND ($6 IS NULL OR EXISTS(SELECT 1 FROM public.enrollments e WHERE e.student_id=s.id AND e.course_id=$6 AND e.status IN (''ACTIVE'',''COMPLETED'')))
 ), latest AS ('||score_source||'), measured AS (
 SELECT s.*,l.score,l.classification_label,l.computed_at,l.breakdown FROM scoped s JOIN latest l ON l.student_id=s.id
 WHERE l.is_provisional=false AND l.score BETWEEN 0 AND 100 AND ($7 IS NULL OR l.computed_at >= ($7::timestamp AT TIME ZONE ''Asia/Kolkata''))
 ), classes AS (SELECT coalesce(classification_label,''Unclassified'') AS label,count(*) AS n FROM measured GROUP BY 1),
 departments AS (SELECT s.department_id,coalesce(d.name,''Unassigned'') AS department_name,round(avg(s.score),2) AS avg_score,count(*) AS n FROM measured s LEFT JOIN public.departments d ON d.id=s.department_id GROUP BY s.department_id,d.name),
 batches AS (SELECT s.batch_id,coalesce(b.name,''Unassigned'') AS batch_name,round(avg(s.score),2) AS avg_score,count(*) AS n FROM measured s LEFT JOIN public.batches b ON b.id=s.batch_id GROUP BY s.batch_id,b.name),
 colleges AS (SELECT s.college_id,coalesce(c.name,''Individual students'') AS name,count(*) AS students,count(m.id) AS measured,round(avg(m.score),2) AS average FROM scoped s LEFT JOIN measured m ON m.id=s.id LEFT JOIN public.colleges c ON c.id=s.college_id GROUP BY s.college_id,c.name),
 gaps AS (SELECT b->>''code'' AS code,b->>''name'' AS name,round(avg((b->>''gap'')::numeric),2) AS avg_gap,count(DISTINCT m.id) AS n FROM measured m CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.breakdown)=''array'' THEN m.breakdown ELSE ''[]''::jsonb END) b WHERE b->>''included''=''true'' AND CASE WHEN jsonb_typeof(b->''gap'')=''number'' THEN (b->>''gap'')::numeric ELSE 0 END>0 GROUP BY 1,2 ORDER BY avg_gap DESC LIMIT 10),
 enrolments AS (SELECT e.* FROM public.enrollments e JOIN scoped s ON s.id=e.student_id WHERE e.status IN (''ACTIVE'',''COMPLETED'') AND ($6 IS NULL OR e.course_id=$6) AND ($7 IS NULL OR e.enrollment_date>=($7::timestamp AT TIME ZONE ''Asia/Kolkata'')) AND ($8 IS NULL OR e.enrollment_date<(($8+1)::timestamp AT TIME ZONE ''Asia/Kolkata'')))
 SELECT jsonb_build_object(
 ''scores_available'',$3,''generated_at'',now(),''total_students'',(SELECT count(*) FROM scoped),
 ''individual_students'',(SELECT count(*) FROM scoped WHERE account_type=''INDIVIDUAL''),
 ''college_students'',(SELECT count(*) FROM scoped WHERE account_type=''COLLEGE''),
 ''students_with_score'',(SELECT count(*) FROM measured),''average_score'',(SELECT round(avg(score),2) FROM measured),
 ''provisional_students'',(SELECT count(*) FROM scoped s JOIN latest l ON l.student_id=s.id WHERE l.is_provisional=true AND ($7 IS NULL OR l.computed_at >= ($7::timestamp AT TIME ZONE ''Asia/Kolkata''))),
 ''latest_measurement'',(SELECT max(computed_at) FROM measured),
 ''classification_counts'',coalesce((SELECT jsonb_object_agg(label,n) FROM classes),''{}''::jsonb),
 ''department_averages'',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY avg_score DESC,department_name) FROM departments d),''[]''::jsonb),
 ''batch_averages'',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY avg_score DESC,batch_name) FROM batches b),''[]''::jsonb),
 ''college_averages'',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY name) FROM colleges c),''[]''::jsonb),
 ''top_skill_gaps'',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY avg_gap DESC) FROM gaps g),''[]''::jsonb),
 ''enrolments'',(SELECT count(*) FROM enrolments),
 ''completed_enrolments'',(SELECT count(*) FROM enrolments WHERE status=''COMPLETED''),
 ''students_enrolled'',(SELECT count(DISTINCT student_id) FROM enrolments),
 ''average_progress'',(SELECT round(avg(completion_percentage),2) FROM enrolments),
 ''graded_attempts'',(SELECT count(*) FROM public.assessment_attempts a JOIN scoped s ON s.id=a.student_id WHERE a.status=''GRADED'' AND ($6 IS NULL OR EXISTS(SELECT 1 FROM public.assessments ass WHERE ass.id=a.assessment_id AND ass.course_id=$6)) AND ($7 IS NULL OR a.completed_at>=($7::timestamp AT TIME ZONE ''Asia/Kolkata'')) AND ($8 IS NULL OR a.completed_at<(($8+1)::timestamp AT TIME ZONE ''Asia/Kolkata'')))
 )' INTO result USING platform_admin,p_college_id,scores_available,p_department_id,p_batch_id,p_course_id,p_from,p_to;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_learning_analytics_filtered(UUID,UUID,UUID,UUID,DATE,DATE) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_learning_analytics_filtered(UUID,UUID,UUID,UUID,DATE,DATE) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_students_needing_support(p_college_id UUID DEFAULT NULL,p_batch_id UUID DEFAULT NULL,p_threshold NUMERIC DEFAULT 40,p_page INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE admin BOOLEAN; result JSONB;
BEGIN
 SELECT role='SUPER_ADMIN' INTO admin FROM public.profiles WHERE user_id=auth.uid() AND status='ACTIVE' AND role IN ('SUPER_ADMIN','COLLEGE_ADMIN');
 IF admin IS NULL OR p_threshold IS NULL OR p_threshold NOT BETWEEN 0 AND 100 OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Support report access denied'; END IF;
 WITH progress AS (
 SELECT s.id,p.full_name,s.register_number,c.name AS college_name,b.name AS batch_name,count(e.id) AS enrolments,coalesce(round(avg(e.completion_percentage),2),0) AS average_progress
 FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id AND p.role='STUDENT' AND p.status='ACTIVE'
 JOIN public.colleges c ON c.id=s.college_id AND c.status='ACTIVE' LEFT JOIN public.batches b ON b.id=s.batch_id
 LEFT JOIN public.enrollments e ON e.student_id=s.id AND e.status IN ('ACTIVE','COMPLETED')
 WHERE s.status='ACTIVE' AND s.account_type='COLLEGE' AND (admin OR s.college_id IN (SELECT public.get_admin_college_ids()))
 AND (p_college_id IS NULL OR s.college_id=p_college_id) AND (p_batch_id IS NULL OR s.batch_id=p_batch_id)
 GROUP BY s.id,p.full_name,s.register_number,c.name,b.name
 ), needing AS(SELECT * FROM progress WHERE enrolments=0 OR average_progress<p_threshold), page AS(SELECT * FROM needing ORDER BY average_progress,full_name,id LIMIT 25 OFFSET (p_page-1)*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM needing),'students',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]')) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_students_needing_support(UUID,UUID,NUMERIC,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_students_needing_support(UUID,UUID,NUMERIC,INTEGER) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_extend_free_access(p_student_id UUID,p_months INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_super_admin() OR p_months IS NULL OR p_months NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'An active Super Admin and an extension of 1 to 12 months are required'; END IF;
 UPDATE public.programme_free_access SET expires_at=greatest(expires_at,now())+make_interval(months=>p_months)
 WHERE student_id=p_student_id AND EXISTS(SELECT 1 FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id WHERE s.id=p_student_id AND s.account_type='INDIVIDUAL' AND s.status='ACTIVE' AND p.role='STUDENT' AND p.status='ACTIVE');
 IF NOT FOUND THEN RAISE EXCEPTION 'No free access grant exists for this active individual student'; END IF;
 INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'FREE_ACCESS_EXTENDED','student',p_student_id,jsonb_build_object('months',p_months));
END $$;
REVOKE ALL ON FUNCTION public.fn_extend_free_access(UUID,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_extend_free_access(UUID,INTEGER) TO authenticated;
COMMIT;
