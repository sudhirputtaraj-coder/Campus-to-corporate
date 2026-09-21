const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(options = {}) {
  const writes = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    from(table) {
      const q = {};
      for (const method of ['select', 'eq', 'single', 'maybeSingle']) q[method] = () => q;
      for (const method of ['insert', 'update']) q[method] = data => { writes.push({ table, data }); return q; };
      q.then = (resolve, reject) => Promise.resolve({ error: null, data: table === 'profiles'
        ? { role: options.role || 'SUPER_ADMIN', status: options.status || 'ACTIVE' }
        : (table === 'skills' && options.missingSkill) || (table === 'modules' && options.missingModule) ? null : { id: 'row' } }).then(resolve, reject);
      return q;
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/learning/admin-actions.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, console, require(id) {
    if (id === '@/lib/supabase/server') return { createClient: async () => client };
    if (id === 'next/cache') return { revalidatePath() {} };
    throw new Error(id);
  } });
  return { actions: exports, writes };
}
const form = (values = {}) => ({ get: name => ({ title: 'Email Writing', skill_id: 'communication', sequence: '1', ...values })[name] ?? null });
test('only active Super Admin can create or assign skill modules', async () => {
  for (const options of [{ role: 'STUDENT' }, { role: 'COLLEGE_ADMIN' }, { status: 'SUSPENDED' }]) {
    const f = fixture(options);
    assert.ok((await f.actions.createModule('course', form())).error);
    assert.ok((await f.actions.assignModuleSkill('module', 'course', form())).error);
    assert.equal(f.writes.length, 0);
  }
});
test('new module saves its skill and course without changing scores', async () => {
  const f = fixture();
  assert.ok((await f.actions.createModule('course', form())).success);
  assert.equal(f.writes[0].data.skill_id, 'communication');
  assert.equal(f.writes[0].data.course_id, 'course');
  assert.ok(f.writes.every(w => ['modules', 'audit_logs'].includes(w.table)));
});
test('invalid skill cannot be assigned', async () => {
  const f = fixture({ missingSkill: true });
  assert.ok((await f.actions.createModule('course', form())).error);
  assert.ok((await f.actions.assignModuleSkill('module', 'course', form())).error);
  assert.equal(f.writes.length, 0);
});
test('existing module can be linked or unlinked without deleting content', async () => {
  const f = fixture();
  assert.ok((await f.actions.assignModuleSkill('module', 'course', form())).success);
  assert.ok((await f.actions.assignModuleSkill('module', 'course', form({ skill_id: '' }))).success);
  assert.equal(f.writes[0].data.skill_id, 'communication');
  assert.equal(f.writes[1].data.skill_id, null);
  assert.ok(f.writes.every(w => w.table === 'modules'));
});
test('video links must be HTTPS and the lesson must belong to the selected course', async () => {
  for (const video_url of ['javascript:alert(1)', 'http://example.test/video', 'not a URL']) {
    const f = fixture();
    assert.ok((await f.actions.createLesson('module', 'course', form({ video_url }))).error);
    assert.equal(f.writes.length, 0);
  }
  const missing = fixture({ missingModule: true });
  assert.ok((await missing.actions.createLesson('module', 'course', form())).error);
  assert.equal(missing.writes.length, 0);
  const f = fixture();
  assert.ok((await f.actions.createLesson('module', 'course', form({ video_url: 'https://example.test/embed/video', content: 'Lesson content' }))).success);
  assert.equal(f.writes[0].data.content, 'Lesson content');
});
