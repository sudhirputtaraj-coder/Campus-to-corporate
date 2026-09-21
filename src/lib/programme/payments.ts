import 'server-only';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { razorpayConfig, razorpayRequest } from './razorpay';
import { paymentState, validSignature } from './payment-validation';

async function currentIndividual() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('Sign in first');
  const { data: profile, error: profileError } = await client.from('profiles').select('role, status').eq('user_id', user.id).single();
  const { data: student, error: studentError } = await client.from('students').select('id, account_type, status').eq('user_id', user.id).single();
  if (profileError || studentError || profile?.role !== 'STUDENT' || profile.status !== 'ACTIVE'
    || student?.account_type !== 'INDIVIDUAL' || student.status !== 'ACTIVE') throw new Error('Active individual student required');
  return { user, student };
}

export async function createTestOrder() {
  const config = razorpayConfig();
  const { user } = await currentIndividual();
  const service = createServiceClient();
  const { data: reserved, error } = await service.rpc('fn_reserve_programme_purchase', { p_user_id: user.id });
  if (error || !reserved) throw new Error('Unable to reserve order');
  let purchase = reserved;
  if (!purchase.provider_order_id) {
    const order = await razorpayRequest('orders', {
      amount: purchase.price_paise, currency: purchase.currency, receipt: purchase.id,
      notes: { purchase_id: purchase.id },
    });
    if (!/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== purchase.price_paise || order.currency !== purchase.currency) throw new Error('Invalid order');
    const { data: linked, error: linkError } = await service.from('programme_purchases')
      .update({ provider_order_id: order.id }).eq('id', purchase.id).is('provider_order_id', null).select('*').maybeSingle();
    if (linkError) throw new Error('Unable to link order');
    if (linked) purchase = linked;
    else {
      const { data, error: readError } = await service.from('programme_purchases').select('*').eq('id', purchase.id).single();
      if (readError || !data?.provider_order_id) throw new Error('Unable to recover order');
      purchase = data;
    }
  }
  return { key: config.keyId, orderId: purchase.provider_order_id as string,
    amount: purchase.price_paise as number, months: purchase.access_months as number, currency: 'INR' };
}

/** Always fetch the provider's current state. A delayed capture must not undo a refund. */
export async function reconcilePayment(paymentId: string, ownerStudentId?: string, signature?: string, orderId?: string) {
  const config = razorpayConfig();
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new Error('Invalid payment');
  const service = createServiceClient();
  const payment = await razorpayRequest(`payments/${paymentId}`);
  if (payment.id !== paymentId || typeof payment.order_id !== 'string') throw new Error('Invalid payment');
  const { data: purchase, error } = await service.from('programme_purchases').select('*')
    .eq('provider_order_id', payment.order_id).eq('payment_mode', 'TEST').single();
  if (error || !purchase) throw new Error('Unknown purchase');
  if (ownerStudentId && (purchase.student_id !== ownerStudentId || orderId !== purchase.provider_order_id
    || !validSignature(`${purchase.provider_order_id}|${paymentId}`, signature, config.secret))) throw new Error('Invalid verification');
  const state = paymentState(payment, purchase);
  const { error: applyError } = await service.rpc('fn_apply_verified_payment', {
    p_order_id: purchase.provider_order_id, p_payment_id: payment.id,
    p_amount: payment.amount, p_currency: payment.currency, p_refunded: state === 'refunded',
  });
  if (applyError) throw new Error('Unable to update access');
  return state;
}

export async function verifyMyPayment(input: { paymentId: string; orderId: string; signature: string }) {
  const { student } = await currentIndividual();
  return reconcilePayment(input.paymentId, student.id, input.signature, input.orderId);
}
