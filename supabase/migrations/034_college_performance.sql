-- Read-only college performance reporting. Apply after migration 033.
-- No tables or RLS policies are created or weakened.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_college_performance(
 p_college_id UUID DEFAULT NULL, p_department_id UUID DEFAULT NULL,
 p_batch_id UUID DEFAULT NULL, p_course_id UUID DEFAULT NULL,
 p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL,
 p_minimum NUMERIC DEFAULT NULL, p_view TEXT DEFAULT 'all',
 p_query TEXT DEFAULT '', p_page INTEGER DEFAULT 1
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE admin BOOLEAN; benchmark NUMERIC; result JSONB;
BEGIN
 SELECT role='SUPER_ADMIN' INTO admin FROM public.profiles
 WHERE user_id=auth.uid() AND status='ACTIVE' AND role IN ('SUPER_ADMIN','COLLEGE_ADMIN');
 IF admin IS NULL THEN RAISE EXCEPTION 'Active college administrator access required'; END IF;
 IF p_college_id IS NOT NULL AND NOT admin AND p_college_id NOT IN (SELECT public.get_admin_college_ids()) THEN
   RAISE EXCEPTION 'College access denied';
 END IF;
 SELECT coalesce(p_minimum,(SELECT min_score FROM public.employability_classifications WHERE code='PLACEMENT_READY' AND is_active)) INTO benchmark;
 IF benchmark IS NULL OR benchmark NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'A readiness benchmark between 0 and 100 is required'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR p_view IS NULL OR p_view NOT IN ('all','ready','support','unmeasured','provisional')
 OR length(coalesce(p_query,''))>80 OR (p_from IS NOT NULL AND p_to IS NOT NULL AND p_from>p_to) THEN RAISE EXCEPTION 'Invalid report filters'; END IF;
 WITH scoped AS MATERIALIZED (
   SELECT s.id,s.college_id,s.department_id,s.batch_id,s.register_number,p.full_name,
     c.name AS college_name,coalesce(d.name,'Unassigned') AS department_name,coalesce(b.name,'Unassigned') AS batch_name
   FROM public.students s JOIN public.profiles p ON p.user_id=s.user_id AND p.role='STUDENT' AND p.status='ACTIVE'
   JOIN public.colleges c ON c.id=s.college_id AND c.status='ACTIVE'
   LEFT JOIN public.departments d ON d.id=s.department_id LEFT JOIN public.batches b ON b.id=s.batch_id
   WHERE s.account_type='COLLEGE' AND s.status='ACTIVE'
   AND (admin OR s.college_id IN (SELECT public.get_admin_college_ids()))
   AND (p_college_id IS NULL OR s.college_id=p_college_id)
   AND (p_department_id IS NULL OR s.department_id=p_department_id)
   AND (p_batch_id IS NULL OR s.batch_id=p_batch_id)
   AND (p_course_id IS NULL OR EXISTS(SELECT 1 FROM public.enrollments e WHERE e.student_id=s.id AND e.course_id=p_course_id AND e.status IN ('ACTIVE','COMPLETED')))
 ), latest AS (
   SELECT DISTINCT ON (h.student_id) h.* FROM public.student_employability_scores h JOIN scoped s ON s.id=h.student_id
   WHERE p_to IS NULL OR h.computed_at < ((p_to+1)::timestamp AT TIME ZONE 'Asia/Kolkata')
   ORDER BY h.student_id,h.computed_at DESC,h.id DESC
 ), enrolments AS MATERIALIZED (
   SELECT e.* FROM public.enrollments e JOIN scoped s ON s.id=e.student_id
   WHERE e.status IN ('ACTIVE','COMPLETED') AND (p_course_id IS NULL OR e.course_id=p_course_id)
 ), progress AS (
   SELECT student_id,count(*) AS enrolments,round(avg(completion_percentage),2) AS progress FROM enrolments GROUP BY student_id
 ), measured AS MATERIALIZED (
   SELECT s.*,h.score,h.is_provisional,h.computed_at,h.breakdown,
     (h.id IS NOT NULL AND NOT h.is_provisional) AS final,
     (h.id IS NOT NULL AND h.is_provisional) AS provisional,
     (h.id IS NOT NULL AND NOT h.is_provisional AND h.score>=benchmark) AS ready,
     coalesce(e.enrolments,0) AS enrolments,e.progress
   FROM scoped s LEFT JOIN latest h ON h.student_id=s.id AND (p_from IS NULL OR h.computed_at >= (p_from::timestamp AT TIME ZONE 'Asia/Kolkata'))
   LEFT JOIN progress e ON e.student_id=s.id
 ), flagged AS MATERIALIZED (
   SELECT m.*, (NOT final OR score<benchmark OR enrolments=0 OR coalesce(progress,0)<40 OR EXISTS(
     SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(breakdown)='array' THEN breakdown ELSE '[]'::jsonb END) item
     WHERE item->>'included'='true' AND CASE WHEN jsonb_typeof(item->'gap')='number' THEN (item->>'gap')::numeric ELSE 0 END>0
   )) AS needs_support FROM measured m
 ), groups AS (
   SELECT 'college' AS kind,college_id AS id,college_name AS name,college_id,NULL::uuid AS department_id,
     count(*) AS total,count(*) FILTER(WHERE final) AS measured,count(*) FILTER(WHERE provisional) AS provisional,
     count(*) FILTER(WHERE NOT final AND NOT provisional) AS unmeasured,count(*) FILTER(WHERE ready) AS ready,
     round(avg(score) FILTER(WHERE final),2) AS average FROM flagged GROUP BY college_id,college_name
   UNION ALL
   SELECT 'department',department_id,department_name,college_id,department_id,count(*),count(*) FILTER(WHERE final),count(*) FILTER(WHERE provisional),
     count(*) FILTER(WHERE NOT final AND NOT provisional),count(*) FILTER(WHERE ready),round(avg(score) FILTER(WHERE final),2)
     FROM flagged GROUP BY department_id,department_name,college_id
   UNION ALL
   SELECT 'batch',batch_id,batch_name,college_id,p_department_id,count(*),count(*) FILTER(WHERE final),count(*) FILTER(WHERE provisional),
     count(*) FILTER(WHERE NOT final AND NOT provisional),count(*) FILTER(WHERE ready),round(avg(score) FILTER(WHERE final),2)
     FROM flagged GROUP BY batch_id,batch_name,college_id
 ), attempts AS MATERIALIZED (
   -- Latest graded formal attempt per student and assessment within the selected period.
   SELECT DISTINCT ON (a.student_id,a.assessment_id) a.*,ass.course_id,ass.title
   FROM public.assessment_attempts a JOIN scoped s ON s.id=a.student_id JOIN public.assessments ass ON ass.id=a.assessment_id
   WHERE a.status='GRADED' AND ass.is_practice=false
   AND (p_course_id IS NULL OR ass.course_id=p_course_id)
   AND (p_from IS NULL OR a.completed_at >= (p_from::timestamp AT TIME ZONE 'Asia/Kolkata'))
   AND (p_to IS NULL OR a.completed_at < ((p_to+1)::timestamp AT TIME ZONE 'Asia/Kolkata'))
   ORDER BY a.student_id,a.assessment_id,a.completed_at DESC NULLS LAST,a.id DESC
 ), course_progress AS (
   SELECT course_id,count(*) AS enrolled,count(*) FILTER(WHERE status='COMPLETED') AS completed,round(avg(completion_percentage),2) AS progress
   FROM enrolments GROUP BY course_id
 ), course_scores AS (
   SELECT course_id,count(*) AS assessed,count(*) FILTER(WHERE passed=true) AS passed,round(avg(percentage),2) AS average,
     round(100.0*count(*) FILTER(WHERE passed=true)/nullif(count(*) FILTER(WHERE passed IS NOT NULL),0),2) AS pass_rate
   FROM attempts GROUP BY course_id
 ), course_ids AS (SELECT course_id FROM course_progress UNION SELECT course_id FROM course_scores),
 courses AS (
   SELECT c.id,c.title,coalesce(e.enrolled,0) AS enrolled,coalesce(e.completed,0) AS completed,e.progress,
     coalesce(a.assessed,0) AS assessed,a.average,a.pass_rate FROM course_ids i JOIN public.courses c ON c.id=i.course_id
   LEFT JOIN course_progress e ON e.course_id=i.course_id LEFT JOIN course_scores a ON a.course_id=i.course_id
 ), matching AS MATERIALIZED (
   SELECT * FROM flagged WHERE
     (p_view='all' OR (p_view='ready' AND ready) OR (p_view='support' AND needs_support) OR (p_view='provisional' AND provisional) OR (p_view='unmeasured' AND NOT final AND NOT provisional))
     AND (coalesce(p_query,'')='' OR strpos(lower(full_name),lower(p_query))>0 OR strpos(lower(register_number),lower(p_query))>0)
 ), page AS (
   SELECT id,full_name,register_number,college_name,department_name,batch_name,score,final,provisional,ready,computed_at,progress,enrolments,needs_support
   FROM matching ORDER BY full_name,id LIMIT 25 OFFSET (p_page-1)*25
 ) SELECT jsonb_build_object(
   'benchmark',benchmark,'generated_at',now(),'total',(SELECT count(*) FROM flagged),
   'measured',(SELECT count(*) FROM flagged WHERE final),'provisional',(SELECT count(*) FROM flagged WHERE provisional),
   'unmeasured',(SELECT count(*) FROM flagged WHERE NOT final AND NOT provisional),'ready',(SELECT count(*) FROM flagged WHERE ready),
   'average',(SELECT round(avg(score),2) FROM flagged WHERE final),'support',(SELECT count(*) FROM flagged WHERE needs_support),
   'groups',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY kind,name,id) FROM groups g),'[]'),
   'courses',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY title,id) FROM courses c),'[]'),
   'matching',(SELECT count(*) FROM matching),'students',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY full_name,id) FROM page p),'[]')
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_college_performance(UUID,UUID,UUID,UUID,DATE,DATE,NUMERIC,TEXT,TEXT,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_college_performance(UUID,UUID,UUID,UUID,DATE,DATE,NUMERIC,TEXT,TEXT,INTEGER) TO authenticated;
COMMIT;
