const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: id => { if (!(id in deps)) throw Error(id); return deps[id]; } });
  return exports;
}
const { readinessPercentage } = load('src/lib/professional/readiness.ts');
test('readiness percentage includes unassessed students in denominator', () => {
  assert.equal(readinessPercentage(25, 100), '25.00');
  assert.equal(readinessPercentage(1, 3), '33.33');
  assert.equal(readinessPercentage(0, 20), '0.00');
  assert.equal(readinessPercentage(0, 0), null);
});
for (const kind of ['job', 'apply', 'application']) test(`retired ${kind} action never calls a database RPC`, async () => {
  let calls = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'test' } } }) }, from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: { role: 'EMPLOYER', status: 'ACTIVE' } }) }), rpc: async () => { calls++; } };
  const { professionalAction } = load('src/lib/professional/actions.ts', { zod: require('zod'), '@/lib/supabase/server': { createClient: async () => client }, 'next/cache': { revalidatePath() {} } });
  assert.ok((await professionalAction(kind, new FormData())).error);
  assert.equal(calls, 0);
});
for (const [route, target] of [['student/jobs', '/student/dashboard'], ['student/applications', '/student/dashboard'], ['employer/applications', '/employer/readiness']]) test(`legacy ${route} URL redirects`, () => {
  let destination;
  load(`src/app/${route}/page.tsx`, { 'next/navigation': { redirect: path => { destination = path; } } }).default();
  assert.equal(destination, target);
});
