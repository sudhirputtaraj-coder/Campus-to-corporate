import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/auth/actions';
import { JoinAuthForm, AcceptInvitation } from './forms';

type Invitation = { id: string; college_name: string; register_number: string; department_name: string | null; batch_name: string | null };

export default async function JoinCollege() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  const [invitations, student, profile] = user ? await Promise.all([
    client.rpc('fn_my_college_invitations'),
    client.from('students').select('account_type,status').eq('user_id', user.id).maybeSingle(),
    client.from('profiles').select('role,status').eq('user_id', user.id).maybeSingle(),
  ]) : [null, null, null];
  const joined = student?.data?.account_type === 'COLLEGE';
  const staff = profile?.data && profile.data.role !== 'STUDENT';
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-2xl">
    <Link href="/" className="text-sm font-semibold text-slate-800">Campus-to-Corporate</Link>
    <h1 className="mt-8 text-3xl font-bold text-slate-900">Join your college</h1>
    <p className="mt-3 leading-7 text-slate-600">Your college administrator adds your email and register number. You create your own password, verify your email, and accept your college access here.</p>
    {!user ? <JoinAuthForm /> : <section className="mt-7 rounded-2xl border bg-white p-6 sm:p-8">
      <div className="mb-6 border-b pb-4"><p className="break-all text-sm text-slate-600">Signed in as <strong>{user.email}</strong></p><form action={logout}><button className="mt-2 text-sm text-blue-800 underline">Sign out / use a different email</button></form></div>
      {invitations?.error || student?.error || profile?.error ? <p role="alert">We could not check your college access. Please try again, or ask your administrator to confirm student onboarding is enabled.</p> : !user.email_confirmed_at ? <p role="alert">Verify your email before joining. Open the verification link in your inbox. To resend it, sign out and use “Resend verification email” here.</p> : staff ? <p>This is a staff account. Use your student email or ask the platform administrator for help.</p> : joined ? <><h2 className="text-xl font-semibold">{student?.data?.status === 'ACTIVE' ? 'Your college account is ready' : 'Your college access is not active'}</h2>{student?.data?.status === 'ACTIVE' ? <Link href="/student/dashboard" className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white">Open my dashboard</Link> : <p className="mt-3 text-slate-600">Ask your college administrator to restore access. Your learning history is retained.</p>}</> : (invitations?.data as Invitation[] | null)?.length ? <><h2 className="text-xl font-semibold">Your college invitation</h2><p className="mt-2 text-sm text-slate-600">Check these details before joining. Active courses assigned to your college will appear on your dashboard.</p>{(invitations!.data as Invitation[]).map(inv => <article key={inv.id} className="mt-5 rounded-xl border p-5"><h3 className="font-semibold">{inv.college_name}</h3><p className="mt-2 text-sm">Register number: {inv.register_number}</p><p className="mt-1 text-sm text-slate-600">{inv.department_name || 'Department to be assigned'} · {inv.batch_name || 'Batch to be assigned'}</p><AcceptInvitation id={inv.id} college={inv.college_name} /></article>)}</> : <><h2 className="text-xl font-semibold">No invitation for this email yet</h2><p className="mt-3 leading-7 text-slate-600">Ask your college administrator to open <strong>Students & Access</strong> and add <strong className="break-all">{user.email}</strong>. If they used another email, sign out and use that address. Once they have added you, refresh this page.</p><Link href="/join" className="mt-4 inline-block text-blue-800 underline">Check again</Link></>}
    </section>}
    <p className="mt-6 text-sm leading-6 text-slate-600">Already joined? Next time, choose <Link href="/login" className="text-blue-800 underline">College student on the sign-in page</Link> and use your email and chosen password.</p>
  </div></main>;
}
