const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Buffer, Request, Response, ...globals, require(id) {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`);
    return dependencies[id];
  } });
  return exports;
}
const validation = load('src/lib/programme/payment-validation.ts', { 'node:crypto': crypto });
const sign = (body, secret = 'test-secret') => crypto.createHmac('sha256', secret).update(body).digest('hex');
test('valid HMAC accepted; changed payload, wrong key and malformed signature rejected', () => {
  assert.equal(validation.validSignature('raw body', sign('raw body'), 'test-secret'), true);
  for (const signature of [null, '', 'z'.repeat(64), sign('different body'), sign('raw body', 'wrong-secret')]) {
    assert.equal(validation.validSignature('raw body', signature, 'test-secret'), false);
  }
});
const purchase = { student_id: 'owner-student', provider_order_id: 'order_Test', price_paise: 50000, currency: 'INR', payment_mode: 'TEST' };
const captured = { id: 'pay_Test', order_id: 'order_Test', amount: 50000, currency: 'INR', amount_refunded: 0, status: 'captured', captured: true };
test('only matched captured payment grants access', () => {
  assert.equal(validation.paymentState(captured, purchase), 'paid');
  for (const patch of [{ amount: 1 }, { currency: 'USD' }, { order_id: 'order_Other' },
    { status: 'authorized' }, { captured: false }, { amount_refunded: -1 }, { amount_refunded: 50001 }]) {
    assert.throws(() => validation.paymentState({ ...captured, ...patch }, purchase));
  }
});
test('full refund revokes access; partial refund retains access', () => {
  assert.equal(validation.paymentState({ ...captured, amount_refunded: 50000, status: 'refunded' }, purchase), 'refunded');
  assert.equal(validation.paymentState({ ...captured, amount_refunded: 1000 }, purchase), 'paid');
});
test('configuration refuses live keys and disabled/missing configuration', () => {
  for (const patch of [{}, { RAZORPAY_KEY_ID: 'rzp_live_Test' }, { RAZORPAY_TEST_ENABLED: 'false' }, { RAZORPAY_WEBHOOK_SECRET: '' }]) {
    const env = { RAZORPAY_TEST_ENABLED: 'true', RAZORPAY_KEY_ID: 'rzp_test_Test', RAZORPAY_KEY_SECRET: 'secret', RAZORPAY_WEBHOOK_SECRET: 'webhook', ...patch };
    const api = load('src/lib/programme/razorpay.ts', { 'server-only': {} }, { process: { env } });
    assert.equal(api.testPaymentsEnabled(), Object.keys(patch).length === 0);
  }
});
function fixture(options = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'owner' } }, error: null }) },
    from(table) {
      const q = { select() { return q; }, eq(key, value) { calls.push(['filter', table, key, value]); return q; }, single() { return q; },
        then(resolve, reject) { return Promise.resolve({ error: null, data: table === 'profiles' ? { role: options.role || 'STUDENT', status: 'ACTIVE' }
          : table === 'students' ? { id: 'owner-student', account_type: 'INDIVIDUAL', status: 'ACTIVE' } : { ...purchase, student_id: options.otherOwner ? 'other' : 'owner-student' } }).then(resolve, reject); },
      }; return q;
    },
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return { data: {}, error: null }; },
  };
  const api = load('src/lib/programme/payments.ts', {
    'server-only': {}, '@/lib/supabase/server': { createClient: async () => client, createServiceClient: () => client },
    './razorpay': { razorpayConfig: () => ({ secret: 'test-secret' }), razorpayRequest: async () => ({ ...captured, ...options.payment }) },
    './payment-validation': validation,
  });
  return { calls, api };
}
const input = { paymentId: 'pay_Test', orderId: 'order_Test', signature: sign('order_Test|pay_Test') };
test('verified owner payment uses server-fetched amount and service activation', async () => {
  const f = fixture();
  assert.equal(await f.api.verifyMyPayment(input), 'paid');
  const call = f.calls.find(c => c[0] === 'rpc');
  assert.equal(call[1], 'fn_apply_verified_payment');
  assert.equal(call[2].p_amount, 50000);
});
test('anonymous, wrong role, wrong owner, forged signature and uncaptured payments cannot activate', async () => {
  for (const options of [{ anonymous: true }, { role: 'TRAINER' }, { otherOwner: true }, { payment: { status: 'authorized' } }, { badSignature: true }]) {
    const f = fixture(options);
    await assert.rejects(() => f.api.verifyMyPayment({ ...input, signature: options.badSignature ? '0'.repeat(64) : input.signature }));
    assert.ok(!f.calls.some(c => c[0] === 'rpc'));
  }
});
function webhookFixture() {
  const calls = [];
  return { calls, route: load('src/app/api/payments/razorpay/webhook/route.ts', {
    '@/lib/programme/razorpay': { razorpayConfig: () => ({ webhookSecret: 'test-secret' }) },
    '@/lib/programme/payment-validation': validation,
    '@/lib/programme/payments': { reconcilePayment: async id => { calls.push(id); } },
  }) };
}
test('webhook verifies the raw body before applying anything', async () => {
  const f = webhookFixture();
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_Test' } } } });
  const request = signature => new Request('http://localhost/api/payments/razorpay/webhook', { method: 'POST', body, headers: { 'x-razorpay-signature': signature } });
  assert.equal((await f.route.POST(request(sign('tampered')))).status, 400);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.route.POST(request(sign(body)))).status, 200);
  assert.equal(f.calls[0], 'pay_Test');
});
test('failed payment events never grant access', async () => {
  const f = webhookFixture();
  const body = JSON.stringify({ event: 'payment.failed' });
  const response = await f.route.POST(new Request('http://localhost/api/payments/razorpay/webhook', { method: 'POST', body, headers: { 'x-razorpay-signature': sign(body) } }));
  assert.equal(response.status, 200);
  assert.equal(f.calls.length, 0);
});
test('lesson action rejects expired access before any learning mutation', async () => {
  const calls = [];
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    from() { const q = { select() { return q; }, eq() { return q; }, single: async () => ({ data: { id: 'student' } }) }; return q; },
    rpc: async name => { calls.push(name); return { data: false, error: null }; },
  };
  const actions = load('src/lib/learning/actions.ts', {
    '@/lib/supabase/server': { createClient: async () => client, createServiceClient: () => { throw new Error('Service client must not be used'); } },
    'next/cache': { revalidatePath() {} }, '@/lib/skills': {},
  });
  assert.ok((await actions.markLessonComplete('lesson','course')).error);
  assert.equal(calls.length, 1);
});
