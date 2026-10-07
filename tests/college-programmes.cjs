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
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')&&Number(f.slice(0,3))<=41).sort()) await db.exec(fs.readFileSync(path.join(dir,file),'utf8').replace(/^CREATE EXTENSION.*;$/gm,''));
  await owner();
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'u'||n||'@example.test',now() FROM generate_series(1,12)n;
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
    UPDATE profiles SET role='COLLEGE_ADMIN' WHERE user_id IN ('${uid(2)}','${uid(3)}');
    INSERT INTO colleges(id,name,code,status) VALUES('${uid(100)}','College A','A','ACTIVE'),('${uid(101)}','College B','B','ACTIVE');
    INSERT INTO user_college_memberships(user_id,college_id,role) VALUES('${uid(2)}','${uid(100)}','COLLEGE_ADMIN'),('${uid(3)}','${uid(101)}','COLLEGE_ADMIN');
    INSERT INTO skills(id,name,code,status) VALUES('${uid(400)}','Skill A','TEST_A','ACTIVE'),('${uid(401)}','Skill B','TEST_B','ACTIVE');
    INSERT INTO students(id,user_id,college_id,register_number,account_type) VALUES('${uid(310)}','${uid(10)}','${uid(100)}','R10','COLLEGE');
    INSERT INTO courses(id,title,category,status,skill_id) VALUES('${uid(500)}','Mixed course','Communication','ACTIVE','${uid(400)}');
    INSERT INTO modules(id,course_id,skill_id,title,status) VALUES('${uid(600)}','${uid(500)}','${uid(400)}','A module','ACTIVE'),('${uid(601)}','${uid(500)}','${uid(401)}','B module','ACTIVE');
    INSERT INTO lessons(id,module_id,title,content,status) VALUES('${uid(610)}','${uid(600)}','A lesson','A','ACTIVE'),('${uid(611)}','${uid(601)}','B lesson','B','ACTIVE');
    INSERT INTO assessments(id,course_id,lesson_id,title,status) VALUES('${uid(700)}','${uid(500)}','${uid(610)}','A assessment','INACTIVE'),('${uid(701)}','${uid(500)}','${uid(611)}','B assessment','INACTIVE');
    INSERT INTO questions(id,assessment_id,question_text,question_type,correct_answer,options,marks,sequence) VALUES('${uid(710)}','${uid(700)}','A?','MCQ','Yes','["Yes","No"]',1,1),('${uid(711)}','${uid(701)}','B?','MCQ','Yes','["Yes","No"]',1,1);
    INSERT INTO question_skills(question_id,skill_id,weight) VALUES('${uid(710)}','${uid(400)}',1),('${uid(711)}','${uid(401)}',1);`);
  await db.exec(`UPDATE assessments SET status='ACTIVE',is_practice=true WHERE id IN ('${uid(700)}','${uid(701)}');`);
  const save=(all=false,ids=[400])=>`SELECT fn_set_college_programme('${uid(100)}',${all},ARRAY[${ids.map(n=>`'${uid(n)}'`).join(',')}]::uuid[])`;
  await caller(3); await denied(save(),'other college admin cannot change selection');
  await caller(10); await denied(save(),'student cannot change selection');
  await caller(0,'anon'); await denied(save(),'anonymous cannot change selection');
  await caller(2);
  await denied(`INSERT INTO college_programmes(college_id) VALUES('${uid(100)}')`,'direct settings writes denied');
  await denied(`SELECT fn_sync_college_programme('${uid(100)}')`,'private enrolment helper denied');
  await denied(save(false,[]),'empty programme rejected');
  await denied(save(false,[999]),'invalid skill rejected');
  check((await scalar(save())).skills,1,'admin selects one skill');
  await caller(10);
  check(await scalar(`SELECT count(*) FROM enrollments WHERE student_id='${uid(310)}'`),1,'existing student enrolled automatically');
  check(await scalar(`SELECT count(*) FROM modules WHERE course_id='${uid(500)}'`),1,'mixed course only exposes selected module');
  check(await scalar(`SELECT count(*) FROM lessons WHERE id IN ('${uid(610)}','${uid(611)}')`),1,'unselected lesson hidden');
  check(await scalar(`SELECT count(*) FROM questions_public WHERE assessment_id='${uid(701)}'`),0,'unselected question view hidden');
  await owner(); await db.exec(`UPDATE lessons SET status='INACTIVE' WHERE id='${uid(610)}'`);
  await caller(10); check(await scalar(`SELECT count(*) FROM questions_public WHERE assessment_id='${uid(700)}'`),0,'unpublished lesson questions remain hidden');
  await owner(); await db.exec(`UPDATE lessons SET status='ACTIVE' WHERE id='${uid(610)}'`); await caller(10);
  await denied(`SELECT fn_start_assessment('${uid(701)}')`,'direct start cannot bypass skill selection');
  await denied(`INSERT INTO lesson_progress(student_id,course_id,lesson_id,status) VALUES('${uid(310)}','${uid(500)}','${uid(611)}','COMPLETED')`,'direct progress cannot bypass skill selection');
  await db.exec(`INSERT INTO lesson_progress(student_id,course_id,lesson_id,status) VALUES('${uid(310)}','${uid(500)}','${uid(610)}','COMPLETED')`);
  check((await scalar(`SELECT fn_start_assessment('${uid(700)}')`)).success,true,'selected assessment starts');
  await caller(2); await denied(save(false,[401]),'programme cannot change during assessment');
  await owner(); await db.exec(`UPDATE assessment_attempts SET status='GRADED',percentage=100 WHERE student_id='${uid(310)}'`);
  await caller(2); await scalar(save(false,[401]));
  await caller(10); check(await scalar(`SELECT count(*) FROM lessons WHERE id='${uid(610)}'`),0,'deselection removes lesson access');
  await owner(); check(await scalar(`SELECT count(*) FROM lesson_progress WHERE student_id='${uid(310)}'`),1,'deselection preserves progress');
  check(await scalar(`SELECT count(*) FROM assessment_attempts WHERE student_id='${uid(310)}' AND percentage=100`),1,'deselection preserves results');
  await caller(2); await scalar(save(true,[]));
  await owner();
  await db.exec(`INSERT INTO skills(id,name,code,status) VALUES('${uid(402)}','Later skill','TEST_LATER','ACTIVE');
    INSERT INTO courses(id,title,category,status,skill_id) VALUES('${uid(501)}','Later course','Communication','ACTIVE','${uid(402)}'),('${uid(502)}','New A course','Communication','ACTIVE','${uid(400)}');
    INSERT INTO modules(id,course_id,skill_id,title,status) VALUES('${uid(602)}','${uid(501)}','${uid(402)}','Later module','ACTIVE'),('${uid(603)}','${uid(502)}','${uid(400)}','New A module','ACTIVE');`);
  check(await scalar(`SELECT count(*) FROM college_programme_skills WHERE college_id='${uid(100)}' AND skill_id='${uid(402)}'`),0,'select all is a snapshot excluding later skills');
  check(await scalar(`SELECT count(*) FROM enrollments WHERE student_id='${uid(310)}' AND course_id='${uid(501)}'`),0,'later skill does not auto-enrol');
  check(await scalar(`SELECT count(*) FROM enrollments WHERE student_id='${uid(310)}' AND course_id='${uid(502)}'`),1,'new content under selected skill auto-enrols');
  await db.exec(`INSERT INTO students(id,user_id,college_id,register_number,account_type) VALUES('${uid(311)}','${uid(11)}','${uid(100)}','R11','COLLEGE')`);
  check(await scalar(`SELECT count(*) FROM enrollments WHERE student_id='${uid(311)}' AND course_id IN ('${uid(500)}','${uid(501)}','${uid(502)}')`),2,'future student receives selected programme');
  await caller(10); check(await scalar(`SELECT count(*) FROM skills WHERE id='${uid(402)}'`),0,'later skill hidden from college learner');
  await caller(2); await scalar(save(false,[400,402]));
  await caller(10); check(await scalar(`SELECT count(*) FROM courses WHERE id='${uid(501)}'`),1,'explicit selection grants later skill');
  await owner(); await db.exec(fs.readFileSync(path.join(dir,'041_college_programmes.sql'),'utf8'));
  check(await scalar(`SELECT count(*) FROM college_programme_skills WHERE college_id='${uid(100)}'`),2,'rerunning migration preserves choices');
  console.log(passed+' programme database checks passed');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.close());
