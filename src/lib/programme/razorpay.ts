import 'server-only';

export function testPaymentsEnabled() {
  return process.env.RAZORPAY_TEST_ENABLED === 'true'
    && /^rzp_test_[A-Za-z0-9]+$/.test(process.env.RAZORPAY_KEY_ID ?? '')
    && Boolean(process.env.RAZORPAY_KEY_SECRET) && Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export function razorpayConfig() {
  if (!testPaymentsEnabled()) throw new Error('Test payments are not configured');
  return { keyId: process.env.RAZORPAY_KEY_ID!, secret: process.env.RAZORPAY_KEY_SECRET!, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET! };
}

export async function razorpayRequest(path: string, body?: unknown) {
  const { keyId, secret } = razorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Payment provider request failed');
  return response.json();
}
