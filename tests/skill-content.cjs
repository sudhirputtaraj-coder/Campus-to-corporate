const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, require(id) {
    if (!(id in dependencies)) throw new Error(id); return dependencies[id];
  } });
  return exports;
}
const validation = load('src/lib/skills/content-validation.ts');
const form = (extra = {}) => ({ get: key => ({ title: 'Grammar', status: 'ACTIVE', sequence: '1', duration_minutes: '5', ...extra })[key] ?? null });
test('all content accepts published and hidden states', () => {
  for (const kind of ['skill', 'module', 'lesson']) for (const status of ['ACTIVE', 'INACTIVE']) {
    assert.equal(validation.parseContent(form({ status }), kind).values.status, status);
  }
});
test('blank titles, invalid status and invalid sequence are rejected', () => {
  for (const values of [{ title: ' ' }, { status: 'unknown' }, { sequence: '-1' }, { sequence: '1.2' }]) {
    assert.ok(validation.parseContent(form(values), 'module').error);
  }
});
test('links reject scripts, embedded credentials and non-HTTPS URLs', () => {
  for (const url of ['javascript:alert(1)', 'http://example.test', 'https://user:pass@example.test', 'invalid']) {
    for (const field of ['video_url', 'resource_url']) assert.ok(validation.parseContent(form({ [field]: url }), 'lesson').error);
  }
  const result = validation.parseContent(form({ resource_url: 'https://example.test/reading', video_url: 'https://example.test/embed', content: 'Text' }), 'lesson');
  assert.equal(result.values.resource_url, 'https://example.test/reading');
  assert.equal(result.values.content, 'Text');
});
function fixture(options = {}) {
  const writes = [], filters = [];
  const client = { auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'admin' } }, error: null }) },
    from(table) {
      const q = { select: () => q, single: () => q, maybeSingle: () => q,
        eq: (key, value) => { filters.push({ table, key, value }); return q; },
        insert: data => { writes.push({ table, data }); return q; }, update: data => { writes.push({ table, data }); return q; },
        then: (resolve, reject) => Promise.resolve({ error: null, data: table === 'profiles'
          ? { role: options.role || 'SUPER_ADMIN', status: options.status || 'ACTIVE' }
          : options.missing ? null : { id: 'item' } }).then(resolve, reject),
      }; return q;
    },
  };
  return { writes, filters, actions: load('src/lib/skills/content-actions.ts', {
    './content-validation': validation, 'node:crypto': { randomUUID: () => 'test-unique-id' },
    '@/lib/supabase/server': { createClient: async () => client }, 'next/cache': { revalidatePath() {} },
  }) };
}
test('every content action rejects non-admin and inactive accounts', async () => {
  for (const options of [{ role: 'STUDENT' }, { role: 'COLLEGE_ADMIN' }, { status: 'SUSPENDED' }, { anonymous: true }]) {
    const f = fixture(options);
    assert.ok((await f.actions.saveSkill(null, form())).error);
    assert.ok((await f.actions.saveModule('module', form())).error);
    assert.ok((await f.actions.saveLesson(null, 'module', form())).error);
    assert.equal(f.writes.length, 0);
  }
});
test('renaming skills preserves code and ID while new skills get distinct identity', async () => {
  const f = fixture();
  assert.ok((await f.actions.saveSkill('original', form())).success);
  assert.equal(f.writes[0].data.code, undefined);
  assert.ok(f.filters.some(x => x.key === 'id' && x.value === 'original'));
  assert.ok((await f.actions.saveSkill(null, form())).success);
  assert.ok(f.writes[1].data.code.startsWith('CUSTOM_'));
});
test('lesson updates are bound to their module and retain links', async () => {
  const f = fixture();
  assert.ok((await f.actions.saveLesson('lesson', 'module', form({ resource_url: 'https://example.test/read' }))).success);
  assert.ok(f.filters.some(x => x.table === 'lessons' && x.key === 'module_id' && x.value === 'module'));
  assert.equal(f.writes[0].data.resource_url, 'https://example.test/read');
});
test('missing module blocks lesson creation and missing updates do not report success', async () => {
  const f = fixture({ missing: true });
  assert.ok((await f.actions.saveLesson(null, 'missing', form())).error);
  assert.equal(f.writes.length, 0);
  assert.ok((await f.actions.saveSkill('missing', form())).error);
});
