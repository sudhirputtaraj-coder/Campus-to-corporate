-- Aggregate analytics; no student identities are returned. Apply after 026.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_learning_analytics(p_college_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE platform_admin BOOLEAN; scores_available BOOLEAN; score_source TEXT; result JSONB;
BEGIN
 SELECT role='SUPER_ADMIN' INTO platform_admin FROM public.profiles
 WHERE user_id=auth.uid() AND status='ACTIVE' AND role IN ('SUPER_ADMIN','COLLEGE_ADMIN');
 IF platform_admin IS NULL THEN RAISE EXCEPTION 'Active administrator access required'; END IF;
 IF p_college_id IS NOT NULL AND NOT platform_admin AND p_college_id NOT IN (SELECT public.get_admin_college_ids()) THEN
   RAISE EXCEPTION 'College access denied';
 END IF;
 scores_available := to_regclass('public.student_employability_scores') IS NOT NULL;
 score_source := 'SELECT NULL::uuid AS student_id, NULL::numeric AS score, NULL::boolean AS is_provisional, NULL::text AS classification_label, NULL::timestamptz AS computed_at, NULL::jsonb AS breakdown WHERE false';
 IF scores_available THEN
   score_source := 'SELECT DISTINCT ON (student_id) student_id,score,is_provisional,classification_label,computed_at,breakdown FROM public.student_employability_scores ORDER BY student_id,computed_at DESC,id DESC';
 END IF;
 EXECUTE '
 WITH scoped AS (
 SELECT s.id,s.college_id,s.department_id,s.batch_id,s.account_type FROM public.students s
 JOIN public.profiles p ON p.user_id=s.user_id AND p.role=''STUDENT'' AND p.status=''ACTIVE''
 LEFT JOIN public.colleges c ON c.id=s.college_id
 WHERE s.status=''ACTIVE'' AND (s.account_type=''INDIVIDUAL'' OR c.status=''ACTIVE'')
 AND ($1 OR s.college_id IN (SELECT public.get_admin_college_ids()))
 AND ($2 IS NULL OR s.college_id=$2)
 ), latest AS ('||score_source||'), measured AS (
 SELECT s.*,l.score,l.classification_label,l.computed_at,l.breakdown FROM scoped s JOIN latest l ON l.student_id=s.id
 WHERE l.is_provisional=false AND l.score BETWEEN 0 AND 100
 ), classes AS (SELECT coalesce(classification_label,''Unclassified'') AS label,count(*) AS n FROM measured GROUP BY 1),
 departments AS (SELECT s.department_id,coalesce(d.name,''Unassigned'') AS department_name,round(avg(s.score),2) AS avg_score,count(*) AS n FROM measured s LEFT JOIN public.departments d ON d.id=s.department_id GROUP BY s.department_id,d.name),
 batches AS (SELECT s.batch_id,coalesce(b.name,''Unassigned'') AS batch_name,round(avg(s.score),2) AS avg_score,count(*) AS n FROM measured s LEFT JOIN public.batches b ON b.id=s.batch_id GROUP BY s.batch_id,b.name),
 colleges AS (SELECT s.college_id,coalesce(c.name,''Individual students'') AS name,count(*) AS students,count(m.id) AS measured,round(avg(m.score),2) AS average FROM scoped s LEFT JOIN measured m ON m.id=s.id LEFT JOIN public.colleges c ON c.id=s.college_id GROUP BY s.college_id,c.name),
 gaps AS (SELECT b->>''code'' AS code,b->>''name'' AS name,round(avg((b->>''gap'')::numeric),2) AS avg_gap,count(DISTINCT m.id) AS n FROM measured m CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.breakdown)=''array'' THEN m.breakdown ELSE ''[]''::jsonb END) b WHERE b->>''included''=''true'' AND CASE WHEN jsonb_typeof(b->''gap'')=''number'' THEN (b->>''gap'')::numeric ELSE 0 END>0 GROUP BY 1,2 ORDER BY avg_gap DESC LIMIT 10),
 enrolments AS (SELECT e.* FROM public.enrollments e JOIN scoped s ON s.id=e.student_id WHERE e.status IN (''ACTIVE'',''COMPLETED''))
 SELECT jsonb_build_object(
 ''scores_available'',$3,''generated_at'',now(),''total_students'',(SELECT count(*) FROM scoped),
 ''individual_students'',(SELECT count(*) FROM scoped WHERE account_type=''INDIVIDUAL''),
 ''college_students'',(SELECT count(*) FROM scoped WHERE account_type=''COLLEGE''),
 ''students_with_score'',(SELECT count(*) FROM measured),''average_score'',(SELECT round(avg(score),2) FROM measured),
 ''provisional_students'',(SELECT count(*) FROM scoped s JOIN latest l ON l.student_id=s.id WHERE l.is_provisional=true),
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
 ''graded_attempts'',(SELECT count(*) FROM public.assessment_attempts a JOIN scoped s ON s.id=a.student_id WHERE a.status=''GRADED'')
 )' INTO result USING platform_admin,p_college_id,scores_available;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_learning_analytics(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_learning_analytics(UUID) TO authenticated;
COMMIT;
