// Isolated PostgreSQL tests; never connects to hosted Supabase.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const db=new PGlite(),uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const dir=path.join(__dirname,'../supabase/migrations');
const scalar=async sql=>Object.values((await db.query(sql)).rows[0])[0];
const caller=async(n,role='authenticated')=>db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${n?uid(n):''}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
let passed=0;
function check(actual,expected,name){assert.deepEqual(actual,expected,name);console.log('PASS',name);passed++;}
async function denied(sql,name){await assert.rejects(()=>db.exec(sql));console.log('PASS',name);passed++;}
async function main(){
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,raw_user_meta_data JSONB);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;`);
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql') && Number(f.slice(0,3)) < 35).sort())await db.exec(fs.readFileSync(path.join(dir,file),'utf8').replace(/^CREATE EXTENSION.*;$/gm,''));
  const migration=fs.readFileSync(path.join(dir,'034_college_performance.sql'),'utf8');await db.exec(migration);await db.exec(migration);
  await db.exec(`SELECT set_config('request.jwt.claim.role','service_role',false);
    INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'u'||n||'@example.test',now() FROM generate_series(1,15)n;
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
    UPDATE profiles SET role='SUPER_ADMIN' WHERE user_id='${uid(1)}';
    UPDATE profiles SET role='COLLEGE_ADMIN' WHERE user_id IN ('${uid(2)}','${uid(3)}');
    UPDATE profiles SET role='EMPLOYER' WHERE user_id='${uid(4)}';
    UPDATE profiles SET role='TRAINER' WHERE user_id='${uid(5)}';
    INSERT INTO colleges(id,name,code,status) VALUES('${uid(100)}','College A','A','ACTIVE'),('${uid(101)}','College B','B','ACTIVE');
    INSERT INTO user_college_memberships(user_id,college_id,role) VALUES('${uid(2)}','${uid(100)}','COLLEGE_ADMIN'),('${uid(3)}','${uid(101)}','COLLEGE_ADMIN');
    INSERT INTO departments(id,college_id,name,code) VALUES('${uid(150)}','${uid(100)}','Computing','CS'),('${uid(151)}','${uid(101)}','Computing','CS');
    INSERT INTO batches(id,college_id,department_id,name,academic_year) VALUES('${uid(200)}','${uid(100)}','${uid(150)}','Final year','2026'),('${uid(201)}','${uid(101)}','${uid(151)}','Final year','2026');
    INSERT INTO students(id,user_id,college_id,department_id,batch_id,account_type,register_number) VALUES
    ('${uid(310)}','${uid(10)}','${uid(100)}','${uid(150)}','${uid(200)}','COLLEGE','A10'),
    ('${uid(311)}','${uid(11)}','${uid(100)}','${uid(150)}','${uid(200)}','COLLEGE','A11'),
    ('${uid(312)}','${uid(12)}','${uid(100)}',NULL,NULL,'COLLEGE','A12'),
    ('${uid(313)}','${uid(13)}','${uid(100)}','${uid(150)}','${uid(200)}','COLLEGE','A13'),
    ('${uid(314)}','${uid(14)}','${uid(101)}','${uid(151)}','${uid(201)}','COLLEGE','B14'),
    ('${uid(315)}','${uid(15)}',NULL,NULL,NULL,'INDIVIDUAL','I15');
    INSERT INTO student_employability_scores(student_id,score,is_provisional,computed_at) VALUES
    ('${uid(310)}',90,false,'2026-09-01'),('${uid(311)}',0,false,'2026-09-01'),
    ('${uid(313)}',100,false,'2026-08-01'),('${uid(313)}',100,true,'2026-09-02'),('${uid(314)}',100,false,'2026-09-01');
    INSERT INTO courses(id,title,category,status) VALUES('${uid(500)}','Communication','Communication','ACTIVE');
    INSERT INTO enrollments(student_id,course_id,status,completion_percentage) VALUES
    ('${uid(310)}','${uid(500)}','COMPLETED',100),('${uid(311)}','${uid(500)}','COMPLETED',100),('${uid(314)}','${uid(500)}','ACTIVE',20);
    INSERT INTO assessments(id,course_id,title,is_practice) VALUES('${uid(600)}','${uid(500)}','Formal',false),('${uid(601)}','${uid(500)}','Practice',true);
    INSERT INTO assessment_attempts(student_id,assessment_id,attempt_number,status,percentage,passed,completed_at) VALUES
    ('${uid(310)}','${uid(600)}',1,'GRADED',20,false,'2026-09-01'),('${uid(310)}','${uid(600)}',2,'GRADED',80,true,'2026-09-02'),
    ('${uid(311)}','${uid(600)}',1,'GRADED',0,false,'2026-09-01'),('${uid(310)}','${uid(601)}',1,'GRADED',100,true,'2026-09-02');`);
  await db.exec(`UPDATE profiles SET email='legacy-spoof@example.test' WHERE user_id='${uid(15)}'`);
  const security=fs.readFileSync(path.join(dir,'035_security_assessment_integrity.sql'),'utf8');
  await db.exec(security); await db.exec(security);
  await caller(10);
  await denied(`UPDATE assessment_attempts SET percentage=100 WHERE student_id='${uid(310)}'`,'student cannot rewrite grades');
  await denied(`INSERT INTO assessment_attempts(student_id,assessment_id,attempt_number,status) VALUES('${uid(310)}','${uid(600)}',999,'GRADED')`,'student cannot forge attempt or exceed limit directly');
  await denied(`DELETE FROM assessment_attempts WHERE student_id='${uid(310)}'`,'student cannot delete history');
  await denied(`UPDATE assessment_answers SET marks_awarded=100`,'student cannot write answer marks');
  await denied(`UPDATE profiles SET email='spoof@example.test' WHERE user_id='${uid(10)}'`,'profile email spoof blocked');
  await db.exec(`UPDATE profiles SET full_name='Updated student' WHERE user_id='${uid(10)}'`);
  check(await scalar(`SELECT full_name FROM profiles WHERE user_id='${uid(10)}'`),'Updated student','ordinary profile edits retained');
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); UPDATE auth.users SET email='confirmed-change@example.test' WHERE id='${uid(10)}'`);
  check(await scalar(`SELECT email FROM profiles WHERE user_id='${uid(10)}'`),'confirmed-change@example.test','trusted Auth email sync retained');
  await db.exec(`UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(2)}'`); await caller(2);
  check(await scalar(`SELECT count(*) FROM students`),0,'suspended admin cannot enumerate students directly');
  check((await db.query(`UPDATE colleges SET city='bad' WHERE id='${uid(100)}' RETURNING id`)).rows.length,0,'suspended admin cannot edit college');
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); UPDATE profiles SET status='ACTIVE' WHERE user_id='${uid(2)}'; UPDATE colleges SET status='INACTIVE' WHERE id='${uid(100)}'`); await caller(2);
  check(await scalar(`SELECT count(*) FROM get_admin_college_ids()`),0,'inactive college denied');
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); UPDATE colleges SET status='ACTIVE' WHERE id='${uid(100)}'; UPDATE profiles SET role='STUDENT' WHERE user_id='${uid(2)}'`); await caller(2);
  check(await scalar(`SELECT count(*) FROM get_admin_college_ids()`),0,'stale membership after role change denied');
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); UPDATE profiles SET role='COLLEGE_ADMIN' WHERE user_id='${uid(2)}'`);
  async function makeAssessment(n,practice=false,manual=false) {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SELECT set_config('request.jwt.claim.role','service_role',false);
      INSERT INTO assessments(id,course_id,title,is_practice,max_attempts,duration_minutes) VALUES('${uid(n)}','${uid(500)}','Secure assessment',${practice},1,30)`);
    for(let i=1;i<=3;i++) await db.exec(`INSERT INTO questions(id,assessment_id,question_text,question_type,correct_answer,marks) VALUES('${uid(n+i)}','${uid(n)}','Question ${i}','${manual?'WRITTEN':'MCQ'}','correct',1);
      INSERT INTO question_skills(question_id,skill_id,weight) SELECT '${uid(n+i)}',id,1 FROM skills WHERE code='COMM'`);
    await caller(10);
  }
  const start=n=>scalar(`SELECT fn_start_assessment('${uid(n)}')`);
  const payload=(n,answer='correct')=>Array.from({length:3},(_,i)=>({questionId:uid(n+i+1),answerText:answer}));
  const submit=(id,answers)=>scalar(`SELECT fn_submit_assessment('${id}','${JSON.stringify(answers).replaceAll("'","''")}'::jsonb)`);
  await makeAssessment(700);
  await caller(null,'anon'); await denied(`SELECT fn_start_assessment('${uid(700)}')`,'anonymous start denied');
  await caller(2);await denied(`SELECT fn_start_assessment('${uid(700)}')`,'college admin cannot take assessment');
  await caller(12);await denied(`SELECT fn_start_assessment('${uid(700)}')`,'unenrolled student denied');
  await caller(10); const first=await start(700);check((await start(700)).attemptId,first.attemptId,'repeat start returns same attempt');
  await caller(14);await assert.rejects(()=>submit(first.attemptId,payload(700)));passed++;console.log('PASS foreign attempt denied');await caller(10);
  for(const answers of [[],payload(700).slice(1),[payload(700)[0],payload(700)[0],payload(700)[2]],payload(700).map(a=>({...a,questionId:uid(9999)})),payload(700).map(a=>({...a,answerText:''})),payload(700).map(a=>({...a,answerText:12})),payload(700).map(a=>({...a,answerText:'x'.repeat(4001)}))]) {
    await assert.rejects(()=>submit(first.attemptId,answers));passed++;console.log('PASS malformed/incomplete/foreign answers rejected');
  }
  check(await scalar(`SELECT count(*) FROM assessment_answers WHERE attempt_id='${first.attemptId}'`),0,'rejected input writes nothing');
  const result=await submit(first.attemptId,payload(700,'wrong'));
  check([result.percentage,result.passed],[0,false],'server calculates zero from wrong answers');
  check(await scalar(`SELECT bool_and(is_valid AND proficiency=0) FROM student_skill_snapshots WHERE attempt_id='${first.attemptId}'`),true,'formal zero evidence processed atomically');
  check((await submit(first.attemptId,payload(700))).percentage,0,'replayed submission cannot change committed answers');
  await denied(`SELECT fn_start_assessment('${uid(700)}')`,'RPC enforces attempt limit');
  await caller(1);await denied(`UPDATE questions SET correct_answer='wrong' WHERE id='${uid(701)}'`,'answer key locked after attempt');
  await denied(`UPDATE assessments SET is_practice=true WHERE id='${uid(700)}'`,'formal/practice definition locked');
  await makeAssessment(800); const retry=await start(800);
  await db.exec(`RESET ROLE`); const original=await scalar(`SELECT pg_get_functiondef('fn_compute_employability_score(uuid)'::regprocedure)`);
  await db.exec(`CREATE OR REPLACE FUNCTION fn_compute_employability_score(p_student_id UUID) RETURNS JSONB LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected scoring failure'; END $$`);
  await caller(10);await assert.rejects(()=>submit(retry.attemptId,payload(800)));passed++;console.log('PASS scoring failure rejects submission');
  check(await scalar(`SELECT status::text FROM assessment_attempts WHERE id='${retry.attemptId}'`),'IN_PROGRESS','scoring failure rolls back grade');
  check(await scalar(`SELECT count(*) FROM assessment_answers WHERE attempt_id='${retry.attemptId}'`),0,'scoring failure rolls back answers');
  check(await scalar(`SELECT count(*) FROM student_skill_snapshots WHERE attempt_id='${retry.attemptId}'`),0,'scoring failure rolls back snapshots');
  await db.exec('RESET ROLE');await db.exec(original);await caller(10);
  check((await submit(retry.attemptId,payload(800))).percentage,100,'retry after recovery succeeds');
  await makeAssessment(900,true);const practice=await start(900);await submit(practice.attemptId,payload(900));
  check(await scalar(`SELECT count(*) FROM student_skill_snapshots WHERE attempt_id='${practice.attemptId}'`),0,'practice produces no formal snapshots');
  await makeAssessment(1000,false,true); await denied(`SELECT fn_start_assessment('${uid(1000)}')`,'manual-only assessment blocked for pilot');
  await makeAssessment(1100); const expired=await start(1100);
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.role','service_role',false); UPDATE assessment_attempts SET created_at=now()-interval '1 day' WHERE id='${expired.attemptId}'`);await caller(10);
  check(Boolean((await submit(expired.attemptId,payload(1100))).error),true,'server time limit enforced');
  check(await scalar(`SELECT status::text FROM assessment_attempts WHERE id='${expired.attemptId}'`),'SUBMITTED','timeout persists without grading');
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(10)}'`);await caller(10);
  await denied(`SELECT fn_start_assessment('${uid(1100)}')`,'suspended student RPC denied');
  await caller(15);await denied(`SELECT fn_start_assessment('${uid(1100)}')`,'individual without entitlement denied');
  await caller(1);
  await denied("SELECT fn_setup_professional_account('legacy-spoof@example.test','EMPLOYER',NULL,'Wrong company')",'provisioning ignores legacy spoofed profile email');
  await db.exec("SELECT fn_setup_professional_account('u15@example.test','EMPLOYER',NULL,'Confirmed company')");
  check(await scalar(`SELECT role::text FROM profiles WHERE user_id='${uid(15)}'`),'EMPLOYER','provisioning uses confirmed Auth identity');
  await db.exec('RESET ROLE'); await db.exec(security);
  check(await scalar(`SELECT percentage FROM assessment_attempts WHERE id='${retry.attemptId}'`),'100.00','migration rerun preserves grades');
  console.log(`${passed} security and assessment integrity checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());
