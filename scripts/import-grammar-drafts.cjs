// Run from the repository root. Dry-run by default; --apply inserts missing drafts.
// Existing content is compared and preserved, never updated or published.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
require('@next/env').loadEnvConfig(root);
const data = JSON.parse(fs.readFileSync(path.join(root, 'content-workspace/grammar/grammar-drafts.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
async function request(table, query, rows) {
  const url = new URL('/rest/v1/' + table, base);
  for (const [name, value] of Object.entries(query || {})) url.searchParams.set(name, value);
  const response = await fetch(url, { method: rows ? 'POST' : 'GET', headers: { ...headers, Prefer: 'return=representation' }, ...(rows ? { body: JSON.stringify(rows) } : {}) });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status}. Import stopped; any inserted rows remain hidden drafts. Check schema and retry after resolving the error.`);
  return response.json();
}
function compare(existing, desired) {
  for (const row of existing) {
    const expected = desired.find(item => item.id === row.id);
    if (!expected) throw new Error('Unexpected existing content in this import. Review manually.');
    for (const [field, value] of Object.entries(expected)) assert.deepEqual(row[field], value, `Existing ${row.id} differs at ${field}; refusing to overwrite edits.`);
  }
}
async function main() {
  if (!key || !base) throw new Error('Supabase service configuration is required.');
  assert.equal(data.modules.length, 4);
  assert.equal(data.lessons.length, 37);
  assert.equal(data.lessons.reduce((n, l) => n + l.practice_questions.length, 0), 426);
  for (const row of [data.course, ...data.modules, ...data.lessons]) assert.equal(row.status, 'INACTIVE');
  for (const row of data.lessons) {
    assert.ok(row.content.length <= 100000);
    assert.ok(data.modules.some(m => m.id === row.module_id));
    assert.ok(row.practice_questions.length <= 50);
    for (const q of row.practice_questions) assert.ok(q.question.length > 0 && q.question.length <= 1000 && q.answer.length > 0 && q.answer.length <= 5000);
  }
  const skills = await request('skills', { select: 'id,name', code: 'eq.' + data.skill_code });
  if (skills.length !== 1) throw new Error('Expected one existing COMM skill. No content was imported.');
  const skill = skills[0];
  const course = { ...data.course, skill_id: skill.id, category: skill.name };
  const modules = data.modules.map(m => ({ ...m, skill_id: skill.id }));
  const sameTitle = await request('courses', { select: 'id', title: 'eq.' + course.title });
  if (sameTitle.some(c => c.id !== course.id)) throw new Error('Another English Grammar course already exists. Review it before importing.');
  const batches = [
    ['courses', [course], { id: 'eq.' + course.id }],
    ['modules', modules, { course_id: 'eq.' + course.id }],
    ['lessons', data.lessons, { module_id: 'in.(' + modules.map(m => m.id).join(',') + ')' }],
  ];
  const pending = [];
  for (const [table, rows, query] of batches) {
    const existing = await request(table, { select: '*', ...query });
    compare(existing, rows);
    const missing = rows.filter(r => !existing.some(e => e.id === r.id));
    pending.push([table, missing]);
    console.log(`${table}: ${existing.length} verified existing drafts, ${missing.length} to add`);
  }
  console.log(`Destination skill: ${skill.name}. Course: ${course.title}. All content remains hidden.`);
  if (!apply) { console.log('Dry-run passed. Use --apply to import.'); return; }
  for (const [table, rows] of pending) if (rows.length) await request(table, {}, rows);
  for (const [table, rows, query] of batches) {
    const stored = await request(table, { select: '*', ...query });
    assert.equal(stored.length, rows.length, table + ' count');
    compare(stored, rows);
  }
  console.log('Verified imported drafts: 1 course, 4 modules, 37 lessons, 426 practice questions. No enrolments, assessments or publication states changed.');
  console.log('Review: /admin/courses/' + course.id);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
