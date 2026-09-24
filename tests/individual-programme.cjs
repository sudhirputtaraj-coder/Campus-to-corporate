// Run: node tests/individual-programme.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console: { error() {} }, require(id) {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`);
    return dependencies[id];
  } });
  return exports;
}
const settings = load('src/lib/programme/settings.ts');
test('₹500 and six months are stored as exact minor units', () => {
  assert.equal(JSON.stringify(settings.parseProgrammeSettings('500', '6')), JSON.stringify({ price_paise: 50000, access_months: 6 }));
});
test('decimal rupees preserve paise without floating point drift', () => {
  assert.equal(settings.parseProgrammeSettings('499.99', '12').price_paise, 49999);
  assert.equal(settings.parseProgrammeSettings('0.01', '1').price_paise, 1);
});
for (const price of ['-500', '1e3', 'NaN', 'Infinity', '500.001', '', '1000001']) {
  test(`reject invalid price ${JSON.stringify(price)}`, () => assert.equal(settings.parseProgrammeSettings(price, '6'), null));
}
test('reject noninteger, absent, negative and oversized durations', () => {
  for (const duration of ['0', '-1', '6.5', '', '121', '6e1']) assert.equal(settings.parseProgrammeSettings('500', duration), null);
});
test('reject file-like form values', () => assert.equal(settings.parseProgrammeSettings({}, '6'), null));

function fixture(options = {}) {
  const calls = [];
  const profile = { role: options.role || 'SUPER_ADMIN', status: options.status || 'ACTIVE' };
  const user = options.anonymous ? null : { id: 'owner', user_metadata: { account_type: 'INDIVIDUAL' } };
  const client = {
    auth: {
      getUser: async () => ({ data: { user } }),
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ data: { user: options.duplicate ? { id: 'owner', identities: [] } : { id: 'new', identities: [{ id: 'identity' }] }, session: null }, error: null }),
    },
    rpc: async (...args) => { calls.push(['rpc', ...args]); return { error: options.rpcError ? { message: 'failed' } : null }; },
    from(table) {
      let operation = 'read';
      const query = {
        select() { return query; },
        eq(key, value) { calls.push(['filter', table, key, value]); return query; },
        update(values) { operation = 'update'; calls.push(['update', table, values]); return query; },
        upsert(...args) { calls.push(['upsert', table, ...args]); return query; },
        insert() { return query; }, single() { return query; },
        then(resolve, reject) {
          return Promise.resolve({ data: table === 'profiles' ? profile : options.noRow && operation === 'update' ? null : { id: 'corporate-readiness' }, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const dependencies = {
    './email-redirect': { emailCallback: async () => 'http://localhost:3002/auth/callback?next=%2Flogin' },
    '@/lib/supabase/server': { createClient: async () => client, createServiceClient: () => { calls.push(['service']); return client; } },
    'next/navigation': { redirect: url => { throw new Error(`REDIRECT ${url}`); } },
    'next/cache': { revalidatePath() {} },
    './settings': settings,
  };
  return { calls, actions: load('src/lib/programme/actions.ts', dependencies), auth: load('src/lib/auth/actions.ts', dependencies) };
}
const form = (price = '500', months = '6') => ({ get: key => ({ price, months, email: 'test@example.com', password: 'test-password', full_name: 'Test Student' })[key] });
test('student cannot change programme settings', async () => {
  const f = fixture({ role: 'STUDENT' });
  await assert.rejects(() => f.actions.saveProgrammeSettings(form()), /REDIRECT \/login/);
  assert.ok(!f.calls.some(call => call[0] === 'update'));
});
test('inactive administrator cannot change settings', async () => {
  const f = fixture({ status: 'SUSPENDED' });
  await assert.rejects(() => f.actions.saveProgrammeSettings(form()), /REDIRECT \/login/);
  assert.ok(!f.calls.some(call => call[0] === 'update'));
});
test('admin saves validated values to the single programme row', async () => {
  const f = fixture();
  await assert.rejects(() => f.actions.saveProgrammeSettings(form('750', '12')), /saved=1/);
  const update = f.calls.find(call => call[0] === 'update');
  assert.equal(update[2].price_paise, 75000);
  assert.equal(update[2].access_months, 12);
  assert.ok(f.calls.some(call => call[0] === 'filter' && call[2] === 'id' && call[3] === 'corporate-readiness'));
});
test('invalid admin input never reaches database update', async () => {
  const f = fixture();
  await assert.rejects(() => f.actions.saveProgrammeSettings(form('-1')), /error=invalid/);
  assert.ok(!f.calls.some(call => call[0] === 'update'));
});
test('missing settings row cannot report success', async () => {
  const f = fixture({ noRow: true });
  await assert.rejects(() => f.actions.saveProgrammeSettings(form()), /error=save/);
});
test('profile setup uses authenticated RPC with no caller-supplied identity', async () => {
  const f = fixture({ role: 'STUDENT' });
  await assert.rejects(() => f.actions.completeIndividualProfile(), /REDIRECT \/student\/dashboard/);
  assert.deepEqual(f.calls.find(call => call[0] === 'rpc'), ['rpc', 'fn_register_individual_student']);
  assert.ok(!f.calls.some(call => call[0] === 'service'));
});
test('anonymous setup is denied without calling RPC', async () => {
  const f = fixture({ anonymous: true });
  await assert.rejects(() => f.actions.completeIndividualProfile(), /REDIRECT \/login/);
  assert.ok(!f.calls.some(call => call[0] === 'rpc'));
});
test('RPC failure returns to setup instead of pretending success', async () => {
  const f = fixture({ rpcError: true });
  await assert.rejects(() => f.actions.completeIndividualProfile(), /setup\?error=setup/);
});
test('promoted admin with old signup metadata is not forced into student setup', async () => {
  const f = fixture();
  await assert.rejects(() => f.auth.login(form()), /REDIRECT \/login/);
  assert.ok(!f.calls.some(call => call[0] === 'rpc'));
});
test('individual student login completes registration', async () => {
  const f = fixture({ role: 'STUDENT' });
  await assert.rejects(() => f.auth.login(form()), /REDIRECT \/login/);
  assert.ok(f.calls.some(call => call[0] === 'rpc'));
});
test('signup preserves existing roles using conflict-ignore rather than overwrite', async () => {
  const f = fixture();
  const result = await f.auth.signup(form());
  assert.equal(result.success, true);
  const operation = f.calls.find(call => call[0] === 'upsert');
  assert.equal(operation[3].ignoreDuplicates, true);
  assert.equal(operation[3].onConflict, 'user_id');
});
test('duplicate signup does not create or update a profile', async () => {
  const f = fixture({ duplicate: true });
  await f.auth.signup(form());
  assert.ok(!f.calls.some(call => call[0] === 'service' || call[0] === 'upsert'));
});

test('zero price enables free offer', () => assert.equal(settings.parseProgrammeSettings('0', '6').price_paise, 0));
