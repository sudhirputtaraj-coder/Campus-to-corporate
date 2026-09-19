import Link from 'next/link';
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
  const result = await searchParams;
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-xl rounded-xl border bg-white p-6">
    <Link href="/admin/dashboard" className="text-sm text-blue-700 underline">Back to dashboard</Link>
    <h1 className="mt-5 text-2xl font-bold text-slate-900">Individual programme settings</h1>
    <p className="mt-3 text-sm text-slate-600">Changes apply to future purchases. Existing purchases retain their agreed price and access period.</p>
    {result.saved && <p role="status" className="mt-4 text-green-700">Programme settings saved.</p>}
    {result.error && <p role="alert" className="mt-4 text-red-700">{result.error === 'invalid' ? 'Enter a positive price up to ₹10,00,000 and a duration from 1 to 120 months.' : 'Settings could not be saved. Please try again.'}</p>}
    {error || !data ? <p role="alert" className="mt-5 text-amber-800">Programme settings are unavailable. Complete the individual-student database setup before editing the offer.</p> :
      <form action={saveProgrammeSettings} className="mt-6 space-y-5">
        <div><label htmlFor="price" className="block text-sm font-medium">One-time price (INR)</label><input id="price" name="price" type="number" min="0.01" max="1000000" step="0.01" required defaultValue={(data.price_paise / 100).toFixed(2)} className="mt-2 w-full rounded-lg border border-slate-300 p-3" /></div>
        <div><label htmlFor="months" className="block text-sm font-medium">Access duration (months)</label><input id="months" name="months" type="number" min="1" max="120" step="1" required defaultValue={data.access_months} className="mt-2 w-full rounded-lg border border-slate-300 p-3" /></div>
        <button className="rounded-lg bg-slate-900 px-5 py-3 text-white">Save future purchase terms</button>
      </form>}
    <p className="mt-6 text-sm text-slate-500">Checkout remains disabled until a verified payment integration is connected.</p>
  </div></main>;
}
