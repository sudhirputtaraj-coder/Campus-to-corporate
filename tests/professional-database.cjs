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
  const setup=(n,kind,college=100)=>`SELECT fn_setup_professional_account('user${n}@example.test','${kind}','${uid(college)}','Company ${n}')`;
  await caller(uid(2));await denied(setup(3,'TRAINER'),'college admin cannot promote accounts');
  await caller(null,'anon');await denied(setup(3,'TRAINER'),'anonymous cannot promote accounts');
  await caller(uid(1));await db.exec(setup(3,'TRAINER'));await db.exec(setup(4,'EMPLOYER'));await db.exec(setup(5,'EMPLOYER'));
  check(await scalar(`SELECT role FROM profiles WHERE user_id='${uid(4)}'`),'EMPLOYER','approved employer receives role');
  await denied(setup(1,'TRAINER'),'superadmin role cannot be overwritten');
  await denied(setup(3,'TRAINER',101),'trainer transfer rejected');
  await db.exec(`INSERT INTO students(id,user_id,college_id,account_type,register_number,batch_id) VALUES
    ('${uid(310)}','${uid(10)}','${uid(100)}','COLLEGE','A-10','${uid(200)}'),
    ('${uid(311)}','${uid(11)}','${uid(100)}','COLLEGE','A-11','${uid(200)}'),
    ('${uid(312)}','${uid(12)}','${uid(101)}','COLLEGE','B-12','${uid(201)}'),
    ('${uid(313)}','${uid(13)}','${uid(101)}','COLLEGE','B-13','${uid(201)}');`);
  await denied(setup(10,'EMPLOYER'),'existing college student cannot be silently converted');
  const trainer=await scalar(`SELECT id FROM trainers WHERE user_id='${uid(3)}'`);
  const assign=(batch,active=true)=>`SELECT fn_assign_trainer_batch('${trainer}','${uid(batch)}',${active})`;
  await caller(uid(2));await denied(assign(201),'cross-college batch rejected');await db.exec(assign(200));
  await caller(uid(3));check(await scalar(`SELECT is_trainer_of_batch('${uid(200)}')`),true,'trainer sees assigned batch');
  const progress=await scalar(`SELECT fn_trainer_batch_progress('${uid(200)}',1)`);check(progress.total,2,'batch progress counts only assigned college students');
  check(progress.students.some(s=>s.id===uid(312)),false,'other-college learner excluded');
  await denied(`SELECT fn_trainer_batch_progress('${uid(201)}',1)`,'unassigned batch progress denied');
  await denied(`UPDATE trainers SET college_id='${uid(101)}' WHERE id='${trainer}'`,'trainer cannot change own college directly');
  await denied(assign(201),'trainer cannot self-assign');
  await caller(uid(2));await db.exec(assign(200,false));
  await caller(uid(3));await denied(`SELECT fn_trainer_batch_progress('${uid(200)}',1)`,'revoked assignment immediately blocks progress');
  await caller(uid(2));await db.exec(assign(200));
  await caller(uid(1));await db.exec(`UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(3)}'`);
  await caller(uid(3));check(await scalar(`SELECT is_trainer_of_batch('${uid(200)}')`),false,'suspended trainer excluded by RLS helper');
  await caller(uid(4));
  check((await scalar('SELECT fn_employer_college_readiness(70)')).available,false,'missing Phase3 schema is explicit, not zero scores');
  const makeJob=(status='DRAFT',id='NULL')=>`SELECT fn_save_employer_job(${id},'Graduate Analyst','Bengaluru','Excel and written communication required. Apply through your placement office.',70,'${status}')`;
  const job=await scalar(makeJob());
  await caller(uid(5));check(await scalar(`SELECT count(*) FROM employer_jobs WHERE id='${job}'`),0,'another employer cannot read job');
  await denied(makeJob('CLOSED',`'${job}'`),'another employer cannot edit job');
  await denied('SELECT fn_trainer_batch_progress(\''+uid(200)+'\')','employer cannot read trainer student progress');
  check(await scalar('SELECT count(*) FROM students'),0,'employer has no student directory access');
  await caller(uid(10));check((await scalar('SELECT fn_student_job_posts()')).total,0,'students cannot read draft jobs');
  await caller(uid(4));await db.exec(makeJob('PUBLISHED',`'${job}'`));
  await caller(uid(10));check((await scalar('SELECT fn_student_job_posts()')).total,1,'published job visible to active students');
  await denied(makeJob(),'student cannot publish jobs');
  await caller(uid(4));await db.exec(makeJob('CLOSED',`'${job}'`));
  await caller(uid(10));check((await scalar('SELECT fn_student_job_posts()')).total,0,'closed job removed from opportunities');
  await caller(uid(4));await denied("SELECT fn_save_employer_job(NULL,'Role','City','Long enough requirement text', 'NaN'::numeric,'PUBLISHED')",'NaN score threshold rejected');
  await db.exec('RESET ROLE');
  // Minimal fixture matching the fields consumed by the existing Phase3 service, NOT a production migration.
  await db.exec(`CREATE TABLE student_employability_scores(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID,score NUMERIC,is_provisional BOOLEAN,computed_at TIMESTAMPTZ);
    INSERT INTO student_employability_scores(student_id,score,is_provisional,computed_at) VALUES
    ('${uid(310)}',90,false,now()-interval '1 day'),('${uid(310)}',95,true,now()),
    ('${uid(311)}',80,false,now()),('${uid(312)}',0,false,now());`);
  await caller(uid(4));const report=await scalar('SELECT fn_employer_college_readiness(70)');
  check(report.available,true,'installed scoring schema supports readiness');
  const a=report.colleges.find(c=>c.id===uid(100));const b=report.colleges.find(c=>c.id===uid(101));
  check(a.qualifying_students,1,'latest provisional score excluded despite old valid score');
  check(b.measured_students,1,'valid zero counts as measured');
  check(b.qualifying_students,0,'valid zero does not meet 70 percent threshold');
  check(a.active_students,2,'active college total distinguishes unmeasured students');
  check(Object.keys(a).sort(),['active_students','code','id','latest_measurement','measured_students','name','qualifying_students'],'readiness contains only college aggregates');
  check((await scalar('SELECT fn_employer_college_readiness(0)')).colleges.find(c=>c.id===uid(101)).qualifying_students,1,'zero qualifies when threshold is zero');
  await caller(uid(10));await denied('SELECT fn_employer_college_readiness(70)','student cannot invoke employer reports');
  await caller(uid(1));await db.exec(`UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(4)}'`);
  await caller(uid(4));await denied(makeJob(),'suspended employer cannot publish');await denied('SELECT fn_employer_college_readiness(70)','suspended employer cannot view readiness');
  await db.exec('RESET ROLE');
  for(const name of ['024_professional_access.sql','025_employer_jobs.sql'])await db.exec(fs.readFileSync(path.join(migrationDir,name),'utf8'));
  check(await scalar('SELECT count(*) FROM employer_jobs'),1,'rerunning migrations preserves jobs');
  console.log(`${passed} professional access database checks passed`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.close());
