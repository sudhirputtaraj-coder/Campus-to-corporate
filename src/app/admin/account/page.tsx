import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EmailForm from './email-form';

export default async function AdminAccountPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role,status').eq('user_id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') redirect('/login');

  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
    <div className="max-w-xl mx-auto">
      <Link href="/admin/dashboard" className="text-blue-700">Back to dashboard</Link>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold">Super Admin account</h1>
        <p className="mt-4 text-slate-600">Current sign-in email</p>
        <p className="font-medium break-all">{user.email}</p>
        {user.new_email && <p className="mt-3 text-amber-800 break-all">Pending email change: {user.new_email}. Check your email for confirmation instructions.</p>}
        <h2 className="mt-6 text-lg font-semibold">Change your email</h2>
        <p className="mt-2 text-slate-600">Use an address you control. Keep access to your current inbox until confirmation is complete. Your account and administrator permissions will stay the same.</p>
        <EmailForm />
      </section>
    </div>
  </main>;
}
