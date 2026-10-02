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
const report=async(args='')=>scalar(`SELECT fn_college_performance(${args})`);
async function main(){
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,raw_user_meta_data JSONB);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;`);
  for(const file of fs.readdirSync(dir).filter(f=>/^(00[1-9]|01[0-7]|02[3-8])_/.test(f)).sort())await db.exec(fs.readFileSync(path.join(dir,file),'utf8').replace(/^CREATE EXTENSION.*;$/gm,''));
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
  await caller(null,'anon');await denied('SELECT fn_college_performance()','anonymous denied');
  for(const n of [4,5,10]){await caller(n);await denied('SELECT fn_college_performance()',`role ${n} denied`);}
  await caller(2);let r=await report();
  check([r.total,r.measured,r.provisional,r.unmeasured,r.ready,r.average],[4,2,1,1,1,45],'zero scores, no evidence and provisional counted separately');
  check(r.benchmark,85,'default uses configured Placement Ready threshold');
  check(r.support,3,'completed courses with weak scores still need support');
  check(r.students.some(s=>s.id===uid(314)),false,'other college identity never exposed');
  check(r.groups.find(g=>g.kind==='batch'&&g.id===uid(200)).total,3,'batch total includes provisional student');
  check(r.groups.some(g=>g.kind==='department'&&g.id===null&&g.total===1),true,'unassigned students retained');
  check([r.courses[0].assessed,r.courses[0].average,r.courses[0].pass_rate],[2,40,50],'course uses latest formal attempt and includes zero marks');
  check((await report(`p_minimum=>0`)).ready,2,'zero benchmark includes final zero but not provisional');
  check((await report(`p_view=>'ready'`)).matching,1,'ready list matches numerator');
  check((await report(`p_view=>'support'`)).matching,3,'support list matches support total');
  check((await report(`p_view=>'unmeasured'`)).matching,1,'no-measurement filter excludes provisional');
  check((await report(`p_department_id=>'${uid(150)}',p_batch_id=>'${uid(200)}',p_course_id=>'${uid(500)}'`)).total,2,'combined filters intersect');
  check((await report(`p_batch_id=>'${uid(201)}'`)).total,0,'foreign batch returns no data');
  await denied(`SELECT fn_college_performance(p_college_id=>'${uid(101)}')`,'explicit foreign college denied');
  check((await report(`p_from=>'2026-10-01'`)).measured,0,'old scores excluded by start date');
  check((await report(`p_to=>'2026-09-01'`)).measured,3,'as-of report uses measurement before provisional result');
  check((await report(`p_query=>'A10'`)).matching,1,'register-number search');
  check((await report(`p_query=>'%'`)).matching,0,'search treats SQL wildcard literally');
  for(const args of ["p_from=>'2026-10-01',p_to=>'2026-09-01'","p_minimum=>101","p_view=>'bad'","p_page=>0"])await denied(`SELECT fn_college_performance(${args})`,'invalid filter rejected '+args);
  await caller(3);check((await report()).students.map(s=>s.register_number),['B14'],'second college sees only own student');
  check(await scalar(`SELECT count(*) FROM student_employability_scores WHERE student_id='${uid(310)}'`),0,'student detail score history protected by RLS');
  check(await scalar(`SELECT count(*) FROM assessment_attempts WHERE student_id='${uid(310)}'`),0,'student assessment detail protected by RLS');
  await caller(1);check((await report()).total,5,'superadmin college report excludes independent students');
  await db.exec(`RESET ROLE; UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(2)}'`);await caller(2);await denied('SELECT fn_college_performance()','suspended admin denied');
  await db.exec(`RESET ROLE; UPDATE user_college_memberships SET status='INACTIVE' WHERE user_id='${uid(3)}'`);await caller(3);check((await report()).total,0,'removed membership denies data');
  await db.exec(`RESET ROLE; INSERT INTO auth.users(id,email,email_confirmed_at) SELECT gen_random_uuid(),'bulk'||n||'@example.test',now() FROM generate_series(1,1001)n;
    INSERT INTO profiles(user_id,full_name,email) SELECT id,'Bulk',email FROM auth.users WHERE email LIKE 'bulk%';
    INSERT INTO students(user_id,college_id,account_type,register_number) SELECT id,'${uid(100)}','COLLEGE',email FROM auth.users WHERE email LIKE 'bulk%';`);
  await caller(1);r=await report();check(r.total,1006,'aggregate exceeds API row limit');check(r.students.length,25,'identity list paginated');
  check((await report('p_page=>41')).students.length,6,'last page retains remaining students');
  console.log(`${passed} checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());
