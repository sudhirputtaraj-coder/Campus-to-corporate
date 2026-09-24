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

  await db.exec(fs.readFileSync(path.join(migrationDir,'027_learning_analytics.sql'),'utf8'));
  await db.exec(`INSERT INTO students(id,user_id,college_id,account_type,register_number) VALUES
    ('${uid(310)}','${uid(10)}','${uid(100)}','COLLEGE','A10'),
    ('${uid(311)}','${uid(11)}','${uid(100)}','COLLEGE','A11'),
    ('${uid(312)}','${uid(12)}','${uid(101)}','COLLEGE','B12'),
    ('${uid(313)}','${uid(13)}',NULL,'INDIVIDUAL','I13');
    UPDATE profiles SET role='EMPLOYER' WHERE user_id='${uid(4)}';
    UPDATE profiles SET role='TRAINER' WHERE user_id='${uid(3)}';`);
  await caller(null,'anon');await denied('SELECT fn_learning_analytics()','anonymous analytics denied');
  for(const n of [3,4,10,13]) {await caller(uid(n));await denied('SELECT fn_learning_analytics()',`non-admin role ${n} denied`);}
  await caller(uid(1));
  await db.exec(`INSERT INTO courses(id,title,category,status) VALUES('${uid(500)}','Test course','Communication','ACTIVE');
    INSERT INTO enrollments(student_id,course_id,status,completion_percentage) VALUES('${uid(310)}','${uid(500)}','COMPLETED',100),('${uid(311)}','${uid(500)}','ACTIVE',20),('${uid(312)}','${uid(500)}','ACTIVE',0);`);
  await caller(uid(2));let report=await scalar('SELECT fn_learning_analytics()');
  check(report.total_students,2,'college administrator sees own college only');
  check(report.enrolments,2,'enrolments limited to own college');
  check(report.completed_enrolments,1,'completed enrolments counted');
  check(report.average_progress,60,'progress average includes each scoped enrolment');
  check(report.students_enrolled,2,'enrolled students counted distinctly');
  check(report.scores_available,false,'missing score schema is explicit');
  await denied(`SELECT fn_learning_analytics('${uid(101)}')`,'cross-college filter denied');
  await caller(uid(1));report=await scalar('SELECT fn_learning_analytics()');
  check(report.total_students,4,'platform includes college and individual students');
  check(report.individual_students,1,'individual cohort counted');
  await db.exec(`RESET ROLE;
    CREATE TABLE student_employability_scores(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID,score NUMERIC,is_provisional BOOLEAN,classification_label TEXT,computed_at TIMESTAMPTZ,breakdown JSONB);
    INSERT INTO student_employability_scores(student_id,score,is_provisional,classification_label,computed_at,breakdown) VALUES
    ('${uid(310)}',90,false,'Ready',now()-interval '1 day','[]'),
    ('${uid(310)}',0,false,'Needs improvement',now(),'[{"code":"COMM","name":"Communication","included":true,"gap":70}]'),
    ('${uid(311)}',80,false,'Ready',now()-interval '1 day','[]'),
    ('${uid(311)}',90,true,'Provisional',now(),'[]'),
    ('${uid(312)}',100,false,'Ready',now(),'[]'),
    ('${uid(313)}',60,false,'Near ready',now(),'[]');`);
  await caller(uid(2));report=await scalar('SELECT fn_learning_analytics()');
  check(report.average_score,0,'zero final score included and provisional excluded');
  check(report.students_with_score,1,'only latest final measurement counted');
  check(report.provisional_students,1,'provisional student separate');
  check(report.classification_counts,{'Needs improvement':1},'classification uses latest final result');
  check(report.top_skill_gaps[0].avg_gap,70,'skill gaps use latest final result');
  await caller(uid(1));report=await scalar('SELECT fn_learning_analytics()');
  check(report.average_score,53.33,'platform final average correct');
  await db.exec(`RESET ROLE; INSERT INTO auth.users(id,email,email_confirmed_at) SELECT gen_random_uuid(),'bulk'||n||'@example.test',now() FROM generate_series(1,1100)n;
    INSERT INTO profiles(user_id,full_name,email) SELECT id,'Bulk student',email FROM auth.users WHERE email LIKE 'bulk%';
    INSERT INTO students(user_id,college_id,account_type,register_number) SELECT id,'${uid(100)}','COLLEGE',email FROM auth.users WHERE email LIKE 'bulk%';`);
  await caller(uid(2));check((await scalar('SELECT fn_learning_analytics()')).total_students,1102,'more than 1000 students are counted without truncation');
  await caller(uid(1));
  await db.exec(`RESET ROLE; UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(2)}'`);
  await caller(uid(2));await denied('SELECT fn_learning_analytics()','suspended administrator denied');
  await db.exec(`RESET ROLE; UPDATE colleges SET status='INACTIVE' WHERE id='${uid(100)}'`);
  await caller(uid(1));check((await scalar('SELECT fn_learning_analytics()')).total_students,2,'inactive colleges excluded');
  console.log(`${passed} checks passed`);await db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
