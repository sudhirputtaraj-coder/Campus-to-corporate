import Link from 'next/link';
import { ProfessionalForm } from '@/components/professional-form';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveProgrammeSettings } from '@/lib/programme/actions';

export default async function ProgrammeSettings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, status').eq('user_id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') redirect('/login');
  const { data, error } = await supabase.from('programme_settings').select('price_paise, access_months').eq('id', 'corporate-readiness').single();
  const { data: individualStudents, error: studentListError } = await supabase.from('students').select('id,user_id,programme_free_access!inner(student_id)').eq('account_type','INDIVIDUAL').eq('status','ACTIVE').order('id').limit(1000);
  const { data: names } = individualStudents?.length ? await supabase.from('profiles').select('user_id,full_name,email').in('user_id', individualStudents.map(s=>s.user_id)).eq('role','STUDENT').eq('status','ACTIVE') : { data: [] };
  const studentsWithNames = (individualStudents||[]).flatMap(s=>{const p=names?.find(n=>n.user_id===s.user_id);return p?[{id:s.id,name:p.full_name,email:p.email}]:[];});
  const result = await searchParams;
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-xl rounded-xl border bg-white p-6">
    <Link href="/admin/dashboard" className="text-sm text-blue-700 underline">Back to dashboard</Link>
    <h1 className="mt-5 text-2xl font-bold text-slate-900">Individual programme settings</h1>
    <p className="mt-3 text-sm text-slate-600">Set the price to 0 to allow free enrolment. Changes apply to future enrolments; existing paid and free access keeps its agreed expiry date.</p>
    {result.saved && <p role="status" className="mt-4 text-green-700">Programme settings saved.</p>}
    {result.error && <p role="alert" className="mt-4 text-red-700">{result.error === 'invalid' ? 'Enter zero for free access, or a price up to ₹10,00,000 and a duration from 1 to 120 months.' : 'Settings could not be saved. Please try again.'}</p>}
    {error || !data ? <p role="alert" className="mt-5 text-amber-800">Programme settings are unavailable. Complete the individual-student database setup before editing the offer.</p> :
      <form action={saveProgrammeSettings} className="mt-6 space-y-5">
        <div><label htmlFor="price" className="block text-sm font-medium">One-time price (INR)</label><input id="price" name="price" type="number" min="0" max="1000000" step="0.01" required defaultValue={(data.price_paise / 100).toFixed(2)} className="mt-2 w-full rounded-lg border border-slate-300 p-3" /></div>
        <div><label htmlFor="months" className="block text-sm font-medium">Access duration (months)</label><input id="months" name="months" type="number" min="1" max="120" step="1" required defaultValue={data.access_months} className="mt-2 w-full rounded-lg border border-slate-300 p-3" /></div>
        <button className="rounded-lg bg-slate-900 px-5 py-3 text-white">Save future purchase terms</button>
      </form>}
    <details className="mt-6 rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Extend an individual student’s free access</summary><p className="mt-3 text-sm">For an existing free enrolment only. Add 1–12 months from the later of today or the current expiry. No payment is charged. This action is recorded in the audit log.</p><ProfessionalForm kind="extension">{studentListError&&<p role="alert">The free-enrolment student list could not be loaded.</p>}<label>Individual student<select name="student" required defaultValue=""><option value="">Select a student with free access</option>{studentsWithNames.map(s=><option key={s.id} value={s.id}>{s.name} · {s.email}</option>)}</select></label>{studentsWithNames.length===0&&<p>No active individual students with free access are available.</p>}<label>Additional months<input name="months" type="number" min={1} max={12} required defaultValue={1}/></label><label><input name="confirm" type="checkbox" required/>I confirm this free access extension.</label></ProfessionalForm></details>
    <p className="mt-6 text-sm text-slate-500">Free enrolment does not require Razorpay. Paid checkout remains subject to payment setup.</p>
  </div></main>;
}
