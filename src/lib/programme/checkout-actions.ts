'use server';
import { createTestOrder, verifyMyPayment } from './payments';
import { revalidatePath } from 'next/cache';

export async function prepareCheckout() {
  try { return { order: await createTestOrder() }; }
  catch { return { error: 'Checkout is unavailable. Make sure your individual profile is complete and you do not already have active access.' }; }
}

export async function confirmCheckout(input: { paymentId: string; orderId: string; signature: string }) {
  if (!input || typeof input.paymentId !== 'string' || typeof input.orderId !== 'string'
    || typeof input.signature !== 'string' || !/^order_[A-Za-z0-9]+$/.test(input.orderId)
    || !/^[a-f0-9]{64}$/i.test(input.signature)) return { error: 'Invalid payment confirmation.' };
  try {
    const state = await verifyMyPayment(input);
    revalidatePath('/student/dashboard');
    revalidatePath('/student/learning');
    return { state };
  } catch {
    return { error: 'Payment confirmation is pending or could not be verified. Check your dashboard before trying another payment.' };
  }
}
