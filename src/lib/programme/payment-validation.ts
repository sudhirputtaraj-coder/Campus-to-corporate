import { createHmac, timingSafeEqual } from 'node:crypto';

export function validSignature(body: string, signature: unknown, secret: string): boolean {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function paymentState(payment: any, purchase: { provider_order_id: string; price_paise: number; currency: string }) {
  if (!payment || typeof payment.id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(payment.id)
    || payment.order_id !== purchase.provider_order_id || payment.amount !== purchase.price_paise
    || payment.currency !== purchase.currency || !Number.isInteger(payment.amount_refunded)
    || payment.amount_refunded < 0 || payment.amount_refunded > payment.amount) throw new Error('Payment mismatch');
  if (payment.status === 'refunded' && payment.amount_refunded === payment.amount) return 'refunded';
  if (payment.status === 'captured' && payment.captured === true && payment.amount_refunded < payment.amount) return 'paid';
  throw new Error('Payment is not captured');
}
