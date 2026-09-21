const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) { if (!(id in deps)) throw Error(id); return deps[id]; } });
  return exports;
}
const id = '00000000-0000-4000-8000-000000000001';
function fixture(options = {}) {
  const writes = [], filters = [], invalidated = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id } } }) },
    from(table) {
      let writing = false;
      const query = {
        select() { return query; },
        eq(k,v) { filters.push(['eq',k,v]); return query; },
        neq(k,v) { filters.push(['neq',k,v]); return query; },
        update(data) { writing = true; writes.push({table,op:'update',data}); return query; },
        insert(data) { writing = true; writes.push({table,op:'insert',data}); return query; },
        async single() {
          if (writing) return options.saveError ? { error: { code: options.saveError } } : { data: { id, user_id: id } };
          return { data: { role: options.role || 'SUPER_ADMIN', status: options.status || 'ACTIVE' } };
        },
      };
      return query;
    },
  };
  const guard = load('src/lib/admin/require-admin.ts', { 'server-only': {}, '@/lib/supabase/server': { createClient: async () => client } });
  const actions = load('src/lib/admin/management.ts', { zod: require('zod'), 'next/cache': { revalidatePath: p => invalidated.push(p) }, './require-admin': guard });
  return { ...actions, writes, filters, invalidated };
}
const form = obj => { const f = new FormData(); for (const [k,v] of Object.entries(obj)) f.set(k,v); return f; };
const college = { name:'Example College', code:'example-1', city:'', state:'', address:'', contact_person:'', contact_email:'', contact_phone:'', status:'ACTIVE' };
const user = { user_id:id, full_name:'Student', phone:'', status:'SUSPENDED' };
for (const options of [{ anonymous:true },{ role:'STUDENT' },{ role:'COLLEGE_ADMIN' },{ role:'TRAINER' },{ status:'SUSPENDED' }]) {
  test(`rejects unauthorized writes ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.ok((await f.saveCollege(form(college))).error);
    assert.ok((await f.saveUser(form(user))).error);
    assert.equal(f.writes.length,0);
  });
}
test('creates college with normalized code and ignores unrecognized fields', async () => {
  const f = fixture(); assert.equal((await f.saveCollege(form({...college, role:'SUPER_ADMIN'}))).success,true);
  assert.equal(f.writes[0].data.code,'EXAMPLE-1'); assert.equal(f.writes[0].data.role,undefined);
  assert.ok(f.invalidated.includes('/admin/colleges'));
});
test('editing targets only selected college', async () => {
  const f = fixture(); await f.saveCollege(form({...college,id}));
  assert.equal(f.writes[0].op,'update'); assert.ok(f.filters.some(([op,k,v])=>op==='eq'&&k==='id'&&v===id));
});
test('invalid college data never writes', async () => {
  for (const changes of [{name:''},{code:'bad code'},{contact_email:'invalid'},{status:'unknown'},{id:'invalid'}]) {
    const f = fixture(); assert.ok((await f.saveCollege(form({...college,...changes}))).error); assert.equal(f.writes.length,0);
  }
});
test('duplicate college code gives useful error', async () => {
  const f = fixture({saveError:'23505'}); assert.match((await f.saveCollege(form(college))).error,/already in use/); assert.equal(f.invalidated.length,0);
});
test('user edits cannot change role or email and exclude all superadmins atomically', async () => {
  const f = fixture(); assert.equal((await f.saveUser(form({...user,role:'SUPER_ADMIN',email:'changed@example.test'}))).success,true);
  assert.equal(f.writes[0].data.role,undefined); assert.equal(f.writes[0].data.email,undefined);
  assert.ok(f.filters.some(([op,k,v])=>op==='neq'&&k==='role'&&v==='SUPER_ADMIN'));
  assert.ok(f.filters.some(([op,k,v])=>op==='eq'&&k==='user_id'&&v===id));
});
test('invalid user status is rejected', async () => {
  const f = fixture(); assert.ok((await f.saveUser(form({...user,status:'anything'}))).error); assert.equal(f.writes.length,0);
});
test('missing or protected user does not report success', async () => {
  const f = fixture({saveError:'PGRST116'}); assert.ok((await f.saveUser(form(user))).error); assert.equal(f.invalidated.length,0);
});
