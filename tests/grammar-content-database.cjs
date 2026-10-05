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
  await db.exec(fs.readFileSync(path.join(dir,'038_course_skills.sql'),'utf8'));
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../content-workspace/grammar/grammar-drafts.json'),'utf8'));
  const skill=await scalar("SELECT id FROM skills WHERE code='COMM'");
  const batches=[['courses',[{...data.course,skill_id:skill,category:'Communication'}]],['modules',data.modules.map(m=>({...m,skill_id:skill}))],['lessons',data.lessons]];
  for(const [table,rows] of batches)for(const row of rows){const keys=Object.keys(row);await db.query('INSERT INTO '+table+' ('+keys.join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',keys.map(k=>k==='practice_questions'?JSON.stringify(row[k]):row[k]));}
  check(await scalar(`SELECT count(*) FROM modules WHERE course_id='${data.course.id}'`),4,'four distinct topic modules');
  check(await scalar(`SELECT count(*) FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id='${data.course.id}')`),37,'all 37 lessons inserted');
  check(Number(await scalar(`SELECT sum(jsonb_array_length(practice_questions)) FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id='${data.course.id}')`)),426,'all 426 questions and answer explanations inserted');
  for(const [table,rows] of batches)for(const row of rows){const stored=(await db.query('SELECT * FROM '+table+' WHERE id=$1',[row.id])).rows[0];for(const key of Object.keys(row))assert.deepEqual(stored[key],row[key],table+' '+key);}
  console.log('PASS all stored lesson text, practice answers and ordering match import');
  await caller(null,'anon');
  check(await scalar(`SELECT count(*) FROM courses WHERE id='${data.course.id}'`),0,'anonymous cannot read draft course');
  await denied('SELECT * FROM lessons','anonymous cannot read lessons',/permission denied/);
  await owner();
  await db.exec(`INSERT INTO auth.users(id,email) VALUES('${uid(90)}','learner@example.test'); INSERT INTO profiles(user_id,full_name,email) VALUES('${uid(90)}','Learner','learner@example.test');`);
  await caller(90);
  check(await scalar(`SELECT count(*) FROM lessons WHERE id IN (${data.lessons.map(l=>"'"+l.id+"'").join(',')})`),0,'authenticated learner cannot read any imported draft lesson');
  console.log(passed+' grammar database checks passed');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.close());
