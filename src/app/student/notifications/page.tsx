import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PreferencesForm from './preferences-form';

export default async function NotificationsPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await client.from('profiles').select('role,status').eq('user_id', user.id).single();
  if (profile?.role !== 'STUDENT' || profile.status !== 'ACTIVE') redirect('/login');
  const { data: student } = await client.from('students').select('id').eq('user_id',user.id).eq('status','ACTIVE').maybeSingle();
  if (!student) redirect('/student/setup');
  const { data, error } = await client.from('student_whatsapp_preferences').select('phone,enabled,learning,scores,employability').eq('user_id',user.id).maybeSingle();
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl rounded-xl border bg-white p-5 sm:p-8">
    <Link href="/student/dashboard">Back to dashboard</Link>
    <h1 className="mt-5 text-2xl font-bold">WhatsApp progress updates</h1>
    <p className="mt-3">Available for individual and college students. Choose which updates you would like to receive.</p>
    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">Setup in progress: WhatsApp delivery and number verification are not available yet. Saving preferences does not activate messages.</p>
    <p className="mt-3 text-sm text-slate-600">Your number will be used for these updates only. Turning updates off removes the saved number. When delivery is activated, the selected messaging provider will process your number and selected updates.</p>
    {error ? <p role="alert" className="mt-5 text-red-700">Settings are unavailable. Platform support needs to complete the WhatsApp settings setup.</p> : <PreferencesForm initial={data} />}
  </div></main>;
}
