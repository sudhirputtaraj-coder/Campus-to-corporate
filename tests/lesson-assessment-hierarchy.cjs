// Real isolated PostgreSQL role/RLS tests. Does not contact hosted Supabase.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const db=new PGlite(),uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const dir=path.join(__dirname,'../supabase/migrations');
const scalar=async sql=>Object.values((await db.query(sql)).rows[0])[0];
const caller=async(n,role='authenticated')=>db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${n?uid(n):''}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
const owner=()=>db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SELECT set_config('request.jwt.claim.role','service_role',false);`);
let passed=0;
function check(actual,expected,name){assert.deepEqual(actual,expected,name);console.log('PASS',name);passed++;}
async function denied(sql,name,pattern){await assert.rejects(()=>db.exec(sql),pattern);console.log('PASS',name);passed++;}




async function main(){
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,raw_user_meta_data JSONB);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;`);
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')&&Number(f.slice(0,3))<=36).sort()) await db.exec(fs.readFileSync(path.join(dir,file),'utf8').replace(/^CREATE EXTENSION.*;$/gm,''));
  await db.exec(fs.readFileSync(path.join(dir,'036_college_student_access.sql'),'utf8'));
  await owner();
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'u'||n||'@example.test',now() FROM generate_series(1,50)n;
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users WHERE id<>'${uid(10)}';
    UPDATE profiles SET role='SUPER_ADMIN' WHERE user_id='${uid(1)}';
    UPDATE profiles SET role='COLLEGE_ADMIN' WHERE user_id IN ('${uid(2)}','${uid(3)}');
    UPDATE profiles SET role='TRAINER' WHERE user_id='${uid(4)}';
    UPDATE auth.users SET email_confirmed_at=NULL WHERE id='${uid(11)}';
    INSERT INTO colleges(id,name,code,status) VALUES('${uid(100)}','College A','A','ACTIVE'),('${uid(101)}','College B','B','ACTIVE');
    INSERT INTO user_college_memberships(user_id,college_id,role) VALUES('${uid(2)}','${uid(100)}','COLLEGE_ADMIN'),('${uid(3)}','${uid(101)}','COLLEGE_ADMIN');
    INSERT INTO departments(id,college_id,name,code) VALUES('${uid(150)}','${uid(100)}','Computing','CS'),('${uid(151)}','${uid(101)}','Computing','CS');
    INSERT INTO batches(id,college_id,department_id,name,academic_year) VALUES('${uid(200)}','${uid(100)}','${uid(150)}','Final year','2026'),('${uid(201)}','${uid(101)}','${uid(151)}','Final year','2026');
    INSERT INTO courses(id,title,category,status) VALUES('${uid(500)}','Communication','Communication','ACTIVE'),('${uid(501)}','Inactive','Communication','INACTIVE');
    INSERT INTO college_courses(college_id,course_id) VALUES('${uid(100)}','${uid(500)}'),('${uid(100)}','${uid(501)}');`);
  await owner();
  await db.exec(`INSERT INTO profiles(user_id,full_name,email) VALUES('${uid(10)}','Learner','u10@example.test');
    INSERT INTO students(id,user_id,college_id,register_number,account_type) VALUES('${uid(310)}','${uid(10)}','${uid(100)}','R10','COLLEGE');
    INSERT INTO enrollments(student_id,course_id,completion_percentage) VALUES('${uid(310)}','${uid(500)}',50);
    INSERT INTO modules(id,course_id,title,status) VALUES('${uid(600)}','${uid(500)}','Existing module','ACTIVE');
    INSERT INTO lessons(id,module_id,title,content,status) VALUES('${uid(601)}','${uid(600)}','Existing lesson','Published lesson','ACTIVE');
    INSERT INTO lesson_progress(student_id,course_id,lesson_id,status) VALUES('${uid(310)}','${uid(500)}','${uid(601)}','COMPLETED');
    INSERT INTO assessments(id,course_id,title,status) VALUES('${uid(700)}','${uid(500)}','Original','ACTIVE');
    INSERT INTO questions(id,assessment_id,question_text,question_type,correct_answer,options,marks,sequence)
      SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${uid(700)}','Question '||n,'MCQ','Yes','["Yes","No"]',1,n FROM generate_series(701,703)n;
    INSERT INTO question_skills(question_id,skill_id,weight) SELECT q.id,s.id,1 FROM questions q CROSS JOIN skills s WHERE q.assessment_id='${uid(700)}' AND s.code='COMM';
    INSERT INTO assessment_attempts(id,student_id,assessment_id,attempt_number,status,percentage) VALUES('${uid(710)}','${uid(310)}','${uid(700)}',1,'GRADED',66.67);`);
  const migration=fs.readFileSync(path.join(dir,'037_content_publishing.sql'),'utf8');await db.exec(migration);await db.exec(migration);

  await db.exec(fs.readFileSync(path.join(dir,'038_course_skills.sql'),'utf8'));
  const migration39=fs.readFileSync(path.join(dir,'039_skill_module_lesson_assessments.sql'),'utf8');
  await db.exec(migration39);await db.exec(migration39);
  check(await scalar(`SELECT percentage::text FROM assessment_attempts WHERE id='${uid(710)}'`),'66.67','history preserved');
  await caller(2);await denied(`SELECT fn_create_skill_module((SELECT id FROM skills WHERE code='COMM'),'New',NULL,1)`,'college admin cannot author modules');
  await caller(1);
  const module=await scalar(`SELECT fn_create_skill_module((SELECT id FROM skills WHERE code='COMM'),'Direct skill module','Description',2)`);
  check(await scalar(`SELECT status::text FROM modules WHERE id='${module}'`),'INACTIVE','new module is draft');
  check(await scalar(`SELECT count(*) FROM enrollments WHERE course_id=(SELECT course_id FROM modules WHERE id='${module}')`),0,'new content never grants new enrolments');
  await db.exec(`UPDATE modules SET skill_id=(SELECT id FROM skills WHERE code='COMM') WHERE id='${uid(600)}';`);
  const copy=await scalar(`SELECT fn_copy_assessment_to_lesson('${uid(700)}','${uid(601)}')`);
  check(await scalar(`SELECT lesson_id::text FROM assessments WHERE id='${copy}'`),uid(601),'existing assessment copied to exact lesson');
  check(await scalar(`SELECT count(*) FROM assessment_attempts WHERE assessment_id='${copy}'`),0,'copies never inherit results');
  await denied(`UPDATE assessments SET lesson_id='${uid(601)}' WHERE id='${uid(700)}'`,'attempted assessment cannot move');
  await db.exec(`INSERT INTO modules(id,course_id,title,status) VALUES('${uid(800)}','${uid(501)}','Other','INACTIVE'); INSERT INTO lessons(id,module_id,title) VALUES('${uid(801)}','${uid(800)}','Other lesson');`);
  await denied(`UPDATE assessments SET lesson_id='${uid(801)}' WHERE id='${copy}'`,'assessment cannot cross access containers');
  await db.exec(`UPDATE assessments SET status='ACTIVE' WHERE id='${copy}';`);
  const copy2=await scalar(`SELECT fn_copy_assessment_draft('${copy}')`);
  check(await scalar(`SELECT lesson_id::text FROM assessments WHERE id='${copy2}'`),uid(601),'assessment revision retains lesson association');
  await caller(10);
  check(await scalar(`SELECT count(*) FROM assessments WHERE id='${copy}'`),1,'enrolled learner sees published lesson assessment');
  await caller(1);await db.exec(`UPDATE lessons SET status='INACTIVE' WHERE id='${uid(601)}'`);
  await caller(10);check(await scalar(`SELECT count(*) FROM assessments WHERE id='${copy}'`),0,'hidden lesson assessment disappears');
  await denied(`SELECT fn_start_assessment('${copy}')`,'direct assessment start cannot bypass hidden lesson');
  await caller(1);await db.exec(`UPDATE lessons SET status='ACTIVE' WHERE id='${uid(601)}'; UPDATE modules SET status='INACTIVE' WHERE id='${uid(600)}';`);
  await caller(10);await denied(`SELECT fn_start_assessment('${copy}')`,'direct assessment start cannot bypass hidden module');
  await caller(1);await db.exec(`UPDATE modules SET status='ACTIVE' WHERE id='${uid(600)}'; UPDATE skills SET status='INACTIVE' WHERE code='COMM';`);
  await caller(10);await denied(`SELECT fn_start_assessment('${copy}')`,'direct assessment start cannot bypass hidden skill');
  await caller(1);await db.exec(`UPDATE skills SET status='ACTIVE' WHERE code='COMM';`);
  await caller(10);check((await scalar(`SELECT fn_start_assessment('${copy}')`)).success,true,'published lesson assessment starts normally');
  console.log(passed+' hierarchy database checks passed');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.close());
