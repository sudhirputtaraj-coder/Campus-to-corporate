import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/programme/settings';
import { testPaymentsEnabled } from '@/lib/programme/razorpay';
import Checkout from './checkout';

export default async function ProgrammePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('programme_settings')
    .select('name, price_paise, access_months').eq('id', 'corporate-readiness').single();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href={user ? '/student/dashboard' : '/'} className="text-sm text-blue-700 underline">Back to {user ? 'dashboard' : 'home'}</Link>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
          <p className="text-sm font-semibold text-blue-700">FOR INDIVIDUAL STUDENTS</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Corporate Readiness Programme</h1>
          <p className="mt-4 text-slate-600">Build workplace skills through structured courses, assessments, and progress tracking. No participating college is required.</p>
          {!error && data ? <div className="my-6 rounded-xl bg-blue-50 p-5">
            <p className="text-3xl font-bold text-slate-900">{formatINR(data.price_paise)} <span className="text-base font-normal">one-time payment</span></p>
            <p className="mt-2 text-slate-700">{data.access_months} months of programme access after confirmed payment. No automatic renewal.</p>
          </div> : <p role="status" className="my-6 rounded-lg bg-amber-50 p-4 text-amber-900">Programme pricing is currently unavailable. Please check back later.</p>}
          <h2 className="font-semibold text-slate-900">Planned programme access</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
            <li>All courses included in the Corporate Readiness programme</li>
            <li>Assessments and your personal skill dashboard</li>
            <li>Course completion certificates when requirements are met</li>
          </ul>
          <p className="mt-6 rounded-lg border border-slate-200 p-4 text-sm text-slate-600">Payments are not open yet. You can create your individual profile now; paid course access will become available when enrolment opens.</p>
          {user && !error && data && testPaymentsEnabled() && <Checkout />}
          <Link href={user ? '/student/setup' : '/register'} className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-3 font-medium text-white">{user ? 'Continue to my account' : 'Create an individual account'}</Link>
          <p className="mt-4 text-xs text-slate-500">Your price and access duration will be confirmed at checkout. Completing the programme supports workplace preparation; it does not guarantee employment.</p>
        </div>
      </div>
    </main>
  );
}
