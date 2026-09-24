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



  await db.exec(fs.readFileSync(path.join(migrationDir,'026_free_programme_access.sql'),'utf8'));
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${uid(1)}','admin@example.test',now()),('${uid(2)}','student@example.test',now());
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
    UPDATE profiles SET role='SUPER_ADMIN' WHERE user_id='${uid(1)}';
    INSERT INTO courses(id,title,category,status) VALUES('${uid(100)}','Test course','Communication','ACTIVE');`);
  await caller(null,'anon');await denied('SELECT fn_activate_free_programme()','anonymous activation denied');
  await caller(uid(2));await db.exec('SELECT fn_register_individual_student()');
  check(await scalar('SELECT fn_has_learning_access()'),false,'no access before activation');
  await db.exec('SELECT fn_activate_free_programme()');
  check(await scalar('SELECT fn_has_learning_access()'),true,'free activation grants learning access');
  check(await scalar('SELECT count(*) FROM enrollments'),1,'course enrolled');
  const expiry=await scalar('SELECT expires_at::text FROM programme_free_access');
  await db.exec('SELECT fn_activate_free_programme()');
  check(await scalar('SELECT expires_at::text FROM programme_free_access'),expiry,'repeat activation preserves expiry');
  await denied(`UPDATE programme_free_access SET expires_at=now()+interval '10 years'`,'student cannot extend grant');
  await db.exec('UPDATE programme_settings SET price_paise=100');
  check(await scalar('SELECT price_paise FROM programme_settings'),0,'student cannot change offer');
  await caller(uid(1));await db.exec('UPDATE programme_settings SET price_paise=50000');
  await caller(uid(2));check(await scalar('SELECT fn_has_learning_access()'),true,'paid offer preserves free grant');
  await denied('SELECT fn_activate_free_programme()','paid offer blocks free activation');
  await db.exec(`RESET ROLE; UPDATE programme_free_access SET activated_at=now()-interval '7 months',expires_at=now()-interval '1 month';`);
  await caller(uid(2));check(await scalar('SELECT fn_has_learning_access()'),false,'expired grant denied');
  await caller(uid(1));await db.exec('UPDATE programme_settings SET price_paise=0');
  await caller(uid(2));await denied('SELECT fn_activate_free_programme()','expired free grant cannot be renewed repeatedly');
  console.log(`${passed} checks passed`);await db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});

