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
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'u'||n||'@example.test',now() FROM generate_series(1,8)n;
  INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
  INSERT INTO students(id,user_id,account_type,register_number) SELECT ('00000000-0000-4000-8000-'||lpad((n+300)::text,12,'0'))::uuid,('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'INDIVIDUAL','TEST'||n FROM generate_series(1,8)n;
  INSERT INTO programme_free_access(student_id,activated_at,expires_at,access_months) VALUES
  ('${uid(301)}',now()-interval '1 day',now()+interval '1 month',1),
  ('${uid(302)}',now()-interval '2 months',now()-interval '1 month',1),
  ('${uid(304)}',now()-interval '1 day',now()+interval '1 month',1),
  ('${uid(305)}',now()-interval '1 day',now()+interval '1 month',1);
  UPDATE students SET status='INACTIVE' WHERE id='${uid(304)}';
  UPDATE profiles SET status='INACTIVE' WHERE user_id='${uid(5)}';
  INSERT INTO colleges(id,name,code,status) VALUES('${uid(100)}','College A','TEST_A','ACTIVE');
  UPDATE students SET account_type='COLLEGE',college_id='${uid(100)}' WHERE id='${uid(308)}';
  INSERT INTO skills(id,name,code,status) VALUES('${uid(400)}','Selected skill','SYNC_A','ACTIVE'),('${uid(401)}','Unselected skill','SYNC_B','ACTIVE');
  INSERT INTO college_programmes(college_id) VALUES('${uid(100)}');
  INSERT INTO college_programme_skills(college_id,skill_id) VALUES('${uid(100)}','${uid(400)}');
  INSERT INTO courses(id,title,category,status,skill_id) VALUES('${uid(500)}','New grammar','Communication','ACTIVE','${uid(400)}'),('${uid(501)}','Draft course','Communication','INACTIVE','${uid(400)}');
  INSERT INTO modules(id,course_id,skill_id,title,status) VALUES('${uid(600)}','${uid(500)}','${uid(400)}','Parts of Speech','ACTIVE'),('${uid(601)}','${uid(501)}','${uid(400)}','Later module','INACTIVE');
  INSERT INTO lessons(id,module_id,title,content,status) VALUES('${uid(610)}','${uid(600)}','Published lesson',repeat('Expanded content ',2200),'ACTIVE'),('${uid(611)}','${uid(600)}','Draft lesson','Hidden','INACTIVE'),('${uid(612)}','${uid(601)}','Later lesson','Later','INACTIVE');`);
  const migration=fs.readFileSync(path.join(dir,'042_published_programme_content.sql'),'utf8');
  await db.exec(migration);
  const enrolled=async(n,c=500)=>scalar(`SELECT count(*) FROM enrollments WHERE student_id='${uid(n)}' AND course_id='${uid(c)}'`);
  check(await enrolled(301),1,'migration repairs existing active individual access');
  for(const n of [302,303,304,305])check(await enrolled(n),0,'no access for expired, unpaid or inactive student '+n);
  check(await enrolled(301,501),0,'draft course not enrolled');
  check(await enrolled(308),1,'configured college includes selected skill');
  await caller(1);
  check(await scalar(`SELECT length(content) FROM lessons WHERE id='${uid(610)}'`),37400,'individual reads entire expanded content');
  check(await scalar(`SELECT count(*) FROM lessons WHERE id='${uid(611)}'`),0,'individual cannot read draft lesson');
  await denied(`SELECT fn_sync_individual_programme('${uid(303)}')`,'browser cannot grant another student access');
  await caller(8);
  check(await scalar(`SELECT length(content) FROM lessons WHERE id='${uid(610)}'`),37400,'college student reads same full content');
  check(await scalar(`SELECT count(*) FROM lessons WHERE id='${uid(611)}'`),0,'college student cannot read draft lesson');
  await owner();
  await db.exec(`UPDATE modules SET status='ACTIVE' WHERE id='${uid(601)}'; UPDATE lessons SET status='ACTIVE' WHERE id='${uid(612)}';`);
  check(await enrolled(301,501),1,'publishing lesson activates container and syncs individual access');
  check(await enrolled(308,501),1,'publishing also syncs selected college access');
  await db.exec(`INSERT INTO courses(id,title,category,status,skill_id) VALUES('${uid(502)}','Other skill','Communication','ACTIVE','${uid(401)}');
  INSERT INTO modules(id,course_id,skill_id,title,status) VALUES('${uid(602)}','${uid(502)}','${uid(401)}','Other module','ACTIVE');`);
  check(await enrolled(308,502),0,'college unselected skill stays excluded');
  await db.exec(`UPDATE programme_free_access SET expires_at=now()+interval '1 month' WHERE student_id='${uid(302)}'`);
  check(await enrolled(302,501),1,'renewal receives content published during expiry');
  await db.exec(`UPDATE students SET status='ACTIVE' WHERE id='${uid(304)}'; UPDATE profiles SET status='ACTIVE' WHERE user_id='${uid(5)}'`);
  check(await enrolled(304,501),1,'reactivated student receives published material');
  check(await enrolled(305,501),1,'reactivated profile receives published material');
  await db.exec(`INSERT INTO programme_purchases(student_id,programme_id,price_paise,currency,access_months,payment_mode,status,provider_payment_id,activated_at,expires_at) VALUES('${uid(306)}','corporate-readiness',100,'INR',1,'TEST','PAID','test-paid-306',now(),now()+interval '1 month'),('${uid(307)}','corporate-readiness',100,'INR',1,'LIVE','PAID','test-paid-307',now(),now()+interval '1 month')`);
  check(await enrolled(306,501),1,'valid paid access receives published content');
  check(await enrolled(307,501),0,'wrong payment environment does not grant access');
  await db.exec(`UPDATE enrollments SET status='COMPLETED',completion_percentage=100 WHERE student_id='${uid(301)}' AND course_id='${uid(500)}'`);
  await db.exec(migration);
  check(await enrolled(301),1,'rerun does not duplicate enrolments');
  check(await scalar(`SELECT completion_percentage::int FROM enrollments WHERE student_id='${uid(301)}' AND course_id='${uid(500)}'`),100,'rerun preserves progress');
  console.log(passed+' publishing sync checks passed');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.close());
