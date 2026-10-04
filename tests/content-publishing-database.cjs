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
  check(await scalar(`SELECT status::text FROM assessments WHERE id='${uid(700)}'`),'ACTIVE','existing publication preserved');
  check(Number(await scalar(`SELECT percentage FROM assessment_attempts WHERE id='${uid(710)}'`)),66.67,'existing assessment result preserved');
  await caller(null,'anon');await denied(`SELECT fn_copy_assessment_draft('${uid(700)}')`,'anonymous cannot copy assessment');
  await caller(2);await denied(`SELECT fn_copy_assessment_draft('${uid(700)}')`,'college admin cannot copy assessment');
  await caller(10);await denied(`SELECT fn_set_content_visibility('course','${uid(500)}',false)`,'student cannot hide content');
  await caller(1);
  const copy=await scalar(`SELECT fn_copy_assessment_draft('${uid(700)}')`);
  check(await scalar(`SELECT status::text FROM assessments WHERE id='${copy}'`),'INACTIVE','copy starts hidden');
  check(await scalar(`SELECT source_assessment_id::text FROM assessments WHERE id='${copy}'`),uid(700),'copy records source assessment');
  check(await scalar(`SELECT count(*) FROM questions WHERE assessment_id='${copy}'`),3,'all questions copied');
  check(await scalar(`SELECT count(*) FROM question_skills qs JOIN questions q ON q.id=qs.question_id WHERE q.assessment_id='${copy}'`),3,'all skill mappings copied');
  check(await scalar(`SELECT count(*) FROM assessment_attempts WHERE assessment_id='${copy}'`),0,'attempts never copied');
  await db.exec(`UPDATE questions SET question_text='Revised wording' WHERE assessment_id='${copy}'`);
  check(await scalar(`SELECT count(*) FROM questions WHERE assessment_id='${uid(700)}' AND question_text='Revised wording'`),0,'draft editing leaves original intact');
  await caller(10);check(await scalar(`SELECT count(*) FROM assessments WHERE id='${copy}'`),0,'learners cannot query draft assessment by ID');
  await denied(`SELECT fn_start_assessment('${copy}')`,'learners cannot start draft assessment');
  await caller(1);await db.exec(`SELECT fn_set_content_visibility('assessment','${copy}',true)`);
  check(await scalar(`SELECT status::text FROM assessments WHERE id='${copy}'`),'ACTIVE','complete mapped draft publishes');
  await denied(`UPDATE questions SET correct_answer='No' WHERE assessment_id='${copy}'`,'published answer keys require hiding first');
  await db.exec(`SELECT fn_set_content_visibility('assessment','${copy}',false); UPDATE questions SET correct_answer='not-a-choice' WHERE assessment_id='${copy}'`);
  await denied(`SELECT fn_set_content_visibility('assessment','${copy}',true)`,'invalid answer key blocks publication',/choices/);
  await db.exec(`UPDATE questions SET correct_answer='Yes' WHERE assessment_id='${copy}'; DELETE FROM question_skills WHERE question_id IN (SELECT id FROM questions WHERE assessment_id='${copy}')`);
  await denied(`SELECT fn_set_content_visibility('assessment','${copy}',true)`,'formal assessment needs skill mappings',/Map every formal/);
  await db.exec(`UPDATE assessments SET is_practice=true WHERE id='${copy}'; SELECT fn_set_content_visibility('assessment','${copy}',true)`);
  check(await scalar(`SELECT status::text FROM assessments WHERE id='${copy}'`),'ACTIVE','practice can publish without formal skill scoring');
  await denied(`UPDATE questions SET question_text='Rewrite' WHERE assessment_id='${uid(700)}'`,'attempted original remains immutable');
  const empty=await scalar(`INSERT INTO assessments(course_id,title) VALUES('${uid(500)}','Empty draft') RETURNING id`);
  await denied(`SELECT fn_set_content_visibility('assessment','${empty}',true)`,'empty assessment cannot publish');
  await denied(`UPDATE assessments SET status='ACTIVE' WHERE id='${empty}'`,'direct status update also validates publication');
  const newCourse=await scalar(`INSERT INTO courses(title,category) VALUES('New draft course','Pilot') RETURNING id`);
  const newModule=await scalar(`INSERT INTO modules(course_id,title) VALUES('${newCourse}','New module') RETURNING id`);
  const newLesson=await scalar(`INSERT INTO lessons(module_id,title,content) VALUES('${newModule}','New lesson','Draft content') RETURNING id`);
  check(await scalar(`SELECT status::text FROM lessons WHERE id='${newLesson}'`),'INACTIVE','lessons default hidden');
  await caller(10);check(await scalar(`SELECT count(*) FROM lessons WHERE id='${newLesson}'`),0,'direct draft lesson URL has no readable row');
  await caller(1);await denied(`SELECT fn_set_content_visibility('course','${newCourse}',true)`,'course needs published learning sequence');
  await db.exec(`UPDATE modules SET status='ACTIVE' WHERE id='${newModule}'; UPDATE lessons SET status='ACTIVE' WHERE id='${newLesson}'; SELECT fn_set_content_visibility('course','${newCourse}',true)`);
  check(await scalar(`SELECT status::text FROM courses WHERE id='${newCourse}'`),'ACTIVE','course publishes after first ready lesson');
  await db.exec(`UPDATE lessons SET content='Revised text' WHERE id='${uid(601)}'`);
  check(await scalar(`SELECT status::text FROM lesson_progress WHERE lesson_id='${uid(601)}'`),'COMPLETED','lesson edit retains completion');
  check(Number(await scalar(`SELECT completion_percentage FROM enrollments WHERE student_id='${uid(310)}' AND course_id='${uid(500)}'`)),50,'publishing does not overwrite existing enrolment progress');
  await caller(10);const attempt=await scalar(`SELECT fn_start_assessment('${copy}')`);
  await caller(1);await denied(`SELECT fn_set_content_visibility('assessment','${copy}',false)`,'cannot hide assessment during attempt');
  await denied(`SELECT fn_set_content_visibility('course','${uid(500)}',false)`,'cannot hide course during assessment attempt');
  check(!!attempt.attemptId,true,'published copy can be started by enrolled student');
  await owner();const before=await scalar('SELECT count(*) FROM assessments');
  await db.exec(`CREATE FUNCTION fail_copy_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ASSESSMENT_DRAFT_COPY' THEN RAISE EXCEPTION 'Injected copy failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_copy_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_copy_audit()`);
  await caller(1);await denied(`SELECT fn_copy_assessment_draft('${uid(700)}')`,'copy rolls back on audit failure',/Injected copy failure/);
  await owner();check(await scalar('SELECT count(*) FROM assessments'),before,'failed copy leaves no partial assessment');
  console.log(`${passed} content publishing database checks passed.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.close());
