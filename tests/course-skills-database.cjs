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

  await db.exec(fs.readFileSync(path.join(dir,'037_content_publishing.sql'),'utf8'));
  await db.exec(`INSERT INTO courses(id,title,category,status) VALUES ('${uid(990)}','Legacy matching',(SELECT name FROM skills WHERE code='COMM'),'ACTIVE'),('${uid(991)}','Legacy unmatched','Unmatched old category','ACTIVE');`);
  const migration=fs.readFileSync(path.join(dir,'038_course_skills.sql'),'utf8');
  await db.exec(migration);await db.exec(migration);
  check(await scalar(`SELECT skill_id=(SELECT id FROM skills WHERE code='COMM') FROM courses WHERE id='${uid(990)}'`),true,'exact skill backfilled; migration is repeatable');
  check(await scalar(`SELECT skill_id IS NULL FROM courses WHERE id='${uid(991)}'`),true,'unknown category remains unassigned');
  check(await scalar(`SELECT status::text FROM courses WHERE id='${uid(990)}'`),'ACTIVE','existing publication preserved');
  await denied(`UPDATE courses SET skill_id='${uid(999)}' WHERE id='${uid(991)}'`,'unknown skill blocked by database');
  await db.exec(`INSERT INTO auth.users(id,email) VALUES('${uid(1)}','admin@example.test'),('${uid(2)}','other@example.test');INSERT INTO profiles(user_id,full_name,email,role) VALUES('${uid(1)}','Admin','admin@example.test','SUPER_ADMIN'),('${uid(2)}','Other','other@example.test','COLLEGE_ADMIN');`);
  await caller(2);
  await db.exec(`UPDATE courses SET skill_id=(SELECT id FROM skills WHERE code='COMM') WHERE id='${uid(991)}'`);
  await owner();
  check(await scalar(`SELECT skill_id IS NULL FROM courses WHERE id='${uid(991)}'`),true,'college admin cannot assign course skills');
  await caller(1);
  await db.exec(`UPDATE courses SET skill_id=(SELECT id FROM skills WHERE code='COMM') WHERE id='${uid(991)}'`);
  check(await scalar(`SELECT skill_id IS NOT NULL FROM courses WHERE id='${uid(991)}'`),true,'super admin can assign existing courses');
  console.log(passed+' course skill database checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.close());
