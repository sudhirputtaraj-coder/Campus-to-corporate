import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin/require-admin';
import SetupForm from './setup-form';

export default async function CollegeSetup({ params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) redirect('/login');
  const { userId } = await params;
  if (!z.string().uuid().safeParse(userId).success) notFound();
  const { data: profile, error } = await auth.client.from('profiles').select('user_id,full_name,email,role,status').eq('user_id',userId).maybeSingle();
  if (error) throw new Error('Unable to load user. Please try again.');
  if (!profile) notFound();
  const [{ data: student, error: studentError }, { data: memberships, error: membershipError }] = await Promise.all([
    auth.client.from('students').select('account_type,register_number,college_id,colleges(name)').eq('user_id',userId).maybeSingle(),
    auth.client.from('user_college_memberships').select('status,colleges(name)').eq('user_id',userId).eq('role','COLLEGE_ADMIN'),
  ]);
  if (studentError || membershipError) throw new Error('Unable to load existing college access. Please try again.');
  // Page all active colleges so selection is not silently capped at 1,000 rows.
  const colleges: { id: string; name: string; code: string }[] = [];
  let unavailable = false;
  for (let start=0; ; start+=500) {
    const result = await auth.client.from('colleges').select('id,name,code').eq('status','ACTIVE').order('name').order('id').range(start,start+499);
    if (result.error) { unavailable=true; break; }
    colleges.push(...result.data);
    if (result.data.length<500) break;
  }
  const collegeName = (value: unknown) => (value as { name?: string } | null)?.name || 'College unavailable';
  return <main className="min-h-screen bg-slate-50 p-6"><div className="max-w-xl mx-auto rounded-xl border bg-white p-6">
    <Link href="/admin/users" className="text-blue-700">Back to users</Link>
    <h1 className="mt-5 text-2xl font-bold">Set up college access</h1>
    <p className="mt-3 font-medium">{profile.full_name}</p><p className="break-all text-slate-600">{profile.email}</p>
    <p className="mt-3 text-sm">Current role: {profile.role.replaceAll('_',' ')} · {profile.status}</p>
    {student && <p className="mt-2 text-sm">Student profile: {student.account_type === 'COLLEGE' ? `${collegeName(student.colleges)} · ${student.register_number}` : 'Individual student'}</p>}
    {memberships?.map((m,i)=><p key={i} className="mt-2 text-sm">Administrator: {collegeName(m.colleges)} · {m.status}</p>)}
    <p className="mt-4 text-slate-600">The user must have confirmed their email. After setup, they should sign out and choose the matching college sign-in option with their existing password.</p>
    {profile.status!=='ACTIVE' || !['STUDENT','COLLEGE_ADMIN'].includes(profile.role) ? <p className="mt-5">Only active student and college administrator accounts can use this setup.</p> :
      unavailable ? <p role="alert" className="mt-5">Unable to load colleges. Please reload.</p> : colleges.length ?
        <SetupForm userId={userId} colleges={colleges} currentRole={profile.role} collegeId={student?.college_id || ''} registerNumber={student?.register_number || ''} /> :
        <p className="mt-5">First <Link href="/admin/colleges" className="text-blue-700 underline">add and activate a college</Link>.</p>}
  </div></main>;
}
