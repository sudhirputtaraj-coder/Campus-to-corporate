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
  for (const file of fs.readdirSync(migrationDir).filter(f => /^(00[1-9]|01[01])_/.test(f)).sort()) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8').replace(/^CREATE EXTENSION.*;$/gm, '');
    await db.exec(sql);
  }
  check(true, true, 'all eleven migrations compile on PostgreSQL');
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
    ('${uid(1)}','individual@example.test',now()),('${uid(2)}','other@example.test',now()),('${uid(3)}','college@example.test',now()),('${uid(4)}','admin@example.test',now());
    INSERT INTO profiles(user_id,full_name,email) SELECT id,email,email FROM auth.users;
    UPDATE profiles SET role='SUPER_ADMIN' WHERE user_id='${uid(4)}';
    INSERT INTO colleges(id,name,code,status) VALUES('${uid(10)}','Test College','TEST','ACTIVE');
    INSERT INTO students(id,user_id,account_type,college_id,register_number) VALUES
      ('${uid(11)}','${uid(1)}','INDIVIDUAL',null,'IND-1'),('${uid(12)}','${uid(2)}','INDIVIDUAL',null,'IND-2'),
      ('${uid(13)}','${uid(3)}','COLLEGE','${uid(10)}','COL-1');
    INSERT INTO courses(id,title,category) VALUES('${uid(20)}','Test Course','Communication');
    INSERT INTO modules(id,course_id,title) VALUES('${uid(21)}','${uid(20)}','Module');
    INSERT INTO lessons(id,module_id,title,content) VALUES('${uid(22)}','${uid(21)}','Lesson','Paid lesson content');
    INSERT INTO assessments(id,course_id,title) VALUES('${uid(23)}','${uid(20)}','Quiz');
    INSERT INTO questions(id,assessment_id,question_text,question_type) VALUES('${uid(24)}','${uid(23)}','Question','MCQ');
    INSERT INTO enrollments(student_id,course_id) SELECT id,'${uid(20)}' FROM students;`);
  await caller(uid(1));
  await db.exec('RESET ROLE');
  await db.exec(`UPDATE modules SET skill_id=(SELECT id FROM skills WHERE code='COMM') WHERE id='${uid(21)}';
    INSERT INTO modules(course_id,title,skill_id) VALUES('${uid(20)}','Grammar',(SELECT id FROM skills WHERE code='COMM'));`);
  check(await scalar(`SELECT count(*) FROM modules m JOIN skills s ON s.id=m.skill_id WHERE s.code='COMM'`), 2, 'multiple modules can belong to one skill');
  await db.exec(`INSERT INTO modules(course_id,title,skill_id,sequence)
    SELECT '${uid(20)}','Additional module ' || n,(SELECT id FROM skills WHERE code='COMM'),n+2 FROM generate_series(1,10) n;
    UPDATE lessons SET resource_url='https://example.test/reading' WHERE id='${uid(22)}';`);
  check(await scalar(`SELECT count(*) FROM modules m JOIN skills s ON s.id=m.skill_id WHERE s.code='COMM'`), 12, 'a skill supports more than ten modules');
  await caller(uid(4));
  const comm = await scalar(`SELECT id FROM skills WHERE code='COMM'`);
  const team = await scalar(`SELECT id FROM skills WHERE code='TEAM'`);
  await db.query('SELECT fn_set_question_skills($1,$2::jsonb)', [uid(24), JSON.stringify([{skill_id:comm,weight:1}])]);
  check(await scalar(`SELECT count(*) FROM question_skills WHERE question_id='${uid(24)}'`),1,'administrator maps a question');
  await denied(`SELECT fn_set_question_skills('${uid(24)}','[{"skill_id":"${comm}","weight":0.5}]')`, 'invalid mapping totals rejected atomically');
  check(Number(await scalar(`SELECT weight FROM question_skills WHERE question_id='${uid(24)}'`)),1,'failed edit preserves old mapping');
  await db.query('SELECT fn_set_question_skills($1,$2::jsonb)', [uid(24), JSON.stringify([{skill_id:comm,weight:0.6},{skill_id:team,weight:0.4}])]);
  check(await scalar(`SELECT count(*) FROM question_skills WHERE question_id='${uid(24)}'`),2,'multi-skill replacement succeeds atomically');
  await caller(uid(1));
  await denied(`SELECT fn_set_question_skills('${uid(24)}','[]')`, 'student cannot change question skill mappings');
  check(await scalar('SELECT fn_has_learning_access()'), false, 'unpaid individual denied');
  check(await scalar('SELECT count(*) FROM lessons'), 0, 'direct lesson SELECT blocked before payment');
  check(await scalar(`SELECT count(*) FROM modules WHERE skill_id IS NOT NULL`), 0, 'skill navigation does not bypass unpaid access');
  check(await scalar('SELECT count(*) FROM questions_public'), 0, 'question view blocked before payment');
  await denied(`SELECT fn_reserve_programme_purchase('${uid(1)}')`, 'browser cannot reserve purchases through service RPC');
  await denied(`SELECT fn_apply_verified_payment('order_test','pay_test',50000,'INR',false)`, 'browser cannot activate purchases');
  await denied(`INSERT INTO lesson_progress(student_id,lesson_id,course_id) VALUES('${uid(11)}','${uid(22)}','${uid(20)}')`, 'direct progress write blocked');
  await denied(`INSERT INTO assessment_attempts(student_id,assessment_id) VALUES('${uid(11)}','${uid(23)}')`, 'unpaid direct assessment start blocked');
  await denied(`SELECT recalc_enrollment_progress('${uid(11)}','${uid(20)}')`, 'progress RPC blocked before payment');
  await caller(null, 'service_role');
  const purchase = await scalar(`SELECT fn_reserve_programme_purchase('${uid(1)}')`);
  const duplicate = await scalar(`SELECT fn_reserve_programme_purchase('${uid(1)}')`);
  check(purchase.id, duplicate.id, 'repeat checkout reuses pending purchase');
  await db.exec(`UPDATE programme_purchases SET provider_order_id='order_test' WHERE id='${purchase.id}'`);
  await db.exec(`DELETE FROM enrollments WHERE student_id='${uid(11)}'`);
  await denied(`SELECT fn_apply_verified_payment('order_test','pay_test',1,'INR',false)`, 'wrong amount rejected');
  await db.exec(`SELECT fn_apply_verified_payment('order_test','pay_test',50000,'INR',false)`);
  check(await scalar(`SELECT count(*) FROM enrollments WHERE student_id='${uid(11)}'`), 1, 'capture creates programme enrolment');
  const first = (await db.query(`SELECT activated_at,expires_at FROM programme_purchases WHERE id='${purchase.id}'`)).rows[0];
  await db.exec(`SELECT fn_apply_verified_payment('order_test','pay_test',50000,'INR',false)`);
  check((await db.query(`SELECT activated_at,expires_at FROM programme_purchases WHERE id='${purchase.id}'`)).rows[0], first, 'duplicate callback preserves activation and expiry');
  check(await scalar(`SELECT expires_at = (((activated_at AT TIME ZONE 'Asia/Kolkata') + interval '6 months') AT TIME ZONE 'Asia/Kolkata') FROM programme_purchases WHERE id='${purchase.id}'`), true, 'six calendar months from activation');
  await caller(uid(1));
  check(await scalar('SELECT fn_has_learning_access()'), true, 'captured payment grants access');
  check(await scalar('SELECT count(*) FROM lessons'), 1, 'paid student reads lesson');
  check(await scalar('SELECT resource_url FROM lessons'), 'https://example.test/reading', 'reading links are available within permitted lessons');
  await caller(null, 'service_role');
  await db.exec(`UPDATE skills SET status='INACTIVE' WHERE code='COMM'`);
  await caller(uid(1));
  check(await scalar('SELECT count(*) FROM lessons'), 0, 'hidden parent skill hides its module content');
  await caller(null, 'service_role');
  await db.exec(`UPDATE skills SET status='ACTIVE' WHERE code='COMM'`);
  await caller(uid(1));
  await caller(null, 'service_role');
  await db.exec(`UPDATE lessons SET status='INACTIVE' WHERE id='${uid(22)}'`);
  await caller(uid(1));
  check(await scalar('SELECT count(*) FROM lessons'), 0, 'hidden lessons cannot be fetched through direct URLs');
  await caller(null, 'service_role');
  await db.exec(`UPDATE lessons SET status='ACTIVE' WHERE id='${uid(22)}'`);
  await caller(uid(1));
  check(await scalar('SELECT count(*) FROM questions_public'), 1, 'paid student reads safe questions');
  await db.exec(`INSERT INTO lesson_progress(student_id,lesson_id,course_id) VALUES('${uid(11)}','${uid(22)}','${uid(20)}');
    INSERT INTO assessment_attempts(id,student_id,assessment_id) VALUES('${uid(30)}','${uid(11)}','${uid(23)}');
    INSERT INTO assessment_answers(attempt_id,question_id) VALUES('${uid(30)}','${uid(24)}');`);
  check(true, true, 'paid student can write progress and assessment answers');
  await caller(uid(4));
  await denied(`SELECT fn_set_question_skills('${uid(24)}','[]')`, 'used assessment mappings are locked even for administrators');
  await denied(`DELETE FROM question_skills WHERE question_id='${uid(24)}'`, 'direct mapping writes cannot bypass historical lock');
  await caller(uid(2));
  check(await scalar('SELECT count(*) FROM programme_purchases'), 0, 'other student cannot read purchase');
  check(await scalar('SELECT fn_has_learning_access()'), false, 'other student cannot use paid access');
  await caller(uid(3));
  check(await scalar('SELECT count(*) FROM lessons'), 1, 'college student access unchanged');
  await caller(null, 'service_role');
  await db.exec(`UPDATE programme_settings SET price_paise=75000,access_months=3,payment_mode='LIVE'`);
  await caller(uid(1));
  check(await scalar('SELECT fn_has_learning_access()'), false, 'test purchase cannot unlock live programme');
  await caller(null, 'service_role');
  await db.exec(`UPDATE programme_settings SET payment_mode='TEST';
    SELECT fn_apply_verified_payment('order_test','pay_test',50000,'INR',true);
    SELECT fn_apply_verified_payment('order_test','pay_test',50000,'INR',false);`);
  check(await scalar(`SELECT status FROM programme_purchases WHERE id='${purchase.id}'`), 'REFUNDED', 'late capture cannot undo refund');
  await caller(uid(1));
  check(await scalar('SELECT count(*) FROM lessons'), 0, 'refund revokes content access');
  check(await scalar('SELECT count(*) FROM assessment_attempts'), 1, 'refund preserves own result history');
  await denied(`UPDATE assessment_attempts SET status='GRADED' WHERE id='${uid(30)}'`, 'refund blocks assessment writes');
  await denied(`UPDATE assessment_answers SET answer_text='changed' WHERE attempt_id='${uid(30)}'`, 'refund blocks answer edits');
  await caller(null, 'service_role');
  await db.exec(`INSERT INTO programme_purchases(student_id,programme_id,price_paise,currency,access_months,status,provider_payment_id,activated_at,expires_at)
    VALUES('${uid(11)}','corporate-readiness',50000,'INR',6,'PAID','pay_expired',now()-interval '6 months',now()-interval '1 second');`);
  await caller(uid(1));
  check(await scalar('SELECT fn_has_learning_access()'), false, 'expired purchase denied');
  check(await scalar('SELECT count(*) FROM questions_public'), 0, 'expired question view denied');
  await denied(`UPDATE lesson_progress SET status='COMPLETED' WHERE student_id='${uid(11)}'`, 'expired lesson updates denied');
  await caller(null, 'service_role');
  await db.exec(`BEGIN;
    INSERT INTO programme_purchases(student_id,programme_id,price_paise,currency,access_months,status,provider_payment_id,activated_at,expires_at)
    VALUES('${uid(11)}','corporate-readiness',50000,'INR',6,'PAID','pay_boundary',now()-interval '6 months',now());`);
  await caller(uid(1));
  check(await scalar('SELECT fn_has_learning_access()'), false, 'exact expiry instant is denied');
  await db.exec('ROLLBACK');
  await caller(null, 'service_role');
  await db.exec(`INSERT INTO programme_purchases(student_id,programme_id,price_paise,currency,access_months,status,provider_payment_id,activated_at,expires_at)
    VALUES('${uid(11)}','corporate-readiness',50000,'INR',6,'PAID','pay_future',now()+interval '1 day',now()+interval '6 months');`);
  await caller(uid(1));
  check(await scalar('SELECT fn_has_learning_access()'), false, 'future purchase does not unlock early');
  await caller(null, 'anon');
  await denied('SELECT * FROM lessons', 'anonymous direct lessons denied');
  await denied(`SELECT recalc_enrollment_progress('${uid(11)}','${uid(20)}')`, 'anonymous progress RPC denied');
  console.log(`${passed} database checks passed`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.close());
