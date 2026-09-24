// Run: node tests/programme-access.cjs
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
  vm.runInNewContext(code, { exports, Date, require(id) {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`);
    return dependencies[id];
  } });
  return exports;
}
const status = load('src/lib/programme/access-status.ts');
const now = Date.parse('2026-09-19T12:00:00Z');
const purchase = (extra = {}) => ({ status: 'PAID', activated_at: '2026-09-01T00:00:00Z',
  expires_at: '2027-03-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z',
  price_paise: 50000, currency: 'INR', access_months: 6, ...extra });
const describe = rows => status.describeProgrammeAccess(rows, now);
test('no purchase is not activated', () => assert.equal(describe([]).state, 'not-activated'));
test('start is inclusive, expiry is exclusive', () => {
  assert.equal(describe([purchase({ activated_at: new Date(now).toISOString() })]).state, 'active');
  assert.equal(describe([purchase({ expires_at: new Date(now).toISOString() })]).state, 'expired');
});
test('future activation does not report active', () => {
  assert.equal(describe([purchase({ activated_at: '2026-10-01T00:00:00Z' })]).state, 'scheduled');
});
test('missing, malformed and reversed paid dates are unavailable', () => {
  for (const changes of [{ activated_at: null }, { expires_at: null }, { expires_at: 'bad' },
    { activated_at: '2027-04-01T00:00:00Z' }]) {
    assert.equal(describe([purchase(changes)]).state, 'unavailable');
  }
});
test('pending, failed and refunded never report active even with dates', () => {
  for (const value of ['PENDING', 'FAILED', 'REFUNDED']) {
    assert.equal(describe([purchase({ status: value })]).state, value.toLowerCase());
  }
});
test('a newer pending/failed/refunded purchase cannot hide still-active access', () => {
  for (const value of ['PENDING', 'FAILED', 'REFUNDED']) {
    assert.equal(describe([purchase(), purchase({ status: value, created_at: '2026-09-18T00:00:00Z' })]).state, 'active');
  }
});
test('overlapping active purchases display the later end date and its original terms', () => {
  const later = purchase({ expires_at: '2027-09-01T00:00:00Z', price_paise: 75000, access_months: 12 });
  const result = describe([later, purchase()]);
  assert.equal(result.purchase.expires_at, later.expires_at);
  assert.equal(result.purchase.price_paise, 75000);
  assert.equal(result.purchase.access_months, 12);
});
test('unknown status does not appear as unpaid or active', () => {
  assert.equal(describe([purchase({ status: 'UNKNOWN' })]).state, 'unavailable');
});
function fixture(options = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'signed-in-user' } }, error: null }) },
    from(table) {
      calls.push(['from', table]);
      const filters = [];
      const query = {};
      for (const method of ['select', 'eq', 'lte', 'gt', 'order', 'limit', 'maybeSingle', 'single']) {
        query[method] = (...args) => { calls.push([table, method, ...args]); filters.push([method, ...args]); return query; };
      }
      query.then = (resolve, reject) => {
        if (options.networkFailure) return Promise.reject(new Error('offline')).then(resolve, reject);
        const active = filters.some(f => f[0] === 'eq' && f[1] === 'status');
        return Promise.resolve({ data: table === 'students'
          ? { id: 'own-student', account_type: options.college ? 'COLLEGE' : 'INDIVIDUAL' }
          : table === 'programme_free_access' ? options.freeGrant || null : table === 'programme_settings' ? { payment_mode: 'TEST' } : active ? options.active || [] : options.latest || [],
        error: options.queryError || (options.purchaseError && table === 'programme_purchases') ? { message: 'unavailable' } : null }).then(resolve, reject);
      };
      return query;
    },
  };
  return { calls, access: load('src/lib/programme/access.ts', {
    'server-only': {}, '@/lib/supabase/server': { createClient: async () => client }, './access-status': status,
  }) };
}
test('anonymous users cannot query purchases', async () => {
  const f = fixture({ anonymous: true });
  assert.equal((await f.access.getMyProgrammeAccess()).state, 'unavailable');
  assert.equal(f.calls.length, 0);
});
test('college students have no individual purchase panel or purchase query', async () => {
  const f = fixture({ college: true });
  assert.equal(await f.access.getMyProgrammeAccess(), null);
  assert.ok(!f.calls.some(c => c[1] === 'programme_purchases'));
});
test('each purchase lookup is scoped to the authenticated student and programme', async () => {
  const f = fixture();
  assert.equal((await f.access.getMyProgrammeAccess()).state, 'not-activated');
  assert.ok(f.calls.some(c => c[0] === 'students' && c[1] === 'eq' && c[2] === 'user_id' && c[3] === 'signed-in-user'));
  for (const [key, value] of [['student_id', 'own-student'], ['programme_id', 'corporate-readiness']]) {
    assert.equal(f.calls.filter(c => c[0] === 'programme_purchases' && c[1] === 'eq' && c[2] === key && c[3] === value).length, 2);
  }
});
test('database and network errors show unavailable, not not-activated', async () => {
  for (const options of [{ queryError: true }, { purchaseError: true }, { networkFailure: true }]) {
    const f = fixture(options);
    assert.equal((await f.access.getMyProgrammeAccess()).state, 'unavailable');
  }
});

test('free access is active and scoped to the signed-in student', async () => {
 const f = fixture({freeGrant:{activated_at:'2020-01-01T00:00:00Z',expires_at:'2099-01-01T00:00:00Z',access_months:6}});
 const result=await f.access.getMyProgrammeAccess();
 assert.equal(result.state,'active');assert.equal(result.purchase.payment_mode,'FREE');
 assert.ok(f.calls.some(c=>c[0]==='programme_free_access'&&c[1]==='eq'&&c[2]==='student_id'&&c[3]==='own-student'));
});
