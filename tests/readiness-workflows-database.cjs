// Runs an isolated PostgreSQL (PGlite) database; never connects to hosted Supabase.
// node tests/payment-database.cjs <path-to-@electric-sql/pglite>
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let passed = 0;
const check = (value, expected, name) => { assert.deepEqual(value, expected, name); console.log(`PASS ${name}`); passed++; };
const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
async function caller(id, role = 'authenticated') {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id || ''}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
}
async function denied(sql, name) {
  await assert.rejects(() => db.exec(sql), undefined, name); console.log(`PASS ${name}`); passed++;
}
async function main() {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, email_confirmed_at TIMESTAMPTZ, raw_user_meta_data JSONB);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;`);
  const migrationDir = path.join(__dirname, '../supabase/migrations');
  for (const file of fs.readdirSync(migrationDir).filter(f => /^(00[1-9]|01[0-7])_/.test(f)).sort()) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8').replace(/^CREATE EXTENSION.*;$/gm, '');
    await db.exec(sql);
  }


  for(const name of ['023_employer_role.sql','024_professional_access.sql','025_employer_jobs.sql']) await db.exec(fs.readFileSync(path.join(migrationDir,name),'utf8'));
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@example.test',now() FROM generate_series(1,14)n;
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
    UPDATE profiles SET role='SUPER_ADMIN' WHERE user_id='${uid(1)}';
    UPDATE profiles SET role='COLLEGE_ADMIN' WHERE user_id='${uid(2)}';
    INSERT INTO colleges(id,name,code,status) VALUES('${uid(100)}','College A','A','ACTIVE'),('${uid(101)}','College B','B','ACTIVE');
    INSERT INTO user_college_memberships(user_id,college_id,role) VALUES('${uid(2)}','${uid(100)}','COLLEGE_ADMIN');
    INSERT INTO batches(id,college_id,name,academic_year) VALUES('${uid(200)}','${uid(100)}','Batch A','2026'),('${uid(201)}','${uid(101)}','Batch B','2026');`);

  for (const name of ['026_free_programme_access.sql','027_learning_analytics.sql','028_scoring_foundation.sql','029_job_applications.sql','030_learning_workflows.sql']) await db.exec(fs.readFileSync(path.join(migrationDir,name),'utf8'));
  await caller(uid(1));
  await db.exec(`SELECT fn_setup_professional_account('user4@example.test','EMPLOYER',NULL,'Company A');SELECT fn_setup_professional_account('user5@example.test','EMPLOYER',NULL,'Company B');
    INSERT INTO students(id,user_id,college_id,account_type,register_number,batch_id) VALUES('${uid(310)}','${uid(10)}','${uid(100)}','COLLEGE','A10','${uid(200)}'),('${uid(311)}','${uid(11)}','${uid(100)}','COLLEGE','A11','${uid(200)}'),('${uid(312)}','${uid(12)}','${uid(101)}','COLLEGE','B12','${uid(201)}');
    INSERT INTO courses(id,title,category,status) VALUES('${uid(500)}','Course A','Communication','ACTIVE'),('${uid(501)}','Course B','Communication','ACTIVE');
    INSERT INTO enrollments(student_id,course_id,status,completion_percentage) VALUES('${uid(310)}','${uid(500)}','ACTIVE',20),('${uid(312)}','${uid(500)}','ACTIVE',80);
    INSERT INTO assessments(id,course_id,title) VALUES('${uid(600)}','${uid(500)}','Formal quiz');`);
  for(const n of [null,4,12]){await caller(n?uid(n):null,n?'authenticated':'anon');await denied(`SELECT fn_compute_employability_score('${uid(310)}')`,`unauthorised scorer ${n} denied`);}
  await caller(uid(2));await denied(`SELECT fn_compute_employability_score('${uid(312)}')`,'college administrator cannot score other college');
  await caller(uid(10));let score=await scalar(`SELECT fn_compute_employability_score('${uid(310)}')`);check(score.is_provisional,true,'no evidence stays provisional');check(score.skills_measured,0,'no fabricated measurements');
  await denied(`UPDATE students SET employability_score=100 WHERE id='${uid(310)}'`,'student cannot forge cached score');
  await db.exec('UPDATE employability_score_weights SET weight_percent=100');check(Number(await scalar('SELECT sum(weight_percent) FROM employability_score_weights')),100,'student cannot change scoring weights');
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.role','service_role',false);
    INSERT INTO assessment_attempts(id,student_id,assessment_id,status) VALUES('${uid(700)}','${uid(310)}','${uid(600)}','GRADED');
    INSERT INTO student_skill_snapshots(student_id,skill_id,attempt_id,applicable_question_count,weighted_obtained,weighted_total,proficiency,is_valid) SELECT '${uid(310)}',id,'${uid(700)}',3,3,3,100,true FROM skills;
    INSERT INTO student_skill_summaries(student_id,skill_id,current_proficiency,last_valid_snapshot_id,last_attempt_id,applicable_question_count) SELECT student_id,skill_id,100,id,attempt_id,3 FROM student_skill_snapshots;`);
  await caller(uid(10));score=await scalar(`SELECT fn_compute_employability_score('${uid(310)}')`);check(score.score,100,'full formal evidence produces score');check(score.is_provisional,false,'all weighted skills measured');check(score.classification_code,'PLACEMENT_READY','classification matches configured band');
  check((await scalar(`SELECT fn_compute_employability_score('${uid(310)}')`)).history_id,score.history_id,'unchanged refresh is idempotent');
  await db.exec(`RESET ROLE; UPDATE student_skill_snapshots SET proficiency=0 WHERE skill_id=(SELECT id FROM skills WHERE code='COMM');`);
  await caller(uid(10));check((await scalar(`SELECT fn_compute_employability_score('${uid(310)}')`)).score,75,'zero proficiency included in weighted score');
  for(const n of [12,4]){await caller(uid(n));check(await scalar('SELECT count(*) FROM student_employability_scores'),0,`role ${n} cannot read other score history`);}
  const saveJob=(id='NULL',deadline='NULL')=>`SELECT fn_save_employer_job_details(${id},'Graduate Analyst','Bengaluru','Communication and analytical ability required.',70,'PUBLISHED','Any graduate','Communication',2,0,'HYBRID',${deadline})`;
  const job=await scalar(saveJob());await caller(uid(5));await denied(saveJob(`'${job}'`),'another employer cannot edit job');
  await caller(uid(10));await denied(`SELECT fn_apply_for_job('${job}','Hello',false)`,'application requires consent');
  const application=await scalar(`SELECT fn_apply_for_job('${job}','Interested',true)`);
  check(await scalar(`SELECT fn_apply_for_job('${job}','Duplicate',true)`),application,'duplicate application creates one record');
  check((await scalar('SELECT fn_my_job_applications()')).total,1,'student sees own application');
  await caller(uid(12));check((await scalar('SELECT fn_my_job_applications()')).total,0,'other student cannot view application');await denied(`SELECT fn_change_application_status('${application}','WITHDRAWN')`,'other student cannot withdraw');
  await caller(uid(5));check((await scalar('SELECT fn_my_job_applications()')).total,0,'other employer cannot view application');await denied(`SELECT fn_change_application_status('${application}','SHORTLISTED')`,'other employer cannot shortlist');
  await caller(uid(4));check((await scalar('SELECT fn_my_job_applications()')).applications[0].applicant_email,'user10@example.test','consented email visible to job owner');await db.exec(`SELECT fn_change_application_status('${application}','SHORTLISTED')`);
  await caller(uid(10));check((await scalar('SELECT fn_my_job_applications()')).applications[0].status,'SHORTLISTED','student sees employer status');await db.exec(`SELECT fn_change_application_status('${application}','WITHDRAWN')`);
  await caller(uid(4));check((await scalar('SELECT fn_my_job_applications()')).total,0,'withdrawal hides application');await denied(`SELECT fn_change_application_status('${application}','UNDER_REVIEW')`,'cannot revive withdrawn application');await denied(saveJob('NULL',"'2000-01-01'"),'expired job cannot publish');
  await db.exec(`RESET ROLE; UPDATE employer_jobs SET application_deadline='2000-01-01' WHERE id='${job}'`);await caller(uid(11));await denied(`SELECT fn_apply_for_job('${job}','Late',true)`,'deadline blocks application');check((await scalar('SELECT fn_student_job_posts()')).total,0,'expired job hidden');
  await caller(uid(2));let report=await scalar('SELECT fn_learning_analytics_filtered()');check(report.total_students,2,'filtered analytics college scope');check(report.students_with_score,1,'scoring integrates with analytics');
  check((await scalar(`SELECT fn_learning_analytics_filtered(NULL,NULL,'${uid(201)}')`)).total_students,0,'foreign batch cannot expose students');check((await scalar(`SELECT fn_learning_analytics_filtered(NULL,NULL,NULL,'${uid(501)}')`)).total_students,0,'course filter applied');
  await denied(`SELECT fn_learning_analytics_filtered(NULL,NULL,NULL,NULL,'2026-12-01','2026-01-01')`,'reversed dates rejected');check((await scalar(`SELECT fn_learning_analytics_filtered(NULL,NULL,NULL,NULL,'2000-01-01','2000-01-02')`)).enrolments,0,'date range filters enrolments');
  const support=await scalar('SELECT fn_students_needing_support()');check(support.total,2,'support includes low progress and no enrolment');check(support.students.some(x=>x.id===uid(312)),false,'support excludes other college');await caller(uid(4));await denied('SELECT fn_students_needing_support()','employer cannot query support');
  await caller(uid(13));await db.exec('SELECT fn_register_individual_student();SELECT fn_activate_free_programme()');const student=await scalar(`SELECT id FROM students WHERE user_id='${uid(13)}'`);const before=await scalar('SELECT expires_at::text FROM programme_free_access');await denied(`SELECT fn_extend_free_access('${student}',1)`,'student cannot extend own access');
  await caller(uid(1));await db.exec(`SELECT fn_extend_free_access('${student}',1)`);await caller(uid(13));check((await scalar('SELECT expires_at::text FROM programme_free_access'))>before,true,'admin extension advances expiry');
  await caller(uid(1));const records=await scalar('SELECT count(*) FROM student_employability_scores');await db.exec('RESET ROLE');for(const name of ['028_scoring_foundation.sql','029_job_applications.sql','030_learning_workflows.sql'])await db.exec(fs.readFileSync(path.join(migrationDir,name),'utf8'));await caller(uid(1));check(await scalar('SELECT count(*) FROM student_employability_scores'),records,'rerun preserves history');
  await db.exec('RESET ROLE');
  const jobsBefore=await scalar('SELECT count(*) FROM employer_jobs');
  const applicationsBefore=await scalar('SELECT count(*) FROM job_applications');
  const retirement=fs.readFileSync(path.join(migrationDir,'031_employer_readiness_only.sql'),'utf8');
  await db.exec(retirement); await db.exec(retirement);
  check(await scalar('SELECT count(*) FROM employer_jobs'),jobsBefore,'retirement preserves job history');
  check(await scalar('SELECT count(*) FROM job_applications'),applicationsBefore,'retirement preserves application history');
  for(const role of [4,10]) {
    await caller(uid(role));
    await denied(saveJob(),`role ${role} cannot post jobs after retirement`);
    await denied(`SELECT fn_apply_for_job('${job}','Retired',true)`,`role ${role} cannot apply after retirement`);
    await denied('SELECT fn_my_job_applications()',`role ${role} cannot read applications after retirement`);
    await denied(`SELECT fn_change_application_status('${application}','SHORTLISTED')`,`role ${role} cannot change retired applications`);
    await denied('SELECT fn_student_job_posts()',`role ${role} cannot browse retired jobs`);
    await denied('SELECT * FROM employer_jobs',`role ${role} cannot read job table`);
    await denied('SELECT * FROM job_applications',`role ${role} cannot read applicant table`);
  }
  await caller(uid(4));
  let readiness=await scalar('SELECT fn_employer_college_readiness(70)');
  const college=readiness.colleges.find(c=>c.id===uid(100));
  check([college.active_students,college.measured_students,college.qualifying_students],[2,1,1],'readiness has full college denominator and final qualifying count');
  check(readiness.colleges.some(c=>'email' in c || 'students' in c || 'student_id' in c),false,'employer report exposes aggregates only');
  check((await scalar('SELECT fn_employer_college_readiness(100)')).colleges.find(c=>c.id===uid(100)).qualifying_students,0,'higher threshold changes qualifying count');
  await db.exec(`RESET ROLE; INSERT INTO student_employability_scores(student_id,score,is_provisional,computed_at) VALUES('${uid(310)}',100,true,now()+interval '1 minute');`);
  await caller(uid(4));
  check((await scalar('SELECT fn_employer_college_readiness(70)')).colleges.find(c=>c.id===uid(100)).qualifying_students,0,'new provisional score does not fall back to an older final score');
  await caller(uid(10));await denied('SELECT fn_employer_college_readiness(70)','student cannot invoke employer report');
  await caller(null,'anon');await denied('SELECT fn_employer_college_readiness(70)','anonymous cannot invoke employer report');
  await db.exec(`RESET ROLE; UPDATE employer_companies SET status='INACTIVE' WHERE user_id='${uid(4)}'`);
  await caller(uid(4));await denied('SELECT fn_employer_college_readiness(70)','inactive employer cannot invoke report');
  console.log(`${passed} workflow database checks passed`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.close());
