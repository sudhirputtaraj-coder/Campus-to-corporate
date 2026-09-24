import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'TRAINER' || profile.status !== 'ACTIVE') redirect('/login');

  const { data: trainer, error: trainerError } = await supabase
    .from('trainers')
    .select('id,status')
    .eq('user_id', user.id)
    .single();

  if (trainerError || !trainer || trainer.status !== 'ACTIVE') return <main className="p-6"><p>Trainer access is not active or configured. Contact your platform administrator.</p><form action={logout}><button className="mt-4 rounded-lg p-3">Sign out</button></form></main>;

  const { data: assignments, error: assignmentError } = await supabase
    .from('trainer_batch_assignments')
    .select('*, batch:batches(*, department:departments(name))')
    .eq('trainer_id', trainer?.id || '')
    .eq('status', 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
            <span className="font-semibold text-slate-900">Trainer</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{profile?.full_name}</span>
            <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
              <Home className="w-4 h-4" />
            </Link>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Dashboard</h1>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">My Batches</h2>
          {assignmentError ? <p role="alert">Assignments could not be loaded. Please try again.</p> : !assignments || assignments.length === 0 ? (
            <p className="text-slate-500 text-sm">No batches assigned yet.</p>
          ) : (
            <ul className="space-y-3">
              {assignments.map((a: any) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3"
                >
                  <div>
                    <Link href={`/trainer/batches/${a.batch_id}`} className="inline-block rounded-lg p-3 font-medium text-slate-900">{a.batch?.name}</Link>
                    <p className="text-sm text-slate-500">
                      {a.batch?.department?.name || '—'} · {a.batch?.academic_year || '—'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Coming soon</h2>
          <p className="text-sm text-slate-500">
            Open an assigned batch above to review student learning progress. Attendance and manual evaluations are not part of this release.
          </p>
        </div>
      </main>
    </div>
  );
}
