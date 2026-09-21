'use client';
import Script from 'next/script';
import { useState } from 'react';
import { prepareCheckout, confirmCheckout } from '@/lib/programme/checkout-actions';
import { formatINR } from '@/lib/programme/settings';

type Order = { key: string; orderId: string; amount: number; months: number; currency: string };
type PaymentResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
declare global {
  interface Window { Razorpay: new (options: Record<string, unknown>) => { open(): void }; }
}

export default function Checkout() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('');

  async function prepare() {
    setBusy(true); setMessage('');
    try {
      const result = await prepareCheckout();
      if (result.order) setOrder(result.order);
      else setMessage(result.error ?? 'Unable to prepare checkout.');
    } catch { setMessage('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  function pay() {
    if (!order || !ready || !window.Razorpay) return;
    setBusy(true); setMessage('');
    try {
      new window.Razorpay({
        key: order.key, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: 'Campus-to-Corporate', description: `TEST: Corporate Readiness — ${order.months} months`,
        modal: { ondismiss: () => { setBusy(false); setMessage('Checkout closed. Access activates only after verified payment.'); } },
        handler: async (response: PaymentResponse) => {
          try {
            const result = await confirmCheckout({ paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id, signature: response.razorpay_signature });
            if (result.state === 'paid') { window.location.assign('/student/learning'); return; }
            setMessage(result.state === 'refunded' ? 'This payment has been refunded.' : result.error ?? 'Check your dashboard for payment status.');
          } catch { setMessage('Confirmation interrupted. Check your dashboard before trying another payment.'); }
          finally { setBusy(false); }
        },
      }).open();
    } catch { setBusy(false); setMessage('Checkout could not open. Please refresh and try again.'); }
  }
  return <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => setMessage('Checkout could not load. Please refresh and try again.')} />
    <h2 className="font-semibold text-slate-900">Test checkout — no real payment</h2>
    <p className="mt-2 text-sm text-slate-700">This is a trial checkout. Live programme enrolment is not open.</p>
    {order && <p className="mt-3 font-medium">{formatINR(order.amount)} · {order.months} months after confirmation · No automatic renewal</p>}
    <button type="button" disabled={busy || !ready} onClick={order ? pay : prepare}
      className="mt-4 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50">
      {busy ? 'Please wait…' : order ? `Test payment of ${formatINR(order.amount)}` : 'Review test checkout'}
    </button>
    {message && <p role="status" className="mt-3 text-sm text-slate-800">{message}</p>}
  </section>;
}
