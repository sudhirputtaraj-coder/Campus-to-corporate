import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { completeIndividualProfile } from '@/lib/programme/actions';

export default async function StudentSetup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: student, error: studentError } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
  if (studentError) throw new Error('Unable to load your student profile. Please try again.');
  if (student) redirect('/student/dashboard');
  const { error } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Complete your student profile</h1>
        <p className="mt-3 text-slate-600">Your login is ready. Choose how you will join Campus-to-Corporate.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">We could not complete your profile. Confirm your email and try again, or contact the platform administrator for help.</p>}
        <section className="mt-6 rounded-xl border border-blue-200 p-5">
          <h2 className="font-semibold text-slate-900">Join independently</h2>
          <p className="mt-2 text-sm text-slate-600">For students from any college or without a college affiliation. Creating your profile is free. After setup, open the programme page to activate the current offer.</p>
          <form action={completeIndividualProfile} className="mt-4">
            <button className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">Create my individual student profile</button>
          </form>
          <Link href="/programme" className="mt-3 block text-sm text-blue-700 underline">View the Corporate Readiness programme</Link>
        </section>
        <section className="mt-5 rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Joining through your college?</h2>
          <p className="mt-2 text-sm text-slate-600">Ask your college administrator to link this email to your student record. Your college manages your learning access.</p>
        </section>
      </div>
    </main>
  );
}
