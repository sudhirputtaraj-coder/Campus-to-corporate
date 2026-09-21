import { razorpayConfig } from '@/lib/programme/razorpay';
import { validSignature } from '@/lib/programme/payment-validation';
import { reconcilePayment } from '@/lib/programme/payments';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  let secret: string;
  try { secret = razorpayConfig().webhookSecret; }
  catch { return new Response('Payments disabled', { status: 503 }); }
  const reader = request.body?.getReader();
  if (!reader) return new Response('Missing body', { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 262144) { await reader.cancel(); return new Response('Body too large', { status: 413 }); }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  if (!validSignature(body, request.headers.get('x-razorpay-signature'), secret)) return new Response('Invalid signature', { status: 400 });
  let event: any;
  try { event = JSON.parse(body); }
  catch { return new Response('Invalid JSON', { status: 400 }); }
  // Failed/authorized events never grant access. Order retries can later succeed.
  if (!['payment.captured', 'order.paid', 'refund.processed'].includes(event?.event)) return new Response('Ignored', { status: 200 });
  const paymentId = event.event === 'refund.processed'
    ? event.payload?.refund?.entity?.payment_id : event.payload?.payment?.entity?.id;
  if (typeof paymentId !== 'string') return new Response('Missing payment', { status: 400 });
  try {
    await reconcilePayment(paymentId);
    return new Response('Processed', { status: 200 });
  } catch {
    // Retry on provider/database errors; do not acknowledge an unapplied payment.
    return new Response('Payment reconciliation pending', { status: 503 });
  }
}
