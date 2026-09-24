import Link from 'next/link';
import { getMyProgrammeAccess } from '@/lib/programme/access';
import { formatINR } from '@/lib/programme/settings';

const messages = {
  'not-activated': ['Not activated', 'Your individual profile is ready. Open the programme page to see enrolment availability.'],
  active: ['Active', 'Your programme access dates are shown below.'],
  expired: ['Expired', 'Your programme access period has ended. Renewal payments are not open yet.'],
  pending: ['Payment confirmation pending', 'Access has not been activated for this payment.'],
  failed: ['Payment unsuccessful', 'This payment did not activate programme access.'],
  refunded: ['Payment refunded', 'This purchase no longer provides programme access.'],
  scheduled: ['Access starts soon', 'Your confirmed access period has not started yet.'],
  unavailable: ['Status unavailable', 'We could not check your programme status. Please refresh and try again.'],
} as const;

const date = (value: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
}).format(new Date(value));

export default async function ProgrammeStatus() {
  const access = await getMyProgrammeAccess();
  if (!access) return null;
  const [title, message] = messages[access.state];
  const purchase = access.purchase;
  const showDates = purchase && ['active', 'expired', 'scheduled'].includes(access.state);
  return (
    <section aria-label="Programme access" className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="font-semibold text-slate-900">Corporate Readiness Programme</h2>
      <p className="mt-2 font-medium text-slate-900">{title}</p>
      {purchase?.payment_mode === 'FREE' && <p className="mt-1 text-sm font-semibold">Free enrolment — no payment required</p>}
      {purchase?.payment_mode === 'TEST'  && <p className="mt-1 text-sm font-semibold text-amber-800">Test purchase — no real payment</p>}
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      {showDates && <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div><dt>Access started / starts (IST)</dt><dd className="font-medium">{date(purchase.activated_at!)}</dd></div>
        <div><dt>Access ends / ended (IST)</dt><dd className="font-medium">{date(purchase.expires_at!)}</dd></div>
        <div className="sm:col-span-2"><dt>Agreed purchase terms</dt><dd>{formatINR(purchase.price_paise)} · {purchase.access_months} months · No automatic renewal</dd></div>
      </dl>}
      <Link href="/programme" className="mt-3 inline-block text-sm font-medium text-blue-700 underline">View programme and current offer</Link>
    </section>
  );
}
