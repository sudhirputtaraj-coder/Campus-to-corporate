// Run: node tests/login-portals.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console, require(id) {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  } });
  return exports;
}
const portals = load('src/lib/auth/portals.ts');
for (const [portal, role, account_type, destination] of [
  ['individual', 'STUDENT', 'INDIVIDUAL', '/student/dashboard'],
  ['college-student', 'STUDENT', 'COLLEGE', '/student/dashboard'],
  ['college-admin', 'COLLEGE_ADMIN', null, '/college/dashboard'],
  ['trainer', 'TRAINER', null, '/trainer/dashboard'],
  ['super-admin', 'SUPER_ADMIN', null, '/admin/dashboard'],
]) {
  test(`${portal} routes an active matching account`, () => {
    const result = portals.resolveLoginPortal(portal, { role, status: 'ACTIVE' }, account_type ? { account_type, status: 'ACTIVE' } : null);
    assert.equal(result.destination, destination);
  });
}
test('all mismatched role/portal combinations are rejected', () => {
  for (const portal of portals.LOGIN_PORTALS.filter(p => p.role)) {
    for (const role of ['STUDENT', 'COLLEGE_ADMIN', 'TRAINER', 'SUPER_ADMIN']) {
      if (role !== portal.role) assert.ok(portals.resolveLoginPortal(portal.id, { role, status: 'ACTIVE' }, null).error);
    }
  }
});
test('individual and college student types cannot be interchanged', () => {
  assert.ok(portals.resolveLoginPortal('individual', { role: 'STUDENT', status: 'ACTIVE' }, { account_type: 'COLLEGE', status: 'ACTIVE' }).error.includes('College student'));
  assert.ok(portals.resolveLoginPortal('college-student', { role: 'STUDENT', status: 'ACTIVE' }, { account_type: 'INDIVIDUAL', status: 'ACTIVE' }).error.includes('Individual student'));
});
test('missing student record goes to setup without granting membership', () => {
  assert.equal(portals.resolveLoginPortal('individual', { role: 'STUDENT', status: 'ACTIVE' }, null).destination, '/student/setup');
});
test('inactive profiles, inactive students and missing profiles are denied', () => {
  assert.ok(portals.resolveLoginPortal('super-admin', { role: 'SUPER_ADMIN', status: 'SUSPENDED' }, null).error);
  assert.ok(portals.resolveLoginPortal('individual', { role: 'STUDENT', status: 'ACTIVE' }, { account_type: 'INDIVIDUAL', status: 'SUSPENDED' }).error);
  assert.ok(portals.resolveLoginPortal('individual', null, null).error);
});
test('employer and unknown portal cannot authenticate', () => {
  assert.ok(portals.resolveLoginPortal('employer', { role: 'SUPER_ADMIN', status: 'ACTIVE' }, null).error);
  assert.ok(portals.resolveLoginPortal('unknown', { role: 'SUPER_ADMIN', status: 'ACTIVE' }, null).error);
});

function fixture(options = {}) {
  const calls = [];
  const client = {
    auth: {
      signInWithPassword: async () => { calls.push('sign-in'); return { error: options.badPassword ? { message: 'Invalid login credentials' } : null }; },
      getUser: async () => ({ data: { user: { id: 'authenticated-user' } }, error: null }),
      signOut: async opts => { assert.equal(opts.scope, 'local'); calls.push('sign-out'); return { error: null }; },
    },
    from(table) {
      const chain = {
        select() { return chain; },
        eq(key, value) { assert.equal(key, 'user_id'); assert.equal(value, 'authenticated-user'); return chain; },
        single() { return chain; }, maybeSingle() { return chain; },
        then(resolve, reject) {
          return Promise.resolve({ data: table === 'profiles' ? { role: options.role || 'STUDENT', status: 'ACTIVE' } : { account_type: 'INDIVIDUAL', status: 'ACTIVE' }, error: options.queryError ? { message: 'failed' } : null }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  const actions = load('src/lib/auth/portal-login.ts', {
    './portals': portals,
    '@/lib/supabase/server': { createClient: async () => { calls.push('client'); return client; } },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect: destination => { throw new Error(`REDIRECT ${destination}`); } },
  });
  return { actions, calls };
}
const form = portal => ({ get: name => ({ portal, email: 'test@example.com', password: 'test-password' })[name] });
test('server refuses employer selection before authentication', async () => {
  const f = fixture();
  assert.ok((await f.actions.signInToPortal(form('employer'))).error);
  assert.equal(f.calls.length, 0);
});
test('server clears session after selecting an unauthorized portal', async () => {
  const f = fixture();
  assert.ok((await f.actions.signInToPortal(form('super-admin'))).error);
  assert.ok(f.calls.includes('sign-out'));
});
test('server rejects failed account lookup rather than defaulting to student', async () => {
  const f = fixture({ queryError: true });
  assert.ok((await f.actions.signInToPortal(form('individual'))).error);
  assert.ok(f.calls.includes('sign-out'));
});
test('correct account is redirected without clearing the session', async () => {
  const f = fixture();
  await assert.rejects(() => f.actions.signInToPortal(form('individual')), /REDIRECT \/student\/dashboard/);
  assert.ok(!f.calls.includes('sign-out'));
});
test('bad password reports authentication failure', async () => {
  const f = fixture({ badPassword: true });
  assert.equal((await f.actions.signInToPortal(form('individual'))).error, 'Invalid login credentials');
});
