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

  const migration = fs.readFileSync(path.join(migrationDir,'022_whatsapp_preferences.sql'),'utf8');
  await db.exec(migration);
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${uid(1)}','one@example.test',now()),('${uid(2)}','two@example.test',now()),('${uid(3)}','admin@example.test',now());
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
    UPDATE profiles SET role='SUPER_ADMIN' WHERE user_id='${uid(3)}';
    INSERT INTO colleges(id,name,code,status) VALUES('${uid(10)}','Test','TEST','ACTIVE');
    INSERT INTO students(id,user_id,account_type,college_id,register_number) VALUES('${uid(11)}','${uid(1)}','INDIVIDUAL',null,'IND'),('${uid(12)}','${uid(2)}','COLLEGE','${uid(10)}','COL');`);
  const save = `SELECT fn_save_whatsapp_preferences('+919876543210',true,true,true,true)`;
  await caller(null,'anon'); await denied(save,'anonymous preferences rejected');
  await caller(uid(1)); await db.exec(save);
  check(await scalar('SELECT enabled FROM student_whatsapp_preferences'),true,'individual student can opt in without payment');
  check(await scalar('SELECT consent_version FROM student_whatsapp_preferences'),'progress-updates-v1','consent version recorded');
  await denied(`UPDATE student_whatsapp_preferences SET phone='+919999999999'`,'direct writes forbidden');
  await denied(`SELECT fn_save_whatsapp_preferences('9876543210',true,true,true,true)`,'country code required');
  await denied(`SELECT fn_save_whatsapp_preferences('+919876543210',true,false,false,false)`,'empty update selection rejected');
  await caller(uid(2)); check(await scalar('SELECT count(*) FROM student_whatsapp_preferences'),0,'college student cannot read another number');
  await db.exec(save);check(await scalar('SELECT count(*) FROM student_whatsapp_preferences'),1,'college student saves own preferences');
  await caller(uid(3));await denied(save,'admin cannot opt in on behalf of student');
  await caller(uid(1));await db.exec(`SELECT fn_save_whatsapp_preferences(null,false,false,false,false)`);
  check(await scalar('SELECT phone FROM student_whatsapp_preferences'),null,'opt out removes saved phone');
  check(await scalar('SELECT enabled FROM student_whatsapp_preferences'),false,'opt out disables preference');
  await caller(uid(3));await db.exec(`UPDATE profiles SET status='SUSPENDED' WHERE user_id='${uid(1)}'`);
  await caller(uid(1));await denied(save,'suspended student cannot subscribe');
  await db.exec('RESET ROLE');await db.exec(migration);
  check(await scalar('SELECT count(*) FROM student_whatsapp_preferences'),2,'migration rerun preserves preferences');
  console.log(`${passed} WhatsApp database checks passed`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.close());
