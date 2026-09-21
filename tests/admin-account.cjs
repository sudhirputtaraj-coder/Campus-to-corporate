const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function fixture(options = {}) {
  const calls = [];
  const user = { id: 'admin-id', email: 'admin@example.test', email_confirmed_at: '2026-01-01' };
  let reads = 0;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: options.anonymous ? null : user } }),
      signInWithPassword: async credentials => {
        calls.push('password');
        assert.equal(credentials.email, user.email);
        return { data: { user: { id: options.wrongIdentity ? 'other' : user.id } }, error: options.badPassword ? {} : null };
      },
      updateUser: async change => { calls.push(change); return { error: options.updateError ? {} : null }; },
    },
    from: table => {
      assert.equal(table, 'profiles');
      return { select: () => ({ eq: (column, id) => {
        assert.equal(column, 'user_id'); assert.equal(id, user.id);
        return { single: async () => ({ data: {
          role: options.role || 'SUPER_ADMIN',
          status: options.inactive || (options.revoked && reads++ > 0) ? 'INACTIVE' : 'ACTIVE',
        } }) };
      } }) };
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/auth/account-actions.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) {
    if (id === 'zod') return require('zod');
    if (id === '@/lib/supabase/server') return { createClient: async () => client };
    throw new Error(id);
  } });
  const form = new FormData();
  form.set('email', options.email || 'next@example.test');
  form.set('password', 'test-only-password');
  form.set('user_id', 'attacker-supplied-id');
  return { run: () => exports.changeAdminEmail(form), calls };
}

for (const [name, options] of [
  ['anonymous', { anonymous: true }], ['student', { role: 'STUDENT' }],
  ['inactive administrator', { inactive: true }], ['invalid email', { email: 'invalid' }],
  ['unchanged email', { email: 'admin@example.test' }], ['wrong password', { badPassword: true }],
  ['wrong reauthenticated identity', { wrongIdentity: true }], ['role access revoked', { revoked: true }],
]) test(`rejects ${name} without changing email`, async () => {
  const f = fixture(options);
  assert.ok((await f.run()).error);
  assert.equal(f.calls.filter(c => typeof c === 'object').length, 0);
});

test('active admin requests Auth email change for own account after password verification', async () => {
  const f = fixture({ email: ' NEXT@example.test ' });
  assert.equal((await f.run()).success, true);
  assert.equal(f.calls[0], 'password');
  assert.equal(JSON.stringify(f.calls[1]), JSON.stringify({ email: 'next@example.test' }));
});
test('provider failure does not report success', async () => {
  const f = fixture({ updateError: true });
  assert.ok((await f.run()).error);
});
